import * as THREE from 'three';
import { TEAM_HEX } from './map.js';

// Cached materials and geometries for performance
const MATERIAL_CACHE = new Map();
const GEOMETRY_CACHE = new Map();

function getCachedMaterial(tid, type = 'basic') {
    const c = TEAM_HEX[tid] || 0xffffff;
    const key = `${tid}_${type}`;
    if (!MATERIAL_CACHE.has(key)) {
        if (type === 'basic') {
            MATERIAL_CACHE.set(key, new THREE.MeshBasicMaterial({ color: c }));
        } else if (type === 'flash') {
            MATERIAL_CACHE.set(key, new THREE.MeshBasicMaterial({ 
                color: 0xffffff, transparent: true, opacity: 0.8 
            }));
        } else if (type === 'aura') {
            MATERIAL_CACHE.set(key, new THREE.MeshBasicMaterial({ 
                color: c, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending 
            }));
        } else if (type === 'ring') {
            MATERIAL_CACHE.set(key, new THREE.MeshBasicMaterial({ 
                color: c, transparent: true, opacity: 0.8, side: THREE.DoubleSide 
            }));
        } else if (type === 'pillar') {
            MATERIAL_CACHE.set(key, new THREE.MeshBasicMaterial({ 
                color: c, transparent: true, opacity: 0.6, side: THREE.DoubleSide, 
                blending: THREE.AdditiveBlending 
            }));
        }
    }
    return MATERIAL_CACHE.get(key);
}

function getCachedGeometry(type, ...params) {
    const key = `${type}_${params.join('_')}`;
    if (!GEOMETRY_CACHE.has(key)) {
        if (type === 'box') {
            GEOMETRY_CACHE.set(key, new THREE.BoxGeometry(1, 1, 1));
        } else if (type === 'sphere') {
            GEOMETRY_CACHE.set(key, new THREE.SphereGeometry(...params));
        } else if (type === 'ring') {
            const geo = new THREE.RingGeometry(...params);
            geo.rotateX(-Math.PI / 2);
            GEOMETRY_CACHE.set(key, geo);
        } else if (type === 'cylinder') {
            GEOMETRY_CACHE.set(key, new THREE.CylinderGeometry(...params));
        }
    }
    return GEOMETRY_CACHE.get(key);
}

export class ParticleSystem {
    constructor(scene) {
        this.scene = scene;
        this.list = [];
        this.maxParticles = 200; // Limit particle count
        // Use cached box geometry
        this.boxGeo = getCachedGeometry('box');
    }

