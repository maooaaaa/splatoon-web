import * as THREE from 'three';

// Map layout: 0=floor, 1=wall, 2=low platform, 3=high platform
const LAYOUT = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 1],
    [1, 0, 0, 2, 3, 3, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 3, 3, 2, 0, 0, 1],
    [1, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 3, 0, 0, 0, 1],
    [1, 0, 0, 2, 3, 3, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 3, 3, 2, 0, 0, 1],
    [1, 0, 0, 2, 2, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 2, 2, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
];

const T = 4;
const PR = 8;
const WALL_H = 6;
const LOW_PLAT_H = 2;
const HIGH_PLAT_H = 4;

export const TEAM_COLORS = { 1: { r: 38, g: 217, b: 230 }, 2: { r: 245, g: 36, b: 123 } };
export const TEAM_HEX = { 1: 0x26D9E6, 2: 0xF5247B };

export class GameMap {
    constructor(scene) {
        this.scene = scene;
        this.rows = LAYOUT.length;
        this.cols = LAYOUT[0].length;
        this.width = this.cols * T;
        this.height = this.rows * T;
        this.pw = this.cols * PR;
        this.ph = this.rows * PR;
        this.paintData = new Uint8Array(this.pw * this.ph);
        this.paintCanvas = document.createElement('canvas');
        this.paintCanvas.width = this.pw;
        this.paintCanvas.height = this.ph;
        this.pctx = this.paintCanvas.getContext('2d', { willReadFrequently: true });
        this.walls = [];
        this.platforms = [];
        this.wallMeshes = [];
    }

    build() {
        // Ground
        const geo = new THREE.PlaneGeometry(this.width, this.height);
        geo.rotateX(-Math.PI / 2);
        const bc = document.createElement('canvas');
        bc.width = this.pw; bc.height = this.ph;
        const bctx = bc.getContext('2d');
        for (let r = 0; r < this.rows; r++)
            for (let c = 0; c < this.cols; c++) {
                const v = LAYOUT[r][c];
                if (v === 1) bctx.fillStyle = '#2B2B3D';
                else bctx.fillStyle = (r + c) % 2 ? '#363650' : '#3D3D55';
                bctx.fillRect(c * PR, r * PR, PR, PR);
            }

        const baseTex = new THREE.CanvasTexture(bc);
        baseTex.minFilter = THREE.NearestFilter; baseTex.magFilter = THREE.NearestFilter;
        // Optimization: Don't generate mipmaps for dynamic texture if possible or keep it simple
        this.paintTex = new THREE.CanvasTexture(this.paintCanvas);
        this.paintTex.minFilter = THREE.NearestFilter; this.paintTex.magFilter = THREE.NearestFilter;
        this.paintTex.generateMipmaps = false;

        const mat = new THREE.ShaderMaterial({
            uniforms: { baseTex: { value: baseTex }, paintTex: { value: this.paintTex } },
            vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
            fragmentShader: `uniform sampler2D baseTex,paintTex; varying vec2 vUv; void main(){ vec4 b=texture2D(baseTex,vUv),p=texture2D(paintTex,vUv); gl_FragColor=mix(b,vec4(p.rgb,1.0),p.a); }`,
        });
        const ground = new THREE.Mesh(geo, mat);
        ground.position.set(this.width / 2, 0, this.height / 2);
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Greedy Meshing for Walls (1) and Platforms (2, 3)
        const wallRects = this._greedyMesh(1);
        const lowPlatRects = this._greedyMesh(2);
        const highPlatRects = this._greedyMesh(3);

        const buildBlock = (rect, height, isWall) => {
            const w = rect.w * T, d = rect.h * T; // rect.w is width in tiles (x), rect.h is height (z)
            const cx = (rect.x * T) + w / 2;
            const cz = (rect.y * T) + d / 2;

            // Texture for painting
            // Optimization: limit canvas size
            const cw = Math.min(256, Math.floor(w * 8));
            const ch = Math.min(256, Math.floor(d * 8)); // 8 px per unit? NO, map uses PR=8 (T=4 -> 32px per tile)
            // T=4 units. PR=8 pixels. So 1 unit = 2 pixels?
            // Actually map uses Tile=4 units, PR=8 pixels per tile. So 2 pixels per unit.
            // Let's use 16 pixels per tile for higher quality or 8 for speed.
            // Player paintRad is ~2.0 units.

            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(rect.w * 8);
            canvas.height = Math.ceil(rect.h * 8);
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // Base color
            ctx.fillStyle = isWall ? '#3a3a52' : (height > 3 ? '#5A5A72' : '#4A4A62');
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            const tex = new THREE.CanvasTexture(canvas);
            tex.minFilter = THREE.NearestFilter; tex.magFilter = THREE.NearestFilter;
            tex.generateMipmaps = false;

            const mat = new THREE.MeshStandardMaterial({
                color: isWall ? 0x3a3a52 : (height > 3 ? 0x5A5A72 : 0x4A4A62),
                roughness: 0.7, map: tex
            });
            const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, height, d), mat);
            mesh.position.set(cx, height / 2, cz);
            mesh.castShadow = true; mesh.receiveShadow = true;
            this.scene.add(mesh);

