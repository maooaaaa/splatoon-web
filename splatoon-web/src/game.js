import { GameMap } from './map.js';
import { Player, WEAPONS } from './player.js';
import { AIController } from './ai.js';
import { InkManager } from './ink.js';
import { ParticleSystem } from './particles.js';

const DUR = 180; // 3 minutes
const T1S = [{ x: 12, z: 10 }, { x: 8, z: 14 }, { x: 16, z: 14 }, { x: 12, z: 18 }];
const T2S = [{ x: 108, z: 70 }, { x: 104, z: 66 }, { x: 112, z: 66 }, { x: 108, z: 62 }];

export class Game {
    constructor(scene, audio) {
        this.scene = scene; this.audio = audio;
        this.map = new GameMap(scene);
        this.ink = new InkManager(scene);
        this.particles = new ParticleSystem(scene);
        this.players = []; this.ais = []; this.human = null;
        this.timer = DUR; this.running = false; this.finished = false;
        this.scoreTimer = 0; this.scores = { t1: 0, t2: 0 };
        this.killFeed = [];
        this.lastHitTime = 0;
        this.damageNumbers = [];
        
        // Reusable vectors for performance
        this._tempVec1 = new THREE.Vector3();
        this._tempVec2 = new THREE.Vector3();
        this._tempVec3 = new THREE.Vector3();
    }

    init() {
        this.map.build();
        for (let i = 0; i < 4; i++) {
            const h = i === 0;
            const p = new Player(this.scene, 1, h);
            p.setPos(T1S[i].x, 0, T1S[i].z);
            if (h) this.human = p; else this.ais.push(new AIController(p, this.map));
            this.players.push(p);
        }
        for (let i = 0; i < 4; i++) {
            const p = new Player(this.scene, 2, false);
            p.setPos(T2S[i].x, 0, T2S[i].z);
            p.yaw = Math.PI;
            this.ais.push(new AIController(p, this.map));
            this.players.push(p);
        }
    }

    start() { this.timer = DUR; this.running = true; this.finished = false; this.killFeed = []; this.damageNumbers = []; }

    _respawnPlayer(p) {
        const spawns = p.teamId === 1 ? T1S : T2S;
        const sp = spawns[Math.floor(Math.random() * spawns.length)];
        p.setPos(sp.x, 0, sp.z);
        if (p.teamId === 2) p.yaw = Math.PI;
        p.reset(sp.x, sp.z);
    }