    // Standard hit splash - REDUCED COUNT
    spawnSplash(pos, tid, count = 5) {
        this._enforceParticleLimit(count);
        const mat = getCachedMaterial(tid, 'basic');
        for (let i = 0; i < count; i++) {
            const size = 0.1 + Math.random() * 0.15; // Slightly smaller
            const mesh = new THREE.Mesh(this.boxGeo, mat);
            mesh.scale.setScalar(size);
            mesh.position.copy(pos);
            // Random direction
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 8,
                4 + Math.random() * 6,
                (Math.random() - 0.5) * 8
            );
            this.scene.add(mesh);
            this.list.push({ mesh, vel, age: 0, life: 0.4 + Math.random() * 0.4, type: 'splash' });
        }
    }

    // Landing splash (flat) - REDUCED COUNT
    spawnLandingSplash(pos, tid, count = 4) {
        this._enforceParticleLimit(count);
        const mat = getCachedMaterial(tid, 'basic');
        for (let i = 0; i < count; i++) {
            const size = 0.1 + Math.random() * 0.1;
            const mesh = new THREE.Mesh(this.boxGeo, mat);
            mesh.scale.setScalar(size);
            mesh.position.copy(pos);
            mesh.position.y += 0.1;
            const angle = Math.random() * Math.PI * 2;
            const spd = 2 + Math.random() * 3;
            const vel = new THREE.Vector3(Math.cos(angle) * spd, 3 + Math.random() * 3, Math.sin(angle) * spd);
            this.scene.add(mesh);
            this.list.push({ mesh, vel, age: 0, life: 0.3 + Math.random() * 0.3, type: 'land' });
        }
    }

    // KILL EFFECT - Big Explosion
    spawnKillEffect(pos, tid) {
        this._enforceParticleLimit(13);
        const mat = getCachedMaterial(tid, 'basic');
        const flashMat = getCachedMaterial(0, 'flash');

        // Initial flash sphere
        const flash = new THREE.Mesh(getCachedGeometry('sphere', 1.5, 8, 8), flashMat);
        flash.position.copy(pos);
        this.scene.add(flash);
        this.list.push({ mesh: flash, vel: new THREE.Vector3(), age: 0, life: 0.3, type: 'flash', scaleSpd: 8 });

        // Chunks - REDUCED
        for (let i = 0; i < 12; i++) {
            const size = 0.2 + Math.random() * 0.3;
            const mesh = new THREE.Mesh(this.boxGeo, mat);
            mesh.scale.setScalar(size);
            mesh.position.copy(pos);
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 12,
                5 + Math.random() * 8,
                (Math.random() - 0.5) * 12
            );
            this.scene.add(mesh);
            this.list.push({ mesh, vel, age: 0, life: 0.8 + Math.random() * 0.4, type: 'chunk' });
        }
    }

    // BOMB EXPLOSION
    spawnBombExplosion(pos, tid) {
        this._enforceParticleLimit(2);
        // Shockwave ring
        const ringGeo = getCachedGeometry('ring', 0.5, 1.0, 16);
        const ringMat = getCachedMaterial(tid, 'ring');
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(pos); ring.position.y += 0.2;
        this.scene.add(ring);
        this.list.push({ mesh: ring, vel: new THREE.Vector3(), age: 0, life: 0.5, type: 'shockwave' });

        // Upward pillar
        const cylinder = new THREE.Mesh(
            getCachedGeometry('cylinder', 1, 2, 4, 8, 1, true),
            getCachedMaterial(tid, 'pillar')
        );
        cylinder.position.copy(pos); cylinder.position.y += 2;
        this.scene.add(cylinder);
        this.list.push({ mesh: cylinder, vel: new THREE.Vector3(0, 2, 0), age: 0, life: 0.4, type: 'pillar', scaleSpd: 2 });

        // Debris
        this.spawnKillEffect(pos, tid);
    }

    // SPECIAL AURA (continuous spawn)
    spawnSpecialAura(player) {
        this._enforceParticleLimit(1);
        // Reduced frequency check should be done by caller, but here we just spawn one
        const mat = getCachedMaterial(player.teamId, 'aura');
        const size = 0.15;
        const mesh = new THREE.Mesh(this.boxGeo, mat);
        mesh.scale.setScalar(size);

        const offset = new THREE.Vector3((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 1.2);
        mesh.position.copy(player.pos).add(offset);
        const vel = new THREE.Vector3(0, 2 + Math.random() * 2, 0);

        this.scene.add(mesh);
        this.list.push({ mesh, vel, age: 0, life: 0.8, type: 'aura' });
    }

    _enforceParticleLimit(newCount) {
        // Remove oldest particles if we exceed limit
        while (this.list.length + newCount > this.maxParticles) {
            const p = this.list.shift();
            if (p && p.mesh) {
                this.scene.remove(p.mesh);
            }
        }
    }

    update(dt) {
        // Limit updates if too many?
        for (let i = this.list.length - 1; i >= 0; i--) {
            const p = this.list[i];
            p.age += dt;
            if (p.age >= p.life) {
                this.scene.remove(p.mesh);
                // Don't dispose shared geometries/materials
                this.list.splice(i, 1);
                continue;
            }

            if (p.type === 'shockwave') {
                const s = 1 + (p.age / p.life) * 8;
                p.mesh.scale.set(s, s, s);
                p.mesh.material.opacity = 0.8 * (1 - p.age / p.life);
                continue;
            }
            if (p.type === 'pillar') {
                p.mesh.position.y += 5 * dt;
                const s = 1 + p.age * 2;
                p.mesh.scale.set(s, 1, s);
                p.mesh.material.opacity = 0.6 * (1 - p.age / p.life);
                continue;
            }
            if (p.type === 'flash') {
                const s = 1 + p.age * p.scaleSpd;
                p.mesh.scale.set(s, s, s);
                p.mesh.material.opacity = 0.8 * (1 - p.age / p.life);
                continue;
            }
            // Physics particles (splash, chunk, land)
            p.vel.y -= 25 * dt; // Gravity
            p.mesh.position.addScaledVector(p.vel, dt);

            // Shrink
            const scale = (1 - (p.age / p.life)) * p.mesh.scale.x; // Crude scaling
            // p.mesh.scale.setScalar(Math.max(0.01, scale)); 
            // Re-assigning scale every frame for boxGeo creates overhead?
            // Just scale relative to start?
            // Simply linear shrink:
            const s = Math.max(0.01, 1 - p.age / p.life);
            if (p.type === 'chunk') p.mesh.scale.setScalar(s * 0.3); // approximate original size
            else p.mesh.scale.setScalar(s * 0.15);

            // Bounce off floor
            if (p.mesh.position.y < 0.1 && p.vel.y < 0) {
                p.vel.y *= -0.6;
                p.vel.x *= 0.8;
                p.vel.z *= 0.8;
                p.mesh.position.y = 0.1;
            }
        }
    }

    reset() {
        this.list.forEach(p => {
            this.scene.remove(p.mesh);
            // Don't dispose shared geometries/materials
        });
        this.list = [];
    }
}
