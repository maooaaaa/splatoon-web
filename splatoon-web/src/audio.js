export class AudioManager {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
        this.bgm = null;
    }

    init() { if (this.ctx.state === 'suspended') this.ctx.resume(); }
    resume() { if (this.ctx.state === 'suspended') this.ctx.resume(); }

    playTone(freq, type, dur, vol = 0.1) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.type = type;
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + dur);
        osc.connect(gain); gain.connect(this.master);
        osc.start(); osc.stop(this.ctx.currentTime + dur);
    }

    playShoot(type) {
        // type 1=player, 2=enemy
        const f = type === 1 ? 400 + Math.random() * 200 : 300 + Math.random() * 100;
        this.playTone(f, 'square', 0.1, 0.05);
    }

    playSplat() {
        // Squishy sound
        this.playTone(150 + Math.random() * 50, 'sawtooth', 0.1, 0.08);
        setTimeout(() => this.playTone(100 + Math.random() * 50, 'sine', 0.15, 0.08), 50);
    }

    playBombThrow() {
        // Whoosh
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, this.ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.2);
        osc.connect(gain); gain.connect(this.master);
        osc.start(); osc.stop(this.ctx.currentTime + 0.2);
    }

    playSpecial() {
        // Power up sound
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(200, this.ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(800, this.ctx.currentTime + 1.0);
        osc.type = 'triangle';
        gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.0);
        osc.connect(gain); gain.connect(this.master);
        osc.start(); osc.stop(this.ctx.currentTime + 1.0);
    }

    playCountdown() { this.playTone(800, 'sine', 0.1, 0.2); }
    playGo() { this.playTone(1200, 'square', 0.4, 0.3); }

    playWhistle() {
        // Less scary whistle
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.setValueAtTime(800, now + 0.1);
        osc.frequency.setValueAtTime(0, now + 0.11); // Silence
        osc.frequency.setValueAtTime(800, now + 0.2);
        osc.frequency.linearRampToValueAtTime(600, now + 0.6);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);
        osc.connect(gain); gain.connect(this.master);
        osc.start(); osc.stop(now + 0.6);
    }

    startBGM() {
        if (this.bgm) return;
        // Simple drum beat + bass loop
        this.bgm = setInterval(() => {
            const t = this.ctx.currentTime;
            // Kick
            const kick = this.ctx.createOscillator();
            const kg = this.ctx.createGain();
            kick.frequency.setValueAtTime(150, t);
            kick.frequency.exponentialRampToValueAtTime(0.01, t + 0.2);
            kg.gain.setValueAtTime(0.3, t);
            kg.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
            kick.connect(kg); kg.connect(this.master);
            kick.start(); kick.stop(t + 0.2);

            // Snare (noise-ish)
            setTimeout(() => {
                const sn = this.ctx.createOscillator();
                const sg = this.ctx.createGain();
                sn.type = 'sawtooth';
                sn.frequency.setValueAtTime(200, t + 0.25);
                sg.gain.setValueAtTime(0.1, t + 0.25);
                sg.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
                sn.connect(sg); sg.connect(this.master);
                sn.start(t + 0.25); sn.stop(t + 0.35);
            }, 250);

            // Bass line (randomized)
            const note = 100 + [0, 20, 40, 50][Math.floor(Math.random() * 4)];
            const bass = this.ctx.createOscillator();
            const bg = this.ctx.createGain();
            bass.type = 'triangle';
            bass.frequency.setValueAtTime(note, t);
            bg.gain.setValueAtTime(0.15, t);
            bg.gain.linearRampToValueAtTime(0, t + 0.4);
            bass.connect(bg); bg.connect(this.master);
            bass.start(); bass.stop(t + 0.4);

        }, 500); // 120 BPM
    }

    stopBGM() {
        if (this.bgm) { clearInterval(this.bgm); this.bgm = null; }
    }
}
