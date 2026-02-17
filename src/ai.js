import * as THREE from 'three';

export class AIController {
    constructor(player, map) {
        this.p = player; this.map = map;
        this.tx = 0; this.tz = 0; this.ttimer = 0;
        this.state = 'roam'; // roam, attack, retreat, charge
        this.target = null;
        this.strafeDir = 1;
        this.strafeTimer = 0;
        this.jumpTimer = 0;

        // Random weapon assigment was done in Game class, but here we adapt behavior
        this.weaponType = this.p.weapon.type;
    }

    reset() {
        this.state = 'roam'; this.target = null; this.ttimer = 0;
    }

    update(dt, players) {
        if (!this.p.alive) return { move: { x: 0, z: 0, jump: false }, look: { yaw: 0, pitch: 0 }, shooting: false, squid: false, bomb: false };

        // Find target
        let bestDist = 100;
        let visibleTarget = null;

        for (const o of players) {
            if (o !== this.p && o.alive && o.teamId !== this.p.teamId) {
                const d = this.p.pos.distanceTo(o.pos);
                if (d < bestDist && d < 40) { // Range check
                    // Line of sight check?
                    if (this._hasLOS(o)) {
                        bestDist = d; visibleTarget = o;
                    }
                }
            }
        }
        this.target = visibleTarget;

        // State Machine
        if (this.p.hp < 30) this.state = 'retreat';
        else if (this.target) this.state = 'attack';
        else this.state = 'roam';

        // Weapon specific overrides
        if (this.weaponType === 'charger' && this.state === 'attack') {
            // Charger needs to aim and charge
            this.state = 'charge_attack';
        }

        let move = { x: 0, z: 0, jump: false };
        let look = { yaw: 0, pitch: 0 };
        let shooting = false;
        let squid = false;
        let bomb = false;

        // Execute State
        if (this.state === 'retreat') {
            // Run away from target or random point
            if (this.target) {
                const dir = new THREE.Vector3().subVectors(this.p.pos, this.target.pos).normalize();
                this._moveTo(dir.x, dir.z, move, look);
            } else {
                // Return to spawn?
                // Just go random
                this._roam(dt, move, look);
            }
            squid = true; // Retreat in squid form
            if (this.p.ink < 10) squid = false; // Need ink to squid? handled in player
        }
        else if (this.state === 'charge_attack') {
            // Aim precisely
            const dx = this.target.pos.x - this.p.pos.x;
            const dz = this.target.pos.z - this.p.pos.z;
            const targetYaw = Math.atan2(-dx, -dz);
            let diff = targetYaw - this.p.yaw;
            while (diff <= -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            look.yaw = diff * 5 * dt; // Aim speed

            // Pitch
            const dy = (this.target.pos.y + 1) - (this.p.pos.y + 1.5);
            const dist = Math.sqrt(dx * dx + dz * dz);
            const targetPitch = Math.atan2(dy, dist);
            look.pitch = (targetPitch - this.p.pitch) * 5 * dt;

            // Charge
            shooting = true;
            // Release if fully charged
            if (this.p.chargeLevel >= 1.0) {
                // FIRE! (stop shooting for one frame to release?)
                // Player logic handles: if shooting, charge. If NOT shooting, fire.
                // So we need to STOP shooting to fire.
                shooting = false;
            }

            // Movement: stand still or slow strafe
            // Chargers stand still to aim better
        }
        else if (this.state === 'attack') {
            // Aim at target
            const dx = this.target.pos.x - this.p.pos.x;
            const dz = this.target.pos.z - this.p.pos.z;
            const targetYaw = Math.atan2(-dx, -dz);
            let diff = targetYaw - this.p.yaw;
            while (diff <= -Math.PI) diff += Math.PI * 2;
            while (diff > Math.PI) diff -= Math.PI * 2;
            look.yaw = diff * 10 * dt;

            // Pitch
            const dy = (this.target.pos.y + 1) - (this.p.pos.y + 1.5);
            const dist = Math.sqrt(dx * dx + dz * dz);
            const targetPitch = Math.atan2(dy, dist);
            look.pitch = (targetPitch - this.p.pitch) * 5 * dt;

            // Movement depends on weapon
            if (this.weaponType === 'roller') {
                // Get CLOSE
                if (dist > 3) {
                    move.z = 1; // Run forward
                    squid = true; // Use squid to approach fast
                } else {
                    // Start swinging
                    shooting = true;
                }
            } else {
                // Shooter: strafe
                this.strafeTimer -= dt;
                if (this.strafeTimer <= 0) {
                    this.strafeDir *= -1;
                    this.strafeTimer = 1.0 + Math.random();
                }
                move.x = this.strafeDir;
                if (dist > 15) move.z = 1; // Get closer
                else if (dist < 8) move.z = -1; // Back up

                shooting = true;

                // Bomb throw check
                if (Math.random() < 0.01 && this.p.ink > 50) bomb = true;
            }
        }
        else { // Roam
            this._roam(dt, move, look);
            // Paint floor
            if (Math.random() < 0.3) {
                shooting = true;
                look.pitch = (0.5 - this.p.pitch) * dt; // Look down
            }
        }

        // Jump over obstacles
        this.jumpTimer -= dt;
        if (this.jumpTimer <= 0 && this.state !== 'charge_attack') {
            // Cast ray ahead?
            // Simple hack: if wall is close, jump
            if (this.map.getTileAt(this.p.pos.x + Math.sin(this.p.yaw) * 2, this.p.pos.z + Math.cos(this.p.yaw) * 2) === 1) {
                move.jump = true;
                this.jumpTimer = 2.0;
            }
        }

        return { move, look, shooting, squid, bomb };
    }

    _roam(dt, move, look) {
        this.ttimer -= dt;
        if (this.ttimer <= 0 || this.p.pos.distanceTo(new THREE.Vector3(this.tx, 0, this.tz)) < 2) {
            // Pick new point
            this.tx = Math.random() * this.map.width;
            this.tz = Math.random() * this.map.height;
            this.ttimer = 5.0;
        }

        const dx = this.tx - this.p.pos.x;
        const dz = this.tz - this.p.pos.z;
        const targetYaw = Math.atan2(-dx, -dz);
        let diff = targetYaw - this.p.yaw;
        while (diff <= -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        look.yaw = diff * 2 * dt;

        move.z = 1;
    }

    _moveTo(dx, dz, move, look) {
        // ... simplified
        move.z = 1;
    }

    _hasLOS(target) {
        // Simple dist check + map
        return true;
    }
}
