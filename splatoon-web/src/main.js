import * as THREE from 'three';
import { Game } from './game.js';
import { InputManager } from './input.js';
import { AudioManager } from './audio.js';
import { UIManager } from './ui.js';

// Reusable vectors for camera collision
const _camHead = new THREE.Vector3();
const _camDir = new THREE.Vector3();
const _camTarget = new THREE.Vector3();

// ===== Three.js Setup =====
const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
// Optimization: Limit pixel ratio
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.shadowMap.enabled = true;
// Optimization: Faster shadows
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1A1A2E);
scene.fog = new THREE.FogExp2(0x1A1A2E, 0.008);

const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);

// Lights
scene.add(new THREE.AmbientLight(0x6666aa, 0.6));
const dl = new THREE.DirectionalLight(0xffffff, 1.0);
dl.position.set(30, 50, 20); dl.castShadow = true;
// Optimization: Smaller shadow map
dl.shadow.mapSize.set(1024, 1024);
dl.shadow.camera.near = 1; dl.shadow.camera.far = 150;
dl.shadow.camera.left = -60; dl.shadow.camera.right = 60;
dl.shadow.camera.top = 50; dl.shadow.camera.bottom = -50;
scene.add(dl);
scene.add(new THREE.HemisphereLight(0x4444aa, 0x222233, 0.4));

// Stars - Reduce count for optimization
const sp = [];
for (let i = 0; i < 600; i++) sp.push((Math.random() - 0.5) * 600, 50 + Math.random() * 200, (Math.random() - 0.5) * 600);
const sg = new THREE.BufferGeometry();
sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
scene.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.4, sizeAttenuation: true, transparent: true, opacity: 0.8 })));

// ===== Managers =====
const input = new InputManager(); input.init(canvas);
const audio = new AudioManager();
const ui = new UIManager();
const game = new Game(scene, audio); game.init();

// ===== State Machine =====
let state = 'title', cdVal = 3, cdTimer = 0, camAngle = 0;
const CAM_DIST = 9;
const CAM_HEIGHT = 4.5;
let mmTimer = 0;
let smoothCamPos = new THREE.Vector3();
let camInitialized = false;

function titleCam(dt) {
    camAngle += dt * 0.2;
    const cx = game.map.width / 2, cz = game.map.height / 2;
    camera.position.set(cx + Math.cos(camAngle) * 45, 30, cz + Math.sin(camAngle) * 45);
    camera.lookAt(cx, 0, cz);
}

ui.els['start-btn'].addEventListener('click', () => { audio.init(); audio.resume(); startCD(); });
ui.els['retry-btn'].addEventListener('click', () => { game.reset(); camInitialized = false; startCD(); });
const cbtn = ui.els['controls-btn'];
if (cbtn) cbtn.addEventListener('click', () => ui.show('controls-overlay'));
const cclose = ui.els['controls-close'];
if (cclose) cclose.addEventListener('click', () => ui.hide('controls-overlay'));

// Pause / Resume click handler
window.addEventListener('click', () => {
    if (state === 'playing' && !input.locked) {
        input.requestPointerLock();
    }
});

function startCD() {
    state = 'countdown'; cdVal = 3; cdTimer = 1;
    ui.hideTitle(); ui.hideResult(); ui.showCountdown(cdVal); audio.playCountdown();
}

// Throttle resize events
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }, 100);
});

let last = performance.now();
(function loop(now) {
    requestAnimationFrame(loop);
    let dt = (now - last) / 1000; last = now;
    if (dt > 0.1) dt = 0.1; // Cap dt

    if (state === 'title') { titleCam(dt); }
    else if (state === 'countdown') {
        titleCam(dt); cdTimer -= dt;
        if (cdTimer <= 0) {
            cdVal--;
            if (cdVal <= 0) {
                state = 'playing'; ui.hideCountdown(); ui.showHUD();
                game.start(); input.requestPointerLock();
                audio.playGo(); audio.startBGM();
                camInitialized = false;
            } else { cdTimer = 1; ui.showCountdown(cdVal); audio.playCountdown(); }
        }
    }
    else if (state === 'playing') {
        if (!input.locked) {
            ui.showPause(true);
            // Optional: slow motion or pause game?
            // Let's pause updates but keep rendering
        } else {
            ui.showPause(false);
            play(dt);
        }
    }
    else if (state === 'result') { titleCam(dt * 0.5); }

    renderer.render(scene, camera);
})(performance.now());