            const data = {
                minX: rect.x * T, maxX: (rect.x + rect.w) * T,
                minZ: rect.y * T, maxZ: (rect.y + rect.h) * T,
                topY: height, canvas, ctx, tex, mesh
            };
            if (isWall) {
                this.walls.push(data); this.wallMeshes.push(data);
                // Edge visual
                const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.1, 0.08, d + 0.1),
                    new THREE.MeshStandardMaterial({ color: 0x4488aa, emissive: 0x26D9E6, emissiveIntensity: 0.15 }));
                edge.position.set(cx, height + 0.04, cz);
                this.scene.add(edge);
            } else {
                this.platforms.push(data);
                // Edge visual
                const edge = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.05, d + 0.05),
                    new THREE.MeshStandardMaterial({ color: 0x4488aa, emissive: 0x26D9E6, emissiveIntensity: 0.15 }));
                edge.position.set(cx, height + 0.025, cz);
                this.scene.add(edge);
            }
        };

        wallRects.forEach(r => buildBlock(r, WALL_H, true));
        lowPlatRects.forEach(r => buildBlock(r, LOW_PLAT_H, false));
        highPlatRects.forEach(r => buildBlock(r, HIGH_PLAT_H, false));

        this._addDecorations();
    }

    // Convert grid to list of largest rectangles
    _greedyMesh(type) {
        const checked = Array(this.rows).fill().map(() => Array(this.cols).fill(false));
        const rects = [];

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (LAYOUT[r][c] === type && !checked[r][c]) {
                    // Start a new rect
                    let w = 1;
                    // Expand width
                    while (c + w < this.cols && LAYOUT[r][c + w] === type && !checked[r][c + w]) {
                        w++;
                    }

                    let h = 1;
                    // Expand height
                    let canExpand = true;
                    while (r + h < this.rows && canExpand) {
                        for (let k = 0; k < w; k++) {
                            if (LAYOUT[r + h][c + k] !== type || checked[r + h][c + k]) {
                                canExpand = false;
                                break;
                            }
                        }
                        if (canExpand) h++;
                    }

                    // Mark visited
                    for (let y = 0; y < h; y++) {
                        for (let x = 0; x < w; x++) {
                            checked[r + y][c + x] = true;
                        }
                    }
                    rects.push({ x: c, y: r, w, h });
                }
            }
        }
        return rects;
    }

    _addDecorations() {
        // Reduced decor for performance
        const stripMat = new THREE.MeshStandardMaterial({ color: 0x2244aa, emissive: 0x2244aa, emissiveIntensity: 0.4, roughness: 0.1 });
        const stripGeo = new THREE.BoxGeometry(0.15, 0.02, this.height * 0.6);
        const s = new THREE.Mesh(stripGeo, stripMat); s.position.set(this.width * 0.5, 0.01, this.height * 0.5); this.scene.add(s);
    }

    paintAt(wx, wz, tid, rad) {
        const px = (wx / this.width) * this.pw, py = (wz / this.height) * this.ph;
        const pr = (rad / this.width) * this.pw;
        const col = TEAM_COLORS[tid]; if (!col) return;
        this.pctx.fillStyle = `rgb(${col.r},${col.g},${col.b})`;
        this.pctx.beginPath(); this.pctx.arc(px, py, pr, 0, Math.PI * 2); this.pctx.fill();
        // Reduced splatter iterations for perf
        const r2 = pr * 1.5;
        const x0 = Math.max(0, Math.floor(px - r2)), x1 = Math.min(this.pw - 1, Math.ceil(px + r2));
        const y0 = Math.max(0, Math.floor(py - r2)), y1 = Math.min(this.ph - 1, Math.ceil(py + r2));
        for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
            if ((x - px) ** 2 + (y - py) ** 2 < r2 * r2) {
                const tr = Math.floor(y / PR), tc = Math.floor(x / PR);
                if (tr >= 0 && tr < this.rows && tc >= 0 && tc < this.cols && LAYOUT[tr][tc] !== 1)
                    this.paintData[y * this.pw + x] = tid;
            }
        }
        this.paintTex.needsUpdate = true;
    }

    paintWallAt(wx, wy, wz, tid, rad) {
        const col = TEAM_COLORS[tid]; if (!col) return;
        const colorStr = `rgb(${col.r},${col.g},${col.b})`;

        // Optimize: Hitbox check first? collideWalls already does it?
        // We use a broader check

        const check = (arr) => {
            let hit = false;
            for (const w of arr) {
                if (wx >= w.minX - rad && wx <= w.maxX + rad && wz >= w.minZ - rad && wz <= w.maxZ + rad) {
                    // Check height
                    if (wy >= 0 && wy <= w.topY + 0.5) {
                        const cw = w.canvas.width;
                        const ch = w.canvas.height;
                        // Map 3D pos to UV
                        // Simple top-down mapping for tops? No, walls need side mapping.
                        // But we are using Box mapped textures.
                        // Simplified: We just paint on the top-down projection for now to save complexity?
                        // UV mapping a Box correctly for painting is hard without unwrapping.

                        // Fix: Project relative to the center of the block
                        const u = ((wx - w.minX) / (w.maxX - w.minX)) * cw;
                        const v = ((wz - w.minZ) / (w.maxZ - w.minZ)) * ch;
                        const pr = (rad / T) * 16 * 0.5; // Scale radius

                        w.ctx.fillStyle = colorStr;
                        w.ctx.beginPath(); w.ctx.arc(u, v, pr, 0, Math.PI * 2); w.ctx.fill();
                        w.tex.needsUpdate = true;
                        hit = true;
                    }
                }
            }
            return hit;
        };
        // Just paint both arrays
        check(this.walls);
        check(this.platforms);
    }

    getTeamAt(wx, wz) {
        const px = Math.floor((wx / this.width) * this.pw), py = Math.floor((wz / this.height) * this.ph);
        if (px < 0 || px >= this.pw || py < 0 || py >= this.ph) return 0;
        return this.paintData[py * this.pw + px];
    }

    getTileAt(wx, wz) {
        const c = Math.floor(wx / T), r = Math.floor(wz / T);
        if (r < 0 || r >= this.rows || c < 0 || c >= this.cols) return 1;
        return LAYOUT[r][c];
    }
    isWalkable(wx, wz) { const t = this.getTileAt(wx, wz); return t !== 1; }

    getGroundY(wx, wz, playerY = 100, velY = 0) {
        let bestY = 0;
        for (const p of this.platforms) {
            if (wx >= p.minX && wx <= p.maxX && wz >= p.minZ && wz <= p.maxZ) {
                if (playerY >= p.topY - 0.8) bestY = Math.max(bestY, p.topY);
            }
        }
        for (const w of this.walls) {
            if (wx >= w.minX && wx <= w.maxX && wz >= w.minZ && wz <= w.maxZ) {
                if (playerY >= w.topY - 0.8) bestY = Math.max(bestY, w.topY);
            }
        }
        return bestY;
    }

    getScores() {
        let t1 = 0, t2 = 0, total = 0;
        for (let i = 0; i < this.paintData.length; i += PR) { // Sample to speed up
            const v = this.paintData[i];
            if (v === 1) t1++; else if (v === 2) t2++;
        }
        total = (this.pw * this.ph) / PR; // Approx
        return { t1: t1 / total * 100, t2: t2 / total * 100 };
    }

    collideWalls(x, z, rad) {
        let nx = x, nz = z;
        for (const w of this.walls) {
            const cx = Math.max(w.minX, Math.min(nx, w.maxX));
            const cz = Math.max(w.minZ, Math.min(nz, w.maxZ));
            const dx = nx - cx, dz = nz - cz, d = Math.sqrt(dx * dx + dz * dz);
            if (d < rad && d > 0.001) {
                const o = rad - d; nx += (dx / d) * o; nz += (dz / d) * o;
            } else if (d <= 0.001) {
                // Inside
                const dL = Math.abs(nx - w.minX), dR = Math.abs(nx - w.maxX);
                const dT = Math.abs(nz - w.minZ), dB = Math.abs(nz - w.maxZ);
                const min = Math.min(dL, dR, dT, dB);
                if (min === dL) nx = w.minX - rad; else if (min === dR) nx = w.maxX + rad;
                else if (min === dT) nz = w.minZ - rad; else nz = w.maxZ + rad;
            }
        }
        return { x: nx, z: nz };
    }

    reset() {
        this.paintData.fill(0);
        this.pctx.clearRect(0, 0, this.pw, this.ph);
        this.paintTex.needsUpdate = true;
        const resetBlock = (arr) => arr.forEach(b => {
            b.ctx.fillStyle = b.mesh.material.color.getStyle();
            b.ctx.fillRect(0, 0, b.canvas.width, b.canvas.height);
            b.tex.needsUpdate = true;
        });
        resetBlock(this.walls);
        resetBlock(this.platforms);
    }
}
