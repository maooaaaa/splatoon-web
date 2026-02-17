import * as THREE from 'three';
import { TEAM_HEX } from './map.js';

// Weapon definitions - rebalanced
const WEAPONS = [
    {
        name: 'シューター', type: 'shooter', shootRate: 0.09, inkCost: 1.8,
        speed: 55, spread: 0.025, paintRad: 2.0, damage: 18, projSize: 0.22, projCount: 1,
        desc: 'バランス型'
    },
    {
        name: 'ローラー', type: 'roller', shootRate: 0.45, inkCost: 5.0,
        speed: 35, spread: 0.12, paintRad: 4.0, damage: 60, projSize: 0.5, projCount: 3,
        meleeRange: 4.0, meleeDamage: 80, meleeArc: 1.2,
        desc: '近接+塗り',
    },
    {
        name: 'チャージャー', type: 'charger', shootRate: 0.08, inkCost: 3.0,
        speed: 100, spread: 0.003, paintRad: 1.8, damage: 30, projSize: 0.12, projCount: 1,
        chargeTime: 1.0, chargeMaxDmg: 150, chargeMaxSpeed: 150,
        desc: '溜め撃ち一撃',
    },
];

export { WEAPONS };

export class Player {
    constructor(scene, teamId, isHuman = false) {
        this.scene = scene; this.teamId = teamId; this.isHuman = isHuman;
        this.pos = new THREE.Vector3(); this.vel = new THREE.Vector3();
        this.yaw = 0; this.pitch = 0;
        this.speed = 18; this.jumpF = 14; this.grav = -35;
        this.onGround = true; this.groundY = 0;
        this.ink = 100; this.maxInk = 100;
        this.hp = 100; this.maxHp = 100;
        this.isSquid = false; this.shootCD = 0;
        this.alive = true; this.respawn = 0; this.radius = 0.8;
        this.damageFlash = 0; this.kills = 0; this.deaths = 0;
        // Weapon system
        this.weapons = WEAPONS;
        this.weaponIdx = 0;
        // Charger charge
        this.charging = false;
        this.chargeLevel = 0;
        // Roller
        this.rollerTrail = false;
        // Bomb
        this.bombCD = 0;
        this.bombInkCost = 25;
        // Special
        this.special = 0;
        this.maxSpecial = 100;
        this.specialActive = false;
        this.specialTimer = 0;
        // Wall climbing
        this.wallClimbing = false;
        this.wallClimbTimer = 0;
        // Animation
        this.walkBob = 0;
        
        // Reusable vectors for performance
        this._fwd = new THREE.Vector3();
        this._rgt = new THREE.Vector3();
        this._dir = new THREE.Vector3();
        this._ahead = new THREE.Vector3();
        this._sideL = new THREE.Vector3();
        this._sideR = new THREE.Vector3();
        this._offset = new THREE.Vector3();
        
        this._build();
    }

    get weapon() { return this.weapons[this.weaponIdx]; }

    switchWeapon(idx) {
        if (idx >= 0 && idx < this.weapons.length && idx !== this.weaponIdx) {
            this.weaponIdx = idx;
            this.charging = false;
            this.chargeLevel = 0;
        }
    }