    update(dt, move, look, shooting, squid, bomb, special) {
        if (!this.running || this.finished) return;
        this.timer -= dt;
        if (this.timer <= 0) { this.timer = 0; this.finish(); return; }

        // Human
        if (this.human) {
            const wasAlive = this.human.alive;
            // Update player state
            const action = this.human.update(dt, this.map, move, look, shooting, squid);

            // 1. Shooting
            if (action.shot) {
                const w = this.human.weapon;
                if (w.type === 'roller') {
                    // Roller splash (horizontal line of pellets)
                    const count = 5;
                    const origin = this.human.getShootOrigin();
                    const baseDir = this.human.getShootDir();
                    for (let i = 0; i < count; i++) {
                        const spreadDir = baseDir.clone();
                        spreadDir.x += (Math.random() - 0.5) * 0.5;
                        spreadDir.y += (Math.random() - 0.5) * 0.2;
                        spreadDir.z += (Math.random() - 0.5) * 0.5;
                        spreadDir.normalize();
                        this.ink.shoot(origin, spreadDir, 1,
                            w.speed * (0.8 + Math.random() * 0.4), w.paintRad, w.projSize, w.damage);
                    }
                    this.audio.playShoot(1); // Different sound for roller?
                } else if (w.type === 'charger') {
                    // Charger shot (fast, piercing?)
                    this.ink.shoot(this.human.getShootOrigin(), this.human.getShootDir(), 1,
                        w.chargeMaxSpeed * this.human.chargeLevel,
                        w.paintRad, w.projSize, w.chargeMaxDmg * this.human.chargeLevel);
                    this.audio.playShoot(1);
                } else {
                    // Shooter
                    this.ink.shoot(this.human.getShootOrigin(), this.human.getShootDir(), 1,
                        w.speed + Math.random() * 5, w.paintRad, w.projSize, w.damage);
                    this.audio.playShoot(1);
                }
            }

            // 2. Melee (Roller swing)
            if (action.melee) {
                // Check melee hit box
                this._checkMelee(this.human);
            }

            // 3. Bomb Throw (E)
            if (bomb) {
                const b = this.human.throwBomb();
                if (b) {
                    this.ink.throwBomb(b.origin, b.dir, b.teamId);
                    // Play throw sound
                }
            }

            // 4. Special (Q)
            if (special) {
                if (this.human.activateSpecial()) {
                    // Spawn aura
                    this.particles.spawnSpecialAura(this.human);
                    // Play special sound
                }
            }

            // Human Special Passive Effect (Speed up + Ink Saver)
            if (this.human.specialActive) {
                this.human.specialTimer -= dt;
                if (this.human.specialTimer <= 0) this.human.specialActive = false;
                else {
                    this.human.ink = this.human.maxInk; // Infinite ink!
                    this.particles.spawnSpecialAura(this.human); // Loop aura
                }
            }

            if (!wasAlive && this.human.alive) this._respawnPlayer(this.human);
        }

        // AI Logic
        for (const ai of this.ais) {
            const wasAlive = ai.p.alive;
            const cmd = ai.update(dt, this.players);
            const action = ai.p.update(dt, this.map, cmd.move, cmd.look, cmd.shooting, cmd.squid);

            if (action.shot) {
                const w = ai.p.weapon;
                // Simplified AI shooting
                if (w.type === 'roller') {
                    const count = 3;
                    for (let i = 0; i < count; i++) {
                        this.ink.shoot(ai.p.getShootOrigin(), ai.p.getShootDir(), ai.p.teamId,
                            w.speed, w.paintRad, w.projSize, w.damage);
                    }
                } else {
                    this.ink.shoot(ai.p.getShootOrigin(), ai.p.getShootDir(), ai.p.teamId,
                        w.speed + Math.random() * 5, w.paintRad, w.projSize, w.damage);
                }
            }

            if (cmd.bomb) { // AI throws bomb?
                const b = ai.p.throwBomb();
                if (b) this.ink.throwBomb(b.origin, b.dir, b.teamId);
            }

            if (!wasAlive && ai.p.alive) this._respawnPlayer(ai.p);
        }

        // Projectiles + hit detection
        this.ink.update(dt, this.map);

        // Use index-based iteration instead of spread copy
        for (let i = this.ink.list.length - 1; i >= 0; i--) {
            const pr = this.ink.list[i];
            if (!pr.alive) {
                // If it was a bomb that exploded/died
                if (pr.isBomb && pr.hitPos) {
                    this.particles.spawnBombExplosion(pr.hitPos, pr.tid);
                    this.audio.playSplat();
                    // Bomb splash damage
                    this._checkExplosion(pr.hitPos, pr.tid, 120, 3.0);
                } else if (pr.hitPos) {
                    this.particles.spawnLandingSplash(pr.hitPos, pr.tid, 4);
                    this.audio.playSplat();
                }
                continue;
            }

            // Check direct hits for Projectiles
            if (!pr.isBomb) {
                for (const p of this.players) {
                    if (!p.alive || p.teamId === pr.tid) continue;
                    // Projectile collision using reusable vector
                    this._tempVec1.set(0, 1, 0).add(p.pos);
                    const distSq = pr.mesh.position.distanceToSquared(this._tempVec1);
                    const hitRadSq = (p.radius + 0.5) * (p.radius + 0.5);
                    if (distSq < hitRadSq) {
                        const killed = p.takeDamage(pr.damage, pr.tid);
                        this._handleHit(pr.tid, p, pr.damage, killed);
                        this.particles.spawnSplash(pr.mesh.position, pr.tid, 5);
                        pr.destroy();
                        break;
                    }
                }
            }
        }

        this.particles.update(dt);
        
        // Flush batched texture updates
        this.map.flushPaint();

        // Kill feed cleanup
        const now = Date.now();
        this.killFeed = this.killFeed.filter(k => now - k.time < 5000);
        this.damageNumbers = this.damageNumbers.filter(d => now - d.time < 1200);

        this.scoreTimer -= dt;
        if (this.scoreTimer <= 0) { this.scores = this.map.getScores(); this.scoreTimer = 0.5; }
    }

    _checkMelee(attacker) {
        const w = attacker.weapon;
        const origin = attacker.pos;
        const fwd = attacker.getForward();

        for (const p of this.players) {
            if (!p.alive || p.teamId === attacker.teamId) continue;
            this._tempVec2.copy(p.pos).sub(origin);
            const dist = this._tempVec2.length();
            if (dist < w.meleeRange) {
                this._tempVec2.normalize();
                const angle = fwd.angleTo(this._tempVec2);
                if (angle < w.meleeArc / 2) {
                    const killed = p.takeDamage(w.meleeDamage, attacker.teamId);
                    this._handleHit(attacker.teamId, p, w.meleeDamage, killed);
                    // Push back?
                    this._tempVec2.multiplyScalar(10);
                    p.vel.add(this._tempVec2);
                }
            }
        }
    }

    _checkExplosion(pos, tid, maxDmg, radius) {
        for (const p of this.players) {
            if (!p.alive || p.teamId === tid) continue;
            const dist = p.pos.distanceTo(pos);
            if (dist < radius) {
                const dmg = maxDmg * (1 - dist / radius);
                const killed = p.takeDamage(dmg, tid);
                this._handleHit(tid, p, dmg, killed);
            }
        }
    }

    _handleHit(attackerTid, victim, damage, killed) {
        if (attackerTid === 1 && this.human) {
            this.lastHitTime = Date.now();
            this.damageNumbers.push({
                x: victim.pos.x, y: victim.pos.y + 2.5, z: victim.pos.z,
                dmg: Math.round(damage), time: Date.now(), killed: killed
            });
        }
        if (killed) {
            this.killFeed.push({ attacker: attackerTid, victim: victim.teamId, time: Date.now() });
            this._addScore(attackerTid, 1); // Kill score?
            this._tempVec3.set(0, 1, 0).add(victim.pos);
            this.particles.spawnKillEffect(this._tempVec3, attackerTid);
            this.audio.playSplat(); // Kill sound
        }
    }

    _addScore(tid, pts) {
        // Maybe track kills specifically?
        const team = this.players.filter(p => p.teamId === tid);
        // Distribute special charge?
    }

    finish() { this.running = false; this.finished = true; this.scores = this.map.getScores(); this.audio.playWhistle(); }
}
