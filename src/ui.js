import { TEAM_COLORS } from './map.js';

export class UIManager {
    constructor() {
        this.els = {};
        ['title-screen', 'start-btn', 'controls-btn', 'controls-overlay', 'controls-close',
            'countdown', 'countdown-number', 'hud', 'timer',
            'score-team1', 'score-team2', 'ink-level', 'squid-indicator',
            'result-screen', 'result-title', 'result-percent1', 'result-percent2', 'retry-btn',
            'hp-fill', 'hp-text', 'damage-flash', 'kill-feed', 'minimap',
            'respawn-overlay', 'respawn-timer', 'weapon-indicator', 'kd-display', 'crosshair',
            'hit-marker', 'charge-bar', 'charge-fill', 'special-gauge', 'special-fill', 'special-text',
            'pause-overlay'
        ].forEach(id => this.els[id] = document.getElementById(id));

        const mc = this.els['minimap'];
        this.mmCtx = mc ? mc.getContext('2d', { alpha: false }) : null; // Optimize
        this.lastKillCount = 0;

        // Cache map base
        this.mapBaseCanvas = document.createElement('canvas');
        this.mapBaseCanvas.width = 180;
        this.mapBaseCanvas.height = 120;
        this.mbCtx = this.mapBaseCanvas.getContext('2d', { alpha: false });
        this.mapCached = false;
    }

    show(id) { this.els[id]?.classList.remove('hidden'); }
    hide(id) { this.els[id]?.classList.add('hidden'); }

    showTitle() { this.show('title-screen'); this.hide('hud'); this.hide('countdown'); this.hide('result-screen'); this.hide('pause-overlay'); }
    hideTitle() { this.hide('title-screen'); }

    showCountdown(n) {
        this.show('countdown');
        const el = this.els['countdown-number'];
        el.textContent = n; el.style.animation = 'none'; void el.offsetHeight; el.style.animation = 'countPop 0.5s ease-out';
    }
    hideCountdown() { this.hide('countdown'); }
    showHUD() { this.show('hud'); }

    showPause(show) {
        if (show) this.show('pause-overlay');
        else this.hide('pause-overlay');
    }

    updateTimer(sec) {
        const el = this.els['timer'];
        el.textContent = `${Math.floor(sec / 60)}:${Math.floor(sec % 60).toString().padStart(2, '0')}`;
        el.style.color = sec <= 10 ? (sec % 1 < 0.5 ? '#F5247B' : '#fff') : '#fff';
    }

    updateScore(t1, t2) {
        const tot = t1 + t2 || 1;
        this.els['score-team1'].style.width = `${(t1 / tot) * 100}%`;
        this.els['score-team2'].style.width = `${(t2 / tot) * 100}%`;
    }

    updateInk(pct) { this.els['ink-level'].style.height = `${pct}%`; }
    showSquid(v) { v ? this.show('squid-indicator') : this.hide('squid-indicator'); }

    updateHP(hp, maxHp) {
        const pct = Math.max(0, (hp / maxHp) * 100);
        this.els['hp-fill'].style.width = `${pct}%`;
        this.els['hp-text'].textContent = Math.ceil(hp);
        const col = pct <= 30 ? '#ff3333' : (pct <= 60 ? '#ffaa00' : '#00ff88');
        this.els['hp-text'].style.color = col;
        this.els['hp-fill'].style.background = pct <= 30 ? 'linear-gradient(90deg, #ff3333, #cc0000)' :
            (pct <= 60 ? 'linear-gradient(90deg, #ffaa00, #ff8800)' : 'linear-gradient(90deg, #00ff88, #00cc66)');
    }

    updateSpecial(val, max, active) {
        const pct = Math.min(100, (val / max) * 100);
        this.els['special-fill'].style.height = `${pct}%`;
        if (active) {
            this.els['special-gauge'].classList.add('special-active');
            this.els['special-gauge'].classList.remove('special-ready');
            this.els['special-text'].textContent = "ACTIVE!";
        } else if (pct >= 100) {
            this.els['special-gauge'].classList.add('special-ready');
            this.els['special-gauge'].classList.remove('special-active');
            this.els['special-text'].textContent = "READY [Q]";
        } else {
            this.els['special-gauge'].classList.remove('special-ready');
            this.els['special-gauge'].classList.remove('special-active');
            this.els['special-text'].textContent = "SPECIAL";
        }
    }

    updateCharge(level) {
        if (level > 0) {
            this.show('charge-bar');
            this.els['charge-fill'].style.width = `${level * 100}%`;
            this.els['charge-fill'].style.background = level >= 1.0 ? '#ffff00' : '#fff';
        } else {
            this.hide('charge-bar');
        }
    }

    updateDamageFlash(intensity) { this.els['damage-flash'].style.opacity = intensity; }

    updateRespawn(alive, respawnTime) {
        if (!alive) {
            this.show('respawn-overlay');
            this.els['respawn-timer'].textContent = Math.ceil(respawnTime);
        } else {
            this.hide('respawn-overlay');
        }
    }