    _build() {
        const c = TEAM_HEX[this.teamId];
        this.group = new THREE.Group();

        // Body
        const bMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.4, metalness: 0.1 });
        this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, 0.8, 4, 8), bMat);
        this.body.position.y = 1.2; this.body.castShadow = true; this.group.add(this.body);

        // Head
        this.head = new THREE.Mesh(
            new THREE.SphereGeometry(0.45, 8, 8),
            new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 })
        );
        this.head.position.y = 2.0; this.head.castShadow = true; this.group.add(this.head);

        // Eyes
        const eMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.3 });
        const pMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        this.lEye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), eMat);
        this.lEye.position.set(-0.22, 2.05, -0.35); this.group.add(this.lEye);
        const lPupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), pMat);
        lPupil.position.z = -0.1; this.lEye.add(lPupil);
        this.rEye = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), eMat.clone());
        this.rEye.position.set(0.22, 2.05, -0.35); this.group.add(this.rEye);
        const rPupil = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), pMat.clone());
        rPupil.position.z = -0.1; this.rEye.add(rPupil);

        // Ink tank
        const tankMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.2, transparent: true, opacity: 0.6 });
        this.tank = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 8), tankMat);
        this.tank.position.set(0, 1.3, 0.45); this.group.add(this.tank);

        // Arms
        const armMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 });
        this.lArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 3, 6), armMat);
        this.lArm.position.set(-0.6, 1.1, -0.1); this.group.add(this.lArm);
        this.rArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.5, 3, 6), armMat.clone());
        this.rArm.position.set(0.6, 1.1, -0.1); this.group.add(this.rArm);

        // Legs
        const legMat = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.7 });
        this.lLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.4, 3, 6), legMat);
        this.lLeg.position.set(-0.2, 0.35, 0); this.group.add(this.lLeg);
        this.rLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.4, 3, 6), legMat.clone());
        this.rLeg.position.set(0.2, 0.35, 0); this.group.add(this.rLeg);

        // Weapon mesh
        const wGroup = new THREE.Group();
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 8),
            new THREE.MeshStandardMaterial({ color: 0x333344, roughness: 0.3, metalness: 0.6 }));
        barrel.rotation.x = Math.PI / 2; wGroup.add(barrel);
        const grip = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.15),
            new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.5 }));
        grip.position.set(0, -0.12, 0.15); wGroup.add(grip);
        const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6),
            new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.5 }));
        muzzle.position.z = -0.38; wGroup.add(muzzle);
        wGroup.position.set(0.5, 1.0, -0.35);
        this.weaponMesh = wGroup; this.group.add(this.weaponMesh);

        // Band
        const bandMat = new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 0.3 });
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.05, 4, 16), bandMat);
        band.position.y = 2.15; band.rotation.x = Math.PI / 2; this.group.add(band);

        // Squid
        const sg = new THREE.SphereGeometry(0.5, 10, 8); sg.scale(1.3, 0.4, 1.3);
        this.squidMesh = new THREE.Mesh(sg, new THREE.MeshStandardMaterial({
            color: c, roughness: 0.2, transparent: true, opacity: 0.6, emissive: c, emissiveIntensity: 0.2
        }));
        this.squidMesh.position.y = 0.2; this.squidMesh.visible = false; this.group.add(this.squidMesh);

        this._humanParts = [this.body, this.head, this.lEye, this.rEye, this.tank,
        this.lArm, this.rArm, this.lLeg, this.rLeg, this.weaponMesh, band];

        this.scene.add(this.group);
    }

    setPos(x, y, z) { this.pos.set(x, y, z); this.group.position.copy(this.pos); }
    getForward() { 
        this._fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        return this._fwd;
    }
    getShootOrigin() { 
        const f = this.getForward(); 
        this._offset.set(this.pos.x + f.x * 0.8, this.pos.y + 1.2, this.pos.z + f.z * 0.8);
        return this._offset;
    }
    getShootDir() {
        const w = this.weapon;
        const sp = w.type === 'charger' ? w.spread * (1 - this.chargeLevel * 0.8) : w.spread;
        const spreadX = (Math.random() - 0.5) * sp;
        const spreadZ = (Math.random() - 0.5) * sp;
        this._dir.set(
            -Math.sin(this.yaw) + spreadX,
            Math.sin(this.pitch), // FULL pitch - no dampening
            -Math.cos(this.yaw) + spreadZ
        ).normalize();
        return this._dir;
    }

    takeDamage(amount, attackerTeamId) {
        if (!this.alive) return false;
        this.hp -= amount;
        this.damageFlash = 0.2;
        if (this.hp <= 0) {
            this.hp = 0; this.alive = false; this.respawn = 3;
            this.deaths++; this.group.visible = false;
            this._squidOut();
            return true;
        }
        return false;
    }

    update(dt, map, move, look, shooting, wantSquid) {
        this.damageFlash = Math.max(0, this.damageFlash - dt);
        this.bombCD = Math.max(0, this.bombCD - dt);

        if (!this.alive) {
            this.respawn -= dt;
            if (this.respawn <= 0) {
                this.alive = true; this.hp = this.maxHp; this.ink = this.maxInk;
                this.group.visible = true;
            }
            return { shot: false, melee: false };
        }

        // Look - FULL pitch and yaw
        this.yaw += look.yaw;
        this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch + look.pitch));

        const onOwn = map.getTeamAt(this.pos.x, this.pos.z) === this.teamId;

        // Squid: ONLY with Shift, ONLY on ground, ONLY on own ink
        if (wantSquid && onOwn && this.onGround) {
            if (!this.isSquid) this._squidIn();
        } else if (this.isSquid) {
            this._squidOut();
        }

        const spd = this.isSquid ? this.speed * 1.6 : this.speed;
        this._fwd.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        this._rgt.set(Math.cos(this.yaw), 0, -Math.sin(this.yaw));
        this._dir.set(0, 0, 0).addScaledVector(this._fwd, move.z).addScaledVector(this._rgt, move.x);
        if (this._dir.length() > 0) this._dir.normalize();

        this.vel.x = this._dir.x * spd; this.vel.z = this._dir.z * spd;

        // Wall climbing
        this.wallClimbing = false;
        if (!this.onGround && move.jump) {
            this._ahead.set(this.pos.x + this._fwd.x * 1.5, 0, this.pos.z + this._fwd.z * 1.5);
            this._sideL.set(this.pos.x + this._rgt.x * 1.5, 0, this.pos.z + this._rgt.z * 1.5);
            this._sideR.set(this.pos.x - this._rgt.x * 1.5, 0, this.pos.z - this._rgt.z * 1.5);
            const touchingWall = !map.isWalkable(this._ahead.x, this._ahead.z) ||
                !map.isWalkable(this._sideL.x, this._sideL.z) || !map.isWalkable(this._sideR.x, this._sideR.z);
            if (touchingWall && this.wallClimbTimer < 1.0) {
                this.wallClimbing = true; this.wallClimbTimer += dt; this.vel.y = 12;
            }
        }

        if (this.onGround) {
            this.wallClimbTimer = 0;
            if (move.jump) { this.vel.y = this.jumpF; this.onGround = false; }
        }
        if (!this.wallClimbing) this.vel.y += this.grav * dt;

        // Move with collision
        const steps = 3, subDt = dt / steps;
        for (let s = 0; s < steps; s++) {
            this.pos.x += this.vel.x * subDt;
            this.pos.z += this.vel.z * subDt;
            for (let pass = 0; pass < 2; pass++) {
                const c = map.collideWalls(this.pos.x, this.pos.z, this.radius);
                this.pos.x = c.x; this.pos.z = c.z;
            }
        }
        this.pos.y += this.vel.y * dt;

        // Ground + platform
        this.groundY = map.getGroundY(this.pos.x, this.pos.z, this.pos.y, this.vel.y);
        if (this.pos.y <= this.groundY) {
            this.pos.y = this.groundY; this.vel.y = 0; this.onGround = true;
        } else if (this.vel.y <= 0 && this.pos.y - this.groundY < 0.4) {
            this.pos.y = this.groundY; this.vel.y = 0; this.onGround = true;
        } else {
            this.onGround = false;
        }
        this.pos.x = Math.max(2, Math.min(map.width - 2, this.pos.x));
        this.pos.z = Math.max(2, Math.min(map.height - 2, this.pos.z));

        // Ink regen
        if (this.isSquid && onOwn && this.onGround) {
            this.ink = Math.min(this.maxInk, this.ink + 40 * dt);
        } else if (!shooting) {
            this.ink = Math.min(this.maxInk, this.ink + 12 * dt);
        }

        // HP regen when squid on own ink
        if (this.isSquid && onOwn && this.onGround) {
            this.hp = Math.min(this.maxHp, this.hp + 15 * dt);
        }

        // Paint while walking
        if (dir.length() > 0 && !this.isSquid && this.onGround) {
            map.paintAt(this.pos.x, this.pos.z, this.teamId, 0.6);
        }

        // Special gauge charge from painting
        if (this.onGround && dir.length() > 0 && !this.isSquid) {
            this.special = Math.min(this.maxSpecial, this.special + 3 * dt);
        }

        // Weapon firing
        const w = this.weapon;
        this.shootCD -= dt;
        let didShoot = false;
        let didMelee = false;

        if (w.type === 'charger') {
            // Charger: hold to charge, release to fire
            if (shooting && !this.isSquid) {
                this.charging = true;
                this.chargeLevel = Math.min(1.0, this.chargeLevel + dt / w.chargeTime);
            } else if (this.charging) {
                // Release! Fire with charge level
                if (this.chargeLevel > 0.15 && this.ink >= w.inkCost * this.chargeLevel * 3) {
                    this.ink -= w.inkCost * this.chargeLevel * 3;
                    didShoot = true;
                }
                this.charging = false;
                this.chargeLevel = 0;
            }
        } else if (w.type === 'roller') {
            // Roller: click to melee swing
            if (shooting && !this.isSquid && this.shootCD <= 0 && this.ink >= w.inkCost) {
                this.ink -= w.inkCost;
                this.shootCD = w.shootRate;
                didMelee = true;
                didShoot = true; // Also fires paint projectiles
            }
            // Rollers paint ground while moving
            if (dir.length() > 0 && !this.isSquid && this.onGround) {
                map.paintAt(this.pos.x, this.pos.z, this.teamId, 2.5);
            }
        } else {
            // Shooter: auto-fire
            if (shooting && !this.isSquid && this.shootCD <= 0 && this.ink >= w.inkCost) {
                this.ink -= w.inkCost;
                this.shootCD = w.shootRate;
                didShoot = true;
            }
        }

        // Animations
        this.group.position.copy(this.pos);
        this.group.rotation.y = this.yaw;
        if (this._dir.length() > 0 && !this.isSquid) {
            this.walkBob += dt * 12;
            this.body.position.y = 1.2 + Math.sin(this.walkBob) * 0.05;
            if (this.lLeg && this.rLeg) {
                this.lLeg.rotation.x = Math.sin(this.walkBob) * 0.4;
                this.rLeg.rotation.x = -Math.sin(this.walkBob) * 0.4;
            }
            if (this.lArm && this.rArm) {
                this.lArm.rotation.x = -Math.sin(this.walkBob) * 0.3;
                this.rArm.rotation.x = Math.sin(this.walkBob) * 0.3;
            }
        }

        return { shot: didShoot, melee: didMelee };
    }

    throwBomb() {
        if (this.bombCD > 0 || this.ink < this.bombInkCost || !this.alive || this.isSquid) return null;
        this.ink -= this.bombInkCost;
        this.bombCD = 2.0;
        const origin = this.getShootOrigin();
        const dir = this.getShootDir();
        dir.y += 0.4; dir.normalize();
        return { origin, dir, teamId: this.teamId };
    }

    activateSpecial() {
        if (this.special < this.maxSpecial || this.specialActive || !this.alive) return false;
        this.special = 0;
        this.specialActive = true;
        this.specialTimer = 6.0;
        return true;
    }

    _squidIn() {
        this.isSquid = true;
        this._humanParts.forEach(p => p.visible = false);
        this.squidMesh.visible = true;
    }
    _squidOut() {
        this.isSquid = false;
        this._humanParts.forEach(p => p.visible = true);
        this.squidMesh.visible = false;
    }

    reset(x, z) {
        this.alive = true; this.hp = this.maxHp; this.ink = this.maxInk;
        this.isSquid = false; this.vel.set(0, 0, 0);
        this.yaw = 0; this.pitch = 0; this.onGround = true; this.damageFlash = 0;
        this.kills = 0; this.deaths = 0; this.weaponIdx = 0;
        this.charging = false; this.chargeLevel = 0;
        this.bombCD = 0; this.special = 0; this.specialActive = false; this.specialTimer = 0;
        this.wallClimbing = false; this.wallClimbTimer = 0; this.walkBob = 0;
        this._squidOut(); this.group.visible = true;
        this.setPos(x, 0, z);
    }
}
