// Input Manager - Keyboard & Mouse with Pointer Lock
export class InputManager {
    constructor() {
        this.keys = {};
        this.mouse = { dx: 0, dy: 0, down: false };
        this.locked = false;
        this._consumed = {};
        this._scroll = 0;
    }
    init(canvas) {
        this.canvas = canvas;
        document.addEventListener('keydown', e => {
            this.keys[e.code] = true;
            // Prevent default for game keys: WASD, Space, Shift, E(Bomb), Q(Special), R(Respawn), 1-3
            if (this.locked && ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight',
                'KeyE', 'KeyQ', 'KeyR', 'Digit1', 'Digit2', 'Digit3',
                'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
                e.preventDefault();
            }
        });
        document.addEventListener('keyup', e => {
            this.keys[e.code] = false;
            this._consumed[e.code] = false;
        });
        document.addEventListener('mousedown', () => {
            if (this.locked) this.mouse.down = true;
        });
        document.addEventListener('mouseup', () => {
            if (this.locked) this.mouse.down = false;
        });
        document.addEventListener('mousemove', e => {
            if (this.locked) {
                this.mouse.dx += e.movementX;
                this.mouse.dy += e.movementY;
            }
        });
        document.addEventListener('wheel', e => {
            if (this.locked) this._scroll = Math.sign(e.deltaY);
        });

        // Pointer lock
        document.addEventListener('pointerlockchange', () => {
            this.locked = !!document.pointerLockElement;
            if (!this.locked) {
                // Paused?
            }
        });
    }

    requestPointerLock() {
        this.canvas.requestPointerLock();
    }

    isKey(code) { return !!this.keys[code]; }

    consumeKey(code) {
        if (this.keys[code] && !this._consumed[code]) {
            this._consumed[code] = true;
            return true;
        }
        return false;
    }

    consumeScroll() {
        const s = this._scroll;
        this._scroll = 0;
        return s;
    }

    consumeDelta() {
        const d = { dx: this.mouse.dx, dy: this.mouse.dy };
        this.mouse.dx = 0; this.mouse.dy = 0;
        return d;
    }

    isFiring() { return this.mouse.down; }
}