function play(dt) {
    const p = game.human; if (!p) return;

    // Inputs
    const move = { x: 0, z: 0, jump: false };
    if (input.isKey('KeyW') || input.isKey('ArrowUp')) move.z = 1;
    if (input.isKey('KeyS') || input.isKey('ArrowDown')) move.z = -1;
    if (input.isKey('KeyA') || input.isKey('ArrowLeft')) move.x = -1;
    if (input.isKey('KeyD') || input.isKey('ArrowRight')) move.x = 1;
    if (input.isKey('Space')) move.jump = true;

    if (input.consumeKey('KeyR') && p.alive && p.onGround) {
        game._respawnPlayer(p); p.vel.y = 25; p.onGround = false;
    }

    if (input.consumeKey('Digit1')) p.switchWeapon(0);
    if (input.consumeKey('Digit2')) p.switchWeapon(1);
    if (input.consumeKey('Digit3')) p.switchWeapon(2);
    const scroll = input.consumeScroll();
    if (scroll !== 0) {
        p.switchWeapon((p.weaponIdx + (scroll > 0 ? 1 : -1) + p.weapons.length) % p.weapons.length);
    }

    // Look
    const md = input.consumeDelta();
    // Safety check for NaN
    if (isNaN(md.dx)) md.dx = 0;
    if (isNaN(md.dy)) md.dy = 0;

    const sens = 0.0025;
    const look = { yaw: -md.dx * sens, pitch: -md.dy * sens };

    const bomb = input.consumeKey('KeyE');
    const special = input.consumeKey('KeyQ');
    const squid = input.isKey('ShiftLeft') || input.isKey('ShiftRight');

    game.update(dt, move, look, input.isFiring(), squid, bomb, special);

    // ===== Camera =====
    // Ensure pitch is number
    if (isNaN(p.pitch)) p.pitch = 0;

    const sy = Math.sin(p.yaw), cy = Math.cos(p.yaw);
    const pitchFactor = p.pitch * 0.5;

    const camYOffset = CAM_HEIGHT - (p.pitch * 3.0);
    const camZOffset = CAM_DIST * Math.cos(p.pitch * 0.3);

    const idealX = p.pos.x + sy * camZOffset;
    const idealY = p.pos.y + Math.max(1.0, camYOffset);
    const idealZ = p.pos.z + cy * camZOffset;

    // Collision
    let cx = idealX, cy_ = idealY, cz = idealZ;
    _camHead.set(p.pos.x, p.pos.y + 1.8, p.pos.z);

    _camDir.set(cx - _camHead.x, cy_ - _camHead.y, cz - _camHead.z);
    const len = _camDir.length(); _camDir.normalize();
    let hitLen = len;

    for (const w of game.map.walls) {
        // Optimization: rough check first
        if (Math.abs(w.minX - p.pos.x) > 20 && Math.abs(w.minZ - p.pos.z) > 20) continue;

        for (let t = 0.5; t < len; t += 0.8) { // Coarser steps for optimization
            const tx = _camHead.x + _camDir.x * t;
            const ty = _camHead.y + _camDir.y * t;
            const tz = _camHead.z + _camDir.z * t;
            if (tx >= w.minX && tx <= w.maxX && tz >= w.minZ && tz <= w.maxZ && ty < w.topY) {
                hitLen = Math.min(hitLen, Math.max(1.0, t - 0.5));
                break;
            }
        }
    }

    cx = _camHead.x + _camDir.x * hitLen;
    cy_ = _camHead.y + _camDir.y * hitLen;
    cz = _camHead.z + _camDir.z * hitLen;

    const gy = game.map.getGroundY(cx, cz) + 0.5;
    if (cy_ < gy) cy_ = gy;

    _camTarget.set(cx, cy_, cz);

    if (!camInitialized) {
        smoothCamPos.copy(_camTarget); camInitialized = true;
    } else {
        smoothCamPos.lerp(_camTarget, 20 * dt);
    }

    camera.position.copy(smoothCamPos);

    const lookDist = 10;
    const lookTgtY = p.pos.y + 1.8 + Math.sin(p.pitch) * lookDist;
    const lookTgtX = p.pos.x - sy * lookDist;
    const lookTgtZ = p.pos.z - cy * lookDist;

    camera.lookAt(lookTgtX, lookTgtY, lookTgtZ);

    ui.updateTimer(game.timer);
    ui.updateScore(game.scores.t1, game.scores.t2);
    ui.updateInk((p.ink / p.maxInk) * 100);
    ui.updateHP(p.hp, p.maxHp);
    ui.updateDamageFlash(p.damageFlash > 0 ? 1 : 0);
    ui.updateRespawn(p.alive, p.respawn);
    ui.updateKillFeed(game.killFeed);
    ui.updateWeapon(p.weaponIdx, p.weapons);
    ui.updateKD(p.kills, p.deaths);
    ui.showSquid(p.isSquid);
    ui.updateCharge(p.charging ? p.chargeLevel : 0);
    ui.updateSpecial(p.special, p.maxSpecial, p.specialActive);

    if (game.lastHitTime && Date.now() - game.lastHitTime < 200) ui.showHitMarker();

    mmTimer -= dt;
    if (mmTimer <= 0) { ui.updateMinimap(game.map, game.players); mmTimer = 0.1; }

    if (game.finished) {
        state = 'result';
        ui.showResult(game.scores.t1, game.scores.t2, 1);
        document.exitPointerLock(); audio.stopBGM();
    }
}

// Initial draw of UI
ui.showTitle();
