import * as THREE from 'three';
import { TEAM_HEX } from './map.js';

// Cached geometries and materials for performance
const GEOMETRY_CACHE = new Map();
const MATERIAL_CACHE = new Map();

function getCachedGeometry(type, size) {
    const key = `${type}_${size.toFixed(3)}`;
    if (!GEOMETRY_CACHE.has(key)) {
        if (type === 'sphere') {
            GEOMETRY_CACHE.set(key, new THREE.SphereGeometry(size, 8, 8));
        } else if (type === 'tetrahedron') {
            GEOMETRY_CACHE.set(key, new THREE.TetrahedronGeometry(size));
        }
    }
    return GEOMETRY_CACHE.get(key);
}

function getCachedMaterial(tid, type = 'standard') {
    const c = TEAM_HEX[tid] || 0xffffff;
    const key = `${tid}_${type}`;
    if (!MATERIAL_CACHE.has(key)) {
        if (type === 'standard') {
            MATERIAL_CACHE.set(key, new THREE.MeshStandardMaterial({ 
                color: c, emissive: c, emissiveIntensity: 0.5, roughness: 0.2 
            }));
        } else if (type === 'bomb') {
            MATERIAL_CACHE.set(key, new THREE.MeshStandardMaterial({ 
                color: c, emissive: c, emissiveIntensity: 0.8, roughness: 0.1 
            }));
        }
    }
    return MATERIAL_CACHE.get(key);
}

export class InkBase {
    constructor(scene, pos, tid, damage, paintRad, isBomb = false) {
        this.scene = scene; this.tid = tid; this.damage = damage;
        this.paintRad = paintRad; this.isBomb = isBomb;
        this.alive = true; this.age = 0; this.hitPos = null;
        this.mesh = null; this.vel = new THREE.Vector3();
    }
    update(dt, map) { }
    destroy() {
        if (this.mesh) { 
            this.scene.remove(this.mesh); 
            // Don't dispose shared geometry/material
        }
        this.alive = false;
    }
}

export class InkProjectile extends InkBase {
    constructor(scene, pos, dir, tid, spd, paintRad, projSize, damage) {
        super(scene, pos, tid, damage, paintRad);
        // Use cached geometry and material
        this.mesh = new THREE.Mesh(
            getCachedGeometry('sphere', projSize),
            getCachedMaterial(tid, 'standard')
        );
        this.mesh.position.copy(pos);
        this.scene.add(this.mesh);
        this.vel.copy(dir).multiplyScalar(spd);
    }

    update(dt, map) {
        if (!this.alive) return;
        this.age += dt;
        if (this.age > 2.0) { this.destroy(); return; }

        this.vel.y -= 25 * dt; // Gravity
        const nextPos = this.mesh.position.clone().addScaledVector(this.vel, dt);

        // Raycast for more accurate hit detection
        const dir = nextPos.clone().sub(this.mesh.position);
        const len = dir.length();
        dir.normalize();

        // Check ground/walls
        // Simple check: iterate steps
        const steps = 3;
        const stepVec = this.vel.clone().multiplyScalar(dt / steps);

        for (let i = 0; i < steps; i++) {
            this.mesh.position.add(stepVec);

            // Wall/Ground collision
            const gy = map.getGroundY(this.mesh.position.x, this.mesh.position.z, this.mesh.position.y - 0.2, this.vel.y);
            if (this.mesh.position.y <= gy) {
                map.paintAt(this.mesh.position.x, this.mesh.position.z, this.tid, this.paintRad);
                this.hitPos = this.mesh.position.clone(); this.destroy(); return;
            }

            // Check walls (vertical surfaces)
            const c = map.collideWalls(this.mesh.position.x, this.mesh.position.z, 0.1);
            if (Math.abs(c.x - this.mesh.position.x) > 0.01 || Math.abs(c.z - this.mesh.position.z) > 0.01) {
                map.paintWallAt(this.mesh.position.x, this.mesh.position.y, this.mesh.position.z, this.tid, this.paintRad * 0.8);
                this.hitPos = this.mesh.position.clone(); this.destroy(); return;
            }
        }

        if (this.mesh.position.y < -10) this.destroy();
    }
}

export class InkBomb extends InkBase {
    constructor(scene, pos, dir, tid) {
        // Bomb: more damage, bigger radius
        super(scene, pos, tid, 120, 5.0, true);
        
        // Use cached geometry and material
        this.mesh = new THREE.Mesh(
            getCachedGeometry('tetrahedron', 0.4),
            getCachedMaterial(tid, 'bomb')
        );
        this.mesh.position.copy(pos);
        this.scene.add(this.mesh);

        this.vel.copy(dir).multiplyScalar(22); // Throw speed
        this.timer = 2.0; // Explodes after 2s or on impact? Let's make it bounce once then explode or timer
        this.bounces = 0;
    }

    update(dt, map) {
        if (!this.alive) return;
        this.age += dt;
        this.mesh.rotation.x += dt * 5;
        this.mesh.rotation.z += dt * 5;

        this.vel.y -= 40 * dt; // Heavier gravity
        const nextPos = this.mesh.position.clone().addScaledVector(this.vel, dt);

        // Ground collision
        const gy = map.getGroundY(nextPos.x, nextPos.z, nextPos.y, this.vel.y);
        if (nextPos.y <= gy + 0.3) {
            // Bounce or explode?
            // Explode immediately on contact for better gameplay feel in this fast-paced game
            this.hitPos = nextPos.clone();
            this.hitPos.y = gy;
            // Paint HUGE area
            map.paintAt(this.hitPos.x, this.hitPos.z, this.tid, this.paintRad);
            // Also paint walls nearby?
            this.destroy();
            return;
        }

        // Wall collision
        const cw = map.collideWalls(nextPos.x, nextPos.z, 0.3);
        if (Math.abs(cw.x - nextPos.x) > 0.01 || Math.abs(cw.z - nextPos.z) > 0.01) {
            // Hit wall -> explode
            this.hitPos = nextPos.clone();
            map.paintWallAt(this.hitPos.x, this.hitPos.y, this.hitPos.z, this.tid, this.paintRad);
            this.destroy();
            return;
        }

        this.mesh.position.copy(nextPos);

        if (this.age > this.timer) {
            this.hitPos = this.mesh.position.clone();
            this.destroy(); // Time out explosion
        }
        if (this.mesh.position.y < -10) this.destroy();
    }
}

export class InkManager {
    constructor(scene) {
        this.scene = scene;
        this.list = [];
    }

    shoot(pos, dir, tid, spd, paintRad, projSize, damage) {
        this.list.push(new InkProjectile(this.scene, pos, dir, tid, spd, paintRad, projSize, damage));
    }

    throwBomb(pos, dir, tid) {
        this.list.push(new InkBomb(this.scene, pos, dir, tid));
    }

    update(dt, map) {
        for (let i = this.list.length - 1; i >= 0; i--) {
            this.list[i].update(dt, map);
            if (!this.list[i].alive) this.list.splice(i, 1);
        }
    }

    reset() {
        this.list.forEach(p => p.alive && p.destroy());
        this.list = [];
    }
}