    updateKillFeed(killFeed) {
        if (killFeed.length !== this.lastKillCount) {
            this.lastKillCount = killFeed.length;
            const el = this.els['kill-feed'];
            el.innerHTML = '';
            const show = killFeed.slice(-5);
            for (const k of show) {
                const div = document.createElement('div');
                div.className = 'kill-entry';
                const an = k.attacker === 1 ? 'CYAN' : 'MAGENTA';
                const vn = k.victim === 1 ? 'CYAN' : 'MAGENTA';
                const ac = k.attacker === 1 ? 'team-cyan' : 'team-magenta';
                const vc = k.victim === 1 ? 'team-cyan' : 'team-magenta';
                div.innerHTML = `<span class="${ac}">${an}</span> 💀 <span class="${vc}">${vn}</span>`;
                el.appendChild(div);
            }
        }
    }

    updateMinimap(map, players) {
        if (!this.mmCtx) return;
        const ctx = this.mmCtx;
        const cw = 180, ch = 120;
        const pw = map.pw, ph = map.ph;

        // 1. Draw Static Map Layers (Walls/Floor) ONLY ONCE
        if (!this.mapCached) {
            this.mbCtx.fillStyle = '#222';
            this.mbCtx.fillRect(0, 0, cw, ch);
            // Draw walls as static gray blocks
            const dw = cw / map.cols;
            const dh = ch / map.rows;
            this.mbCtx.fillStyle = '#444';
            for (let r = 0; r < map.rows; r++) {
                for (let c = 0; c < map.cols; c++) {
                    if (map.getTileAt(c * 4 + 2, r * 4 + 2) === 1) { // Wall
                        this.mbCtx.fillRect(c * dw, r * dh, dw, dh);
                    }
                }
            }
            this.mapCached = true;
        }

        // 2. Draw Paint (Dynamic) - lower resolution for speed?
        // We can just iterate the paintData and draw rects on mc

        ctx.drawImage(this.mapBaseCanvas, 0, 0);

        // Batch draw paint?
        // Optimization: Access pixel data directly is fast, but putImageData is slow if canvas is large.
        // 180x120 is small enough (21k pixels).
        // Let's try direct pixel manipulation again BUT efficient.

        const idata = ctx.getImageData(0, 0, cw, ch);
        const d = idata.data;

        // Skip factor for performance (draw every 2nd pixel)
        for (let y = 0; y < ch; y += 2) {
            for (let x = 0; x < cw; x += 2) {
                const mx = Math.floor((x / cw) * pw);
                const my = Math.floor((y / ch) * ph);
                const tid = map.paintData[my * pw + mx];
                if (tid !== 0) {
                    const c = TEAM_COLORS[tid];
                    const idx = (y * cw + x) * 4;
                    // Write 2x2 block
                    d[idx] = c.r; d[idx + 1] = c.g; d[idx + 2] = c.b;
                    d[idx + 4] = c.r; d[idx + 5] = c.g; d[idx + 6] = c.b;
                    const idx2 = ((y + 1) * cw + x) * 4;
                    d[idx2] = c.r; d[idx2 + 1] = c.g; d[idx2 + 2] = c.b;
                    d[idx2 + 4] = c.r; d[idx2 + 5] = c.g; d[idx2 + 6] = c.b;
                }
            }
        }
        ctx.putImageData(idata, 0, 0);

        // 3. Players
        for (const p of players) {
            if (!p.alive) continue;
            const px = (p.pos.x / map.width) * cw;
            const py = (p.pos.z / map.height) * ch;
            ctx.fillStyle = p.teamId === 1 ? '#26D9E6' : '#F5247B';
            ctx.beginPath(); ctx.arc(px, py, p.isHuman ? 4 : 3, 0, Math.PI * 2); ctx.fill();
            if (p.isHuman) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
        }
    }

    updateWeapon(idx, weapons) {
        const el = this.els['weapon-indicator'];
        if (!el) return;
        el.innerHTML = '';
        for (let i = 0; i < weapons.length; i++) {
            const item = document.createElement('div');
            item.className = 'weapon-item' + (i === idx ? ' active' : '');
            item.innerHTML = `${i + 1}. ${weapons[i].name} <span style="font-size:10px">${weapons[i].desc}</span>`;
            el.appendChild(item);
        }
    }

    updateKD(kills, deaths) {
        const el = this.els['kd-display'];
        if (el) el.textContent = `K:${kills} / D:${deaths}`;
    }

    showHitMarker() {
        const el = this.els['hit-marker'];
        if (!el) return;
        el.classList.remove('hidden');
        el.classList.remove('hit-anim');
        void el.offsetHeight;
        el.classList.add('hit-anim');
        clearTimeout(this._hitTimer);
        this._hitTimer = setTimeout(() => el.classList.add('hidden'), 200);
    }

    showResult(t1, t2, pTeam) {
        this.show('result-screen'); this.hide('hud'); this.hide('pause-overlay');
        const won = (pTeam === 1 && t1 > t2) || (pTeam === 2 && t1 < t2);
        const rt = this.els['result-title'];
        rt.textContent = won ? 'VICTORY!' : 'DEFEAT...';
        rt.style.color = won ? '#26D9E6' : '#F5247B';
        this.els['result-percent1'].textContent = `${t1.toFixed(1)}%`;
        this.els['result-percent2'].textContent = `${t2.toFixed(1)}%`;
    }
}
