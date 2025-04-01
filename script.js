// --- Polyfills and Helpers ---
window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback) { return window.setTimeout(callback, 1000 / 60); };
window.cancelAnimationFrame = window.cancelAnimationFrame || window.webkitCancelAnimationFrame || window.mozCancelAnimationFrame || window.oCancelAnimationFrame || window.msCancelAnimationFrame || function(id) { window.clearTimeout(id); };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);
const degToRad = (degrees) => degrees * Math.PI / 180;
const radToDeg = (radians) => radians * 180 / Math.PI;
const clamp = (val, min, max) => Math.max(min, Math.min(val, max));

// --- Game Configuration ---
const CONFIG = {
    GRAVITY_BASE: 0.00162,
    THRUST_POWER: 0.0045,
    ROTATION_SPEED: 0.16,
    FUEL_CONSUMPTION_THRUST: 0.18,
    FUEL_CONSUMPTION_ROTATE: 0.04,
    MAX_LANDING_ROTATION: 5,
    PARTICLE_COUNT_THRUST: 5,
    PARTICLE_COUNT_EXPLOSION: 50,
    PARTICLE_COUNT_DUST: 15,
    STAR_COUNT_BG: 100,
    STAR_COUNT_MG: 80,
    STAR_COUNT_FG: 60,
    PARALLAX_FACTOR_BG: 0.1,
    PARALLAX_FACTOR_MG: 0.3,
    PARALLAX_FACTOR_FG: 0.5,
    INITIAL_ALTITUDE: 0.8,
    INITIAL_FUEL: 100,
    CRATER_COUNT: 20,
    SCORE_BASE_LANDING: 2000,
    SCORE_FUEL_BONUS_FACTOR: 15,
    MIN_PAD_WIDTH: 25,
    PAD_WIDTH_BASE: 60,
    SPEED_DISPLAY_FACTOR: 6,
    // --- Added Precision Bonus Config ---
    PRECISION_LOW_FUEL_THRESHOLD: 5, // Fuel level below this gets bonus
    PRECISION_LOW_FUEL_BONUS: 500,   // Bonus points for low fuel landing
    PRECISION_H_SPEED_THRESHOLD: 0.05,// Absolute horizontal speed below this gets bonus
    PRECISION_H_SPEED_BONUS: 350,    // Bonus points for still horizontal landing
    NEAR_MISS_THRESHOLD: 0.05, // How close to death (in m/s) counts as a near miss
    NEAR_MISS_STREAK_MULTIPLIER: 1.5, // Score multiplier per streak
    MAX_NEAR_MISS_STREAK: 5, // Maximum streak multiplier
    NEAR_MISS_COOLDOWN: 2000, // Time in ms between near misses
    ACHIEVEMENTS: {
        PERFECT_LANDING: {
            name: "Perfect Landing",
            description: "Land with less than 0.1 m/s vertical speed",
            threshold: 0.1,
            bonus: 1000
        },
        FUEL_MASTER: {
            name: "Fuel Master",
            description: "Land with less than 5% fuel remaining",
            threshold: 5,
            bonus: 800
        },
        DEATH_DEFYING: {
            name: "Death Defying",
            description: "Survive 5 near misses in one landing",
            threshold: 5,
            bonus: 1500
        }
    }
};

// --- Difficulty Settings --- (Only 'impossible' used now)
const DIFFICULTIES = {
    impossible: {
        fuel: 25,
        padWidthMult: 0.4,
        obstacles: 6,
        gravityMult: 1.6,
        scoreMult: 2.0,
        initialVSpeed: 0.3,
        initialHSpeedRange: 0.4,
        maxVSpeed: 0.35,
        maxHSpeed: 0.35,
        windFactor: 0.0012,
        fuelLeakChance: 0.0005,
        thrusterMalfunctionChance: 0.0003
    }
};

// --- Planet Data ---
// Reflects variables used in style.css for theming
const PLANETS = [
    { name: "Moon", gravityFactor: 1.0, skyGradient: "linear-gradient(to bottom, #000000, #0a0a2a, #1a1a3a)", surfaceGradient: "linear-gradient(to bottom, #222, #555)", surfaceBorder: "#666", padColor: "#aaa", padLightColor: "#ff0", craterInner: "#444", craterOuter: "#222", craterBorder: "#666", obstacleBg: "#777", obstacleBorder: "#444", earthVisible: true, earthBg: "radial-gradient(circle at 30% 30%, #7ebbff, #0055aa)" },
    { name: "Mars", gravityFactor: 2.3, skyGradient: "linear-gradient(to bottom, #4a2a1a, #9d5a3a, #edaa7a)", surfaceGradient: "linear-gradient(to bottom, #8c4b2f, #c76f4a)", surfaceBorder: "#7c3a1f", padColor: "#bbb", padLightColor: "#fcc", craterInner: "#a06040", craterOuter: "#704020", craterBorder: "#502010", obstacleBg: "#a75f3a", obstacleBorder: "#7c3a1f", earthVisible: false, earthBg: "transparent" },
    { name: "Mercury", gravityFactor: 2.3, skyGradient: "linear-gradient(to bottom, #111, #222, #333)", surfaceGradient: "linear-gradient(to bottom, #555, #777)", surfaceBorder: "#444", padColor: "#999", padLightColor: "#fff", craterInner: "#666", craterOuter: "#444", craterBorder: "#333", obstacleBg: "#888", obstacleBorder: "#555", earthVisible: false, earthBg: "transparent" },
    { name: "Venus", gravityFactor: 5.45, skyGradient: "linear-gradient(to bottom, #a38d5a, #d4b67a, #f5d78c)", surfaceGradient: "linear-gradient(to bottom, #7d6d4a, #a08a5b)", surfaceBorder: "#5a4d2a", padColor: "#888", padLightColor: "#ff9", craterInner: "#908050", craterOuter: "#706040", craterBorder: "#504030", obstacleBg: "#b09a6b", obstacleBorder: "#5a4d2a", earthVisible: false, earthBg: "transparent" }
];


// --- Game State ---
let gameState = {
    lander: { x: 0, y: 0, vx: 0, vy: 0, angle: 0, width: 35, height: 50, fuel: CONFIG.INITIAL_FUEL, landed: false, crashed: false, fuelLeaking: false, thrusterMalfunctioning: false, thrusterMalfunctionTimer: 0 },
    controls: { thrust: false, rotateLeft: false, rotateRight: false },
    game: {
        active: false, paused: false, startTime: 0, lastFrameTime: 0, deltaTime: 0,
        width: 0, height: 0, surfaceY: 0,
        pad: { x: 0, y: 0, width: 0, height: 8 },
        initialLevelCompleted: false,
        currentPlanetIndex: 0,
        currentPlanetData: PLANETS[0],
        difficulty: 'impossible',
        difficultySettings: DIFFICULTIES.impossible,
        score: 0, highScores: [], lowFuelWarningPlayed: false,
        nearMissStreak: 0,
        lastNearMissTime: 0,
        lastSpeedLineTime: 0
    },
    particles: [], obstacles: [], sounds: {}, audioContext: null
};

// --- DOM Elements ---
// Populated in initGame based on IDs from index.html
let DOMElements = {};

// --- Audio Handling ---
function initAudio() {
    try {
        gameState.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log("AudioContext initialized.");
        // Sound files can be extended based on needs
        const soundsToLoad = { 'thrust': 'sounds/thrust.ogg', 'explosion': 'sounds/explosion.mp3', 'land_soft': 'sounds/land_soft.wav', 'land_hard': 'sounds/land_hard.wav', 'success': 'sounds/success.wav', 'low_fuel': 'sounds/low_fuel.wav', 'click': 'sounds/click.wav', 'rotate': 'sounds/rotate.wav', /* 'win_fanfare': 'sounds/win.mp3' */};
        for (const name in soundsToLoad) loadSound(name, soundsToLoad[name]);
    } catch (e) { console.error("Web Audio API not supported", e); }
}
async function loadSound(name, url) {
    if (!gameState.audioContext) return;
    try { const response = await fetch(url); if (!response.ok) throw new Error(`HTTP error! status: ${response.status} loading ${url}`); const arrayBuffer = await response.arrayBuffer(); gameState.sounds[name] = { buffer: await gameState.audioContext.decodeAudioData(arrayBuffer), source: null, gainNode: null, loop: false }; console.log(`Sound loaded: ${name}`); }
    catch (error) { console.error(`Error loading sound ${name} from ${url}:`, error); }
}
function playSound(name, loop = false, volume = 1.0) {
    if (!gameState.audioContext || !gameState.sounds[name] || !gameState.sounds[name].buffer) return; if (gameState.audioContext.state === 'suspended') gameState.audioContext.resume(); stopSound(name);
    try { const sound = gameState.sounds[name]; sound.source = gameState.audioContext.createBufferSource(); sound.source.buffer = sound.buffer; sound.loop = loop; sound.source.loop = loop; sound.gainNode = gameState.audioContext.createGain(); sound.gainNode.gain.setValueAtTime(clamp(volume, 0, 1), gameState.audioContext.currentTime); sound.source.connect(sound.gainNode).connect(gameState.audioContext.destination); sound.source.start(0); if (!loop) sound.source.onended = () => { if(sound.source) sound.source.disconnect(); if(sound.gainNode) sound.gainNode.disconnect(); sound.source = null; sound.gainNode = null; }; }
    catch (error) { console.error(`Error playing sound ${name}:`, error); }
}
function stopSound(name) {
     if (gameState.sounds[name]?.source) { try { gameState.sounds[name].source.stop(0); if (gameState.sounds[name].source) gameState.sounds[name].source.disconnect(); if (gameState.sounds[name].gainNode) gameState.sounds[name].gainNode.disconnect(); } catch (error) { /* Ignore */ } finally { gameState.sounds[name].source = null; gameState.sounds[name].gainNode = null; } }
}
 function updateSoundVolume(name, volume) {
     if (gameState.sounds[name]?.gainNode) { try { gameState.sounds[name].gainNode.gain.linearRampToValueAtTime(clamp(volume, 0, 1), gameState.audioContext.currentTime + 0.1); } catch (error) { console.error(`Vol Error ${name}:`, error); } }
 }

// --- Particle System ---
function createParticle(options) {
    if (!DOMElements.container) return; const p = { x: options.x || 0, y: options.y || 0, vx: options.vx || 0, vy: options.vy || 0, life: options.life || 1000, startTime: Date.now(), size: options.size || 5, colorStart: options.colorStart || [255, 255, 255, 1], colorEnd: options.colorEnd || [255, 255, 255, 0], gravity: options.gravity || 0, type: options.type || 'generic', element: document.createElement('div') }; p.element.classList.add('particle'); p.element.style.width = `${p.size}px`; p.element.style.height = `${p.size}px`; if (Array.isArray(p.colorStart) && p.colorStart.length === 4) p.element.style.backgroundColor = `rgba(${p.colorStart.join(',')})`; else p.element.style.backgroundColor = `rgba(255,255,255,1)`; DOMElements.container.appendChild(p.element); gameState.particles.push(p); return p;
}
function updateParticles(deltaTime) {
    const now = Date.now(); for (let i = gameState.particles.length - 1; i >= 0; i--) { const p = gameState.particles[i]; const age = now - p.startTime; if (age >= p.life) { p.element?.remove(); gameState.particles.splice(i, 1); continue; } if (!p.element?.parentNode) { gameState.particles.splice(i, 1); continue; } const dtFactor = deltaTime / 16.667; p.x += p.vx * dtFactor; p.y += p.vy * dtFactor; p.vy += p.gravity * dtFactor; const lifeRatio = clamp(age / p.life, 0, 1); const startColor = Array.isArray(p.colorStart) && p.colorStart.length === 4 ? p.colorStart : [255, 255, 255, 1]; const endColor = Array.isArray(p.colorEnd) && p.colorEnd.length === 4 ? p.colorEnd : [255, 255, 255, 0]; const color = startColor.map((start, index) => start + (endColor[index] - start) * lifeRatio); const size = p.size * (1 - lifeRatio * 0.5); p.element.style.transform = `translate(${p.x - size / 2}px, ${p.y - size / 2}px)`; p.element.style.backgroundColor = `rgba(${color.slice(0,3).map(Math.round).join(',')}, ${clamp(color[3],0,1)})`; p.element.style.width = `${Math.max(1, size)}px`; p.element.style.height = `${Math.max(1, size)}px`; }
}
function createThrustParticles() {
    if (!gameState.game.active || gameState.lander.fuel <= 0 || gameState.lander.thrusterMalfunctioning) return;
    
    const angleRad = degToRad(gameState.lander.angle);
    
    // Main thruster particles
    if (gameState.controls.thrust) {
        const nozzleOffsetY = gameState.lander.height / 2 + 5;
        const rotatedNozzleX = gameState.lander.x - nozzleOffsetY * Math.sin(angleRad);
        const rotatedNozzleY = gameState.lander.y + nozzleOffsetY * Math.cos(angleRad);
        
        createThrusterParticles(rotatedNozzleX, rotatedNozzleY, angleRad + Math.PI, 0.5);
    }
    
    // Side thruster particles
    const sideNozzleOffsetY = gameState.lander.height * 0.2;
    const sideNozzleOffsetX = gameState.lander.width * 0.4;
    
    if (gameState.controls.rotateLeft) {
        const rightNozzleX = gameState.lander.x + (sideNozzleOffsetX * Math.cos(angleRad) - sideNozzleOffsetY * Math.sin(angleRad));
        const rightNozzleY = gameState.lander.y + (sideNozzleOffsetX * Math.sin(angleRad) + sideNozzleOffsetY * Math.cos(angleRad));
        createThrusterParticles(rightNozzleX, rightNozzleY, angleRad - Math.PI/2, 0.3);
    }
    
    if (gameState.controls.rotateRight) {
        const leftNozzleX = gameState.lander.x + (-sideNozzleOffsetX * Math.cos(angleRad) - sideNozzleOffsetY * Math.sin(angleRad));
        const leftNozzleY = gameState.lander.y + (-sideNozzleOffsetX * Math.sin(angleRad) + sideNozzleOffsetY * Math.cos(angleRad));
        createThrusterParticles(leftNozzleX, leftNozzleY, angleRad + Math.PI/2, 0.3);
    }
}

function createThrusterParticles(x, y, angle, intensity) {
    const thrustMag = intensity * (0.5 + Math.random() * 0.5);
    const spread = 0.5;
    
    const thrustColorStart = getComputedStyle(document.documentElement).getPropertyValue('--thrust-color-start').trim();
    const thrustColorEnd = getComputedStyle(document.documentElement).getPropertyValue('--thrust-color-end').trim();
    
    for (let i = 0; i < CONFIG.PARTICLE_COUNT_THRUST; i++) {
        const particleAngle = angle + (Math.random() - 0.5) * spread;
        createParticle({
            x: x,
            y: y,
            vx: gameState.lander.vx + Math.cos(particleAngle) * thrustMag,
            vy: gameState.lander.vy + Math.sin(particleAngle) * thrustMag,
            life: 200 + Math.random() * 200,
            size: 2 + Math.random() * 4,
            colorStart: hexToRgba(thrustColorStart, 1),
            colorEnd: hexToRgba(thrustColorEnd, 0),
            gravity: 0.001,
            type: 'thrust'
        });
    }
}

function createExplosion(x, y) {
    playSound('explosion', false, 0.8);
    
    // Create ground impact effect
    const impact = document.createElement('div');
    impact.className = 'ground-impact';
    impact.style.left = `${x}px`;
    impact.style.bottom = `${gameState.game.height - y}px`;
    DOMElements.container.appendChild(impact);
    
    // Create crater effect
    const crater = document.createElement('div');
    crater.className = 'crater-effect';
    crater.style.left = `${x}px`;
    crater.style.bottom = `${gameState.game.height - y}px`;
    DOMElements.container.appendChild(crater);
    
    // Create dust trail
    for (let i = 0; i < 8; i++) {
        const dust = document.createElement('div');
        dust.className = 'dust-trail';
        dust.style.left = `${x + (Math.random() - 0.5) * 40}px`;
        dust.style.bottom = `${gameState.game.height - y + Math.random() * 20}px`;
        dust.style.animationDelay = `${i * 0.1}s`;
        DOMElements.container.appendChild(dust);
    }
    
    // Reads colors from CSS variables defined in style.css
    const explosionColorStart = getComputedStyle(document.documentElement).getPropertyValue('--explosion-color-start').trim();
    const explosionColorEnd = getComputedStyle(document.documentElement).getPropertyValue('--explosion-color-end').trim();
    
    // Create explosion particles
    for (let i = 0; i < CONFIG.PARTICLE_COUNT_EXPLOSION; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 4;
        createParticle({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: 500 + Math.random() * 1000,
            size: 3 + Math.random() * 5,
            colorStart: hexToRgba(explosionColorStart, 1),
            colorEnd: hexToRgba(explosionColorEnd, 0),
            gravity: CONFIG.GRAVITY_BASE * 0.5,
            type: 'explosion'
        });
    }
    
    // Create lander debris
    for (let i = 0; i < 12; i++) {
        const debris = document.createElement('div');
        debris.className = 'particle debris';
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 3;
        const size = 2 + Math.random() * 4;
        
        debris.style.width = `${size}px`;
        debris.style.height = `${size}px`;
        debris.style.backgroundColor = '#aaa';
        debris.style.left = `${x}px`;
        debris.style.top = `${y}px`;
        
        // Set random rotation
        debris.style.setProperty('--rotation', `${Math.random() * 720 - 360}deg`);
        
        // Set random trajectory
        debris.style.setProperty('--vx', `${Math.cos(angle) * speed * 20}px`);
        debris.style.setProperty('--vy', `${Math.sin(angle) * speed * 20}px`);
        
        DOMElements.container.appendChild(debris);
        
        // Remove debris after animation
        setTimeout(() => debris.remove(), 2000);
    }
    
    // Adds shake effect class from style.css
    if(DOMElements.container) {
        DOMElements.container.classList.add('shake-effect');
        setTimeout(() => DOMElements.container?.classList.remove('shake-effect'), 500);
    }
    
    // Clean up effects after animation
    setTimeout(() => {
        impact?.remove();
        crater?.remove();
    }, 2000);
}
function createDust(x, y, count = CONFIG.PARTICLE_COUNT_DUST) {
    // Reads color from CSS variable defined in style.css
    const dustColor = getComputedStyle(document.documentElement).getPropertyValue('--dust-color').trim();
    for (let i = 0; i < count; i++) { const angle = Math.PI + Math.random() * Math.PI; const speed = 0.2 + Math.random() * 0.8; createParticle({ x: x, y: y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed * 0.5, life: 400 + Math.random() * 600, size: 2 + Math.random() * 3, colorStart: hexToRgba(dustColor, 0.7), colorEnd: hexToRgba(dustColor, 0), gravity: CONFIG.GRAVITY_BASE * 0.2, type: 'dust' }); }
}
function createFuelLeakParticles() {
    if (!gameState.game.active || !gameState.lander.fuelLeaking || gameState.lander.fuel <= 0) return;
    const leakX = gameState.lander.x + (Math.random() - 0.5) * gameState.lander.width * 0.8;
    const leakY = gameState.lander.y + (Math.random() - 0.5) * gameState.lander.height * 0.8;
     createParticle({ x: leakX, y: leakY, vx: gameState.lander.vx + (Math.random() - 0.5) * 0.2, vy: gameState.lander.vy + (Math.random() - 0.5) * 0.2 - 0.1, life: 300 + Math.random() * 300, size: 1 + Math.random() * 2, colorStart: [180, 255, 180, 0.7], colorEnd: [180, 255, 180, 0], gravity: -0.0005, type: 'fuel_leak' });
}

// --- Utilities ---
function hexToRgba(hex, alpha = 1) {
    if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return [255, 255, 255, alpha]; try { const bigint = parseInt(hex.slice(1), 16); return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255, alpha]; } catch (e) { console.error(`Hex Parse Err: ${hex}`, e); return [255, 255, 255, alpha]; }
}

// --- Setup Functions ---
function setupMission() {
    gameState.game.currentPlanetData = PLANETS[gameState.game.currentPlanetIndex];
    const planet = gameState.game.currentPlanetData;
    const difficulty = gameState.game.difficultySettings;
    console.log(`Setting up Mission on ${planet.name}`);

    // Reset lander state
    gameState.lander.vx = (Math.random() - 0.5) * (difficulty.initialHSpeedRange || 0);
    gameState.lander.vy = difficulty.initialVSpeed || 0;
    gameState.lander.angle = 0;
    gameState.lander.fuel = difficulty.fuel;
    gameState.lander.landed = false;
    gameState.lander.crashed = false;
    gameState.lander.fuelLeaking = false;
    gameState.lander.thrusterMalfunctioning = false;
    gameState.lander.thrusterMalfunctionTimer = 0;
    gameState.game.lowFuelWarningPlayed = false;

    gameState.lander.x = gameState.game.width / 2;
    gameState.lander.y = gameState.game.height * (1 - CONFIG.INITIAL_ALTITUDE);

    // Apply planet theme by setting CSS variables from style.css
    const rootStyle = document.documentElement.style;
    rootStyle.setProperty('--sky-gradient', planet.skyGradient);
    rootStyle.setProperty('--surface-gradient', planet.surfaceGradient);
    rootStyle.setProperty('--surface-border-color', planet.surfaceBorder);
    rootStyle.setProperty('--pad-bg-color', planet.padColor);
    rootStyle.setProperty('--pad-light-color', planet.padLightColor);
    rootStyle.setProperty('--crater-inner-color', planet.craterInner);
    rootStyle.setProperty('--crater-outer-color', planet.craterOuter);
    rootStyle.setProperty('--crater-border-color', planet.craterBorder);
    rootStyle.setProperty('--obstacle-bg-color', planet.obstacleBg);
    rootStyle.setProperty('--obstacle-border-color', planet.obstacleBorder);
    rootStyle.setProperty('--earth-display', planet.earthVisible ? 'block' : 'none');
    rootStyle.setProperty('--earth-bg', planet.earthBg);

    createCraters(); // Recreate craters for the current theme

    // Position landing pad (element from index.html)
    const minPadX = 0.2; const maxPadX = 0.8;
    const padXPercent = minPadX + Math.random() * (maxPadX - minPadX);
    gameState.game.pad.width = Math.max(CONFIG.MIN_PAD_WIDTH, CONFIG.PAD_WIDTH_BASE * difficulty.padWidthMult);
    gameState.game.pad.x = gameState.game.width * padXPercent;
    gameState.game.pad.y = gameState.game.surfaceY;
    if (DOMElements.pad) {
        DOMElements.pad.style.width = `${gameState.game.pad.width}px`;
        DOMElements.pad.style.left = `${gameState.game.pad.x}px`;
    }

    // Create obstacles (elements styled by style.css, appended to container from index.html)
    gameState.obstacles.forEach(obs => obs.element?.remove());
    gameState.obstacles = [];
    gameState.particles.forEach(p => p.element?.remove());
    gameState.particles = [];
    const numObstacles = Math.floor(difficulty.obstacles * (1 + gameState.game.currentPlanetIndex * 0.5));
    const surfaceWidth = gameState.game.width;
    const surfaceHeight = gameState.game.height - gameState.game.surfaceY;
    for (let i = 0; i < numObstacles; i++) {
        const obs = { width: 15 + Math.random() * 25, height: 8 + Math.random() * 20, rotation: Math.random() * 360, element: document.createElement('div') };
        let obsX, obsY, attempts = 0;
        do {
            obsX = Math.random() * surfaceWidth;
            obsY = gameState.game.surfaceY + Math.random() * (surfaceHeight - obs.height);
            attempts++;
            if (attempts > 50) break; // Avoid infinite loops
        } while (obsX + obs.width > gameState.game.pad.x - gameState.game.pad.width * 1.5 && obsX < gameState.game.pad.x + gameState.game.pad.width * 1.5); // Avoid placing on/near pad

        if(attempts <= 50) {
            obs.element.classList.add('obstacle'); // Add class from style.css
            obs.element.style.width = `${obs.width}px`;
            obs.element.style.height = `${obs.height}px`;
            obs.element.style.left = `${obsX}px`;
            obs.element.style.bottom = `${gameState.game.height - (obsY + obs.height)}px`;
            obs.element.style.setProperty('--obstacle-rotation', `${obs.rotation}deg`); // Set CSS variable for rotation
            obs.x = obsX; obs.y = obsY;
            if(DOMElements.container) {
                DOMElements.container.insertBefore(obs.element, DOMElements.pad); // Insert before pad in DOM
                gameState.obstacles.push(obs);
            }
        }
    }
    updateUI(); // Update dashboard (elements from index.html)
    if(DOMElements.planetDisplay) DOMElements.planetDisplay.textContent = planet.name; // Update planet name display
    if(DOMElements.dashboardTitle) DOMElements.dashboardTitle.textContent = `${planet.name.toUpperCase()} MISSION`; // Update dashboard title
}

// Function to display planet progression (uses elements from index.html)
function displayPlanetProgression() {
    if (!DOMElements.planetList) return;
    DOMElements.planetList.innerHTML = '';
    const currentLevelTargetPlanetIndex = gameState.game.currentPlanetIndex;
    PLANETS.forEach((planet, index) => {
        const planetDiv = document.createElement('div');
        planetDiv.classList.add('planet-status'); // Base class from style.css
        planetDiv.textContent = planet.name;
        if (index <= gameState.game.currentPlanetIndex) {
            planetDiv.classList.add('unlocked'); // Add 'unlocked' class from style.css
            if (index === currentLevelTargetPlanetIndex) {
                planetDiv.classList.add('current'); // Add 'current' class from style.css
                planetDiv.textContent += ' (Current)';
            }
        } else {
             planetDiv.textContent += ' (Locked)';
        }
        DOMElements.planetList.appendChild(planetDiv);
    });
}

// --- Star/Crater/Parallax Functions ---
// These create elements styled by style.css and append them to containers from index.html
function createStars() { if (DOMElements.starsBg) createStarLayer(DOMElements.starsBg, CONFIG.STAR_COUNT_BG, 1, 1.5); if (DOMElements.starsMg) createStarLayer(DOMElements.starsMg, CONFIG.STAR_COUNT_MG, 1.5, 2.5); if (DOMElements.starsFg) createStarLayer(DOMElements.starsFg, CONFIG.STAR_COUNT_FG, 2, 3.5); }
function createStarLayer(container, count, minSize, maxSize) { if (!container) return; container.innerHTML = ''; const fragment = document.createDocumentFragment(); for (let i = 0; i < count; i++) { const star = document.createElement('div'); const size = Math.random() * (maxSize - minSize) + minSize; star.classList.add('star'); star.style.width = `${size}px`; star.style.height = star.style.width; const leftPercent = Math.random() * 100; const topPercent = Math.random() * 100; star.style.left = `${leftPercent}%`; star.style.top = `${topPercent}%`; star.style.animationDelay = `${Math.random() * 3}s`; star.dataset.initialLeft = leftPercent; star.dataset.initialTop = topPercent; fragment.appendChild(star); } container.appendChild(fragment); }
function createCraters() { if (!DOMElements.surface) return; $$('.crater').forEach(c => c.remove()); const sw = DOMElements.surface.clientWidth, sh = DOMElements.surface.clientHeight; if(sw <= 0 || sh <= 0) return; const fragment = document.createDocumentFragment(); for (let i = 0; i < CONFIG.CRATER_COUNT; i++) { const crater = document.createElement('div'); const size = Math.random() * (sw * 0.05) + (sw * 0.01); crater.classList.add('crater'); crater.style.width = `${size}px`; crater.style.height = `${size * (0.6 + Math.random() * 0.4)}px`; crater.style.left = `${Math.random() * 100}%`; const topPercent = Math.random() * Math.max(0, 100 - (size / sh * 100)); crater.style.top = `${topPercent}%`; fragment.appendChild(crater); } DOMElements.surface.appendChild(fragment); }
function updateParallax() { const dx = gameState.lander.x - gameState.game.width / 2; const dy = gameState.lander.y - gameState.game.height * (1 - CONFIG.INITIAL_ALTITUDE); if (DOMElements.starsBg) applyParallax(DOMElements.starsBg, dx, dy, CONFIG.PARALLAX_FACTOR_BG); if (DOMElements.starsMg) applyParallax(DOMElements.starsMg, dx, dy, CONFIG.PARALLAX_FACTOR_MG); if (DOMElements.starsFg) applyParallax(DOMElements.starsFg, dx, dy, CONFIG.PARALLAX_FACTOR_FG); }
function applyParallax(container, dx, dy, factor) { const px = (dx / gameState.game.width) * factor * 50; const py = (dy / gameState.game.height) * factor * 50; container.style.transform = `translate(${-px}%, ${-py}%)`; }

// --- Input Handling ---
function handleKeyDown(e) { if(e.key.toLowerCase() === 'p' && gameState.game.startTime > 0) { togglePause(); e.preventDefault(); return; } if (!gameState.game.active || gameState.game.paused) { if (e.key === 'Enter' && !gameState.game.active && DOMElements.startScreen?.style.display !== 'none') { playSound('click'); startGame(); e.preventDefault(); } return; } let action = false; switch (e.key) { case 'ArrowUp': case ' ': if (!gameState.controls.thrust && !gameState.lander.thrusterMalfunctioning) { gameState.controls.thrust = true; playSound('thrust', true, 0.5); } action = true; break; case 'ArrowLeft': if (!gameState.controls.rotateLeft) { gameState.controls.rotateLeft = true; playSound('rotate', false, 0.3); } action = true; break; case 'ArrowRight': if (!gameState.controls.rotateRight) { gameState.controls.rotateRight = true; playSound('rotate', false, 0.3); } action = true; break; } if (action || ['ArrowDown'].includes(e.key)) e.preventDefault(); }
function handleKeyUp(e) { switch (e.key) { case 'ArrowUp': case ' ': if (gameState.controls.thrust) stopSound('thrust'); gameState.controls.thrust = false; break; case 'ArrowLeft': gameState.controls.rotateLeft = false; break; case 'ArrowRight': gameState.controls.rotateRight = false; break; } }
function togglePause() {
    if (gameState.game.startTime === 0 || gameState.lander.crashed || gameState.lander.landed) return;
    gameState.game.paused = !gameState.game.paused;
     if (gameState.game.paused) {
        if (gameState.sounds.thrust?.source) try { gameState.sounds.thrust.source.playbackRate.setValueAtTime(0.0001, gameState.audioContext.currentTime); } catch(e){}
        // Show message overlay (elements from index.html)
        if(DOMElements.messageOverlay) DOMElements.messageOverlay.style.display = 'flex'; if(DOMElements.messageContainer) DOMElements.messageContainer.style.display = 'block';
        if(DOMElements.messageTitle) DOMElements.messageTitle.textContent = "Paused"; if(DOMElements.messageText) DOMElements.messageText.textContent = "Press P to resume.";
        // Hide irrelevant message elements
        if(DOMElements.messageScore) DOMElements.messageScore.style.display = 'none'; if(DOMElements.messageHighscore) DOMElements.messageHighscore.style.display = 'none';
        if(DOMElements.nextPlanetBtn) DOMElements.nextPlanetBtn.style.display = 'none';
        if(DOMElements.restartBtn) DOMElements.restartBtn.style.display = 'none'; if(DOMElements.mainMenuBtn) DOMElements.mainMenuBtn.style.display = 'inline-block';
        if(DOMElements.sillySuccessGraphic) DOMElements.sillySuccessGraphic.style.display = 'none';
        cancelAnimationFrame(gameLoopHandle); console.log("Paused");
    } else {
        if (gameState.sounds.thrust?.source) try { gameState.sounds.thrust.source.playbackRate.setValueAtTime(1.0, gameState.audioContext.currentTime); } catch(e){}
        // Hide message overlay
        if(DOMElements.messageOverlay) DOMElements.messageOverlay.style.display = 'none';
        // Restore normal message element displays if needed (though typically hidden)
        if(DOMElements.messageScore) DOMElements.messageScore.style.display = 'block'; if(DOMElements.messageHighscore) DOMElements.messageHighscore.style.display = 'block';
        gameState.game.lastFrameTime = performance.now(); gameLoopHandle = requestAnimationFrame(gameLoop); console.log("Resumed");
    }
}

// --- Game Logic ---
function updatePhysics(deltaTime) {
    if (gameState.lander.landed || gameState.lander.crashed) return;
    const dt = clamp(deltaTime / 16.667, 0.1, 5);
    const difficulty = gameState.game.difficultySettings;

    // Rotation and Side Thrust
    let rotationAmount = 0;
    const SIDE_THRUST_POWER = CONFIG.THRUST_POWER * 0.4; // Side thrusters are 40% as powerful as main
    
    if (gameState.controls.rotateLeft && gameState.lander.fuel > 0) {
        rotationAmount = -CONFIG.ROTATION_SPEED * dt;
        gameState.lander.fuel -= CONFIG.FUEL_CONSUMPTION_ROTATE * dt;
        // Add horizontal movement for left rotation
        gameState.lander.vx -= SIDE_THRUST_POWER * dt;
        if (!gameState.sounds.thrust?.source) playSound('thrust', true, 0.3);
    }
    if (gameState.controls.rotateRight && gameState.lander.fuel > 0) {
        rotationAmount = CONFIG.ROTATION_SPEED * dt;
        gameState.lander.fuel -= CONFIG.FUEL_CONSUMPTION_ROTATE * dt;
        // Add horizontal movement for right rotation
        gameState.lander.vx += SIDE_THRUST_POWER * dt;
        if (!gameState.sounds.thrust?.source) playSound('thrust', true, 0.3);
    }
    if (!gameState.controls.rotateLeft && !gameState.controls.rotateRight && !gameState.controls.thrust) {
        stopSound('thrust');
    }
    
    gameState.lander.angle = (gameState.lander.angle + rotationAmount) % 360;

    // Main Thrust
    if (gameState.controls.thrust && gameState.lander.fuel > 0 && !gameState.lander.thrusterMalfunctioning) {
        const angleRad = degToRad(gameState.lander.angle);
        gameState.lander.vx += Math.sin(angleRad) * CONFIG.THRUST_POWER * dt;
        gameState.lander.vy -= Math.cos(angleRad) * CONFIG.THRUST_POWER * dt;
        gameState.lander.fuel -= CONFIG.FUEL_CONSUMPTION_THRUST * dt;
        if (!gameState.sounds.thrust?.source) playSound('thrust', true, 0.5);
        createThrustParticles();
    }

    // Gravity & Wind
    const currentGravity = CONFIG.GRAVITY_BASE * gameState.game.currentPlanetData.gravityFactor * difficulty.gravityMult;
    gameState.lander.vy += currentGravity * dt;
    const wind = (Math.random() - 0.48) * difficulty.windFactor * dt;
    gameState.lander.vx += wind;

    // Fuel Leak
    if (gameState.lander.fuelLeaking && gameState.lander.fuel > 0) {
        gameState.lander.fuel -= 0.05 * dt;
        createFuelLeakParticles();
    }

    // Update Position
    gameState.lander.x += gameState.lander.vx * dt;
    gameState.lander.y += gameState.lander.vy * dt;

    // Fuel Management
    gameState.lander.fuel = Math.max(0, gameState.lander.fuel);
    if(gameState.lander.fuel <= 0 && gameState.controls.thrust) stopSound('thrust');
    // Low fuel warning sound
    if (!gameState.game.lowFuelWarningPlayed && gameState.lander.fuel < 20 && gameState.lander.fuel > 0) {
        playSound('low_fuel', false, 0.7);
        gameState.game.lowFuelWarningPlayed = true;
        // Could add visual cue via CSS class on fuel bar
    }

    // Wall collision
    if (gameState.lander.x < gameState.lander.width / 2) {
        gameState.lander.x = gameState.lander.width / 2;
        gameState.lander.vx *= -0.2; // Bounce slightly
    } else if (gameState.lander.x > gameState.game.width - gameState.lander.width / 2) {
        gameState.lander.x = gameState.game.width - gameState.lander.width / 2;
        gameState.lander.vx *= -0.2;
    }

    // Add thruster effects update
    updateThrusterEffects();

    // Add visual effects update
    updateDangerEffects();
}

function checkCollisions() {
    if (gameState.lander.landed || gameState.lander.crashed) return;

    // Simplified lander bounds calculation (could be more precise using rotated corners)
    const angleRad=degToRad(gameState.lander.angle), cosA=Math.cos(angleRad), sinA=Math.sin(angleRad), halfW=gameState.lander.width/2, halfH=gameState.lander.height/2; const corners=[{x:-halfW,y:halfH},{x:halfW,y:halfH},{x:-halfW,y:-halfH},{x:halfW,y:-halfH}]; const worldCorners=corners.map(c=>({x:gameState.lander.x+(c.x*cosA-c.y*sinA),y:gameState.lander.y+(c.x*sinA+c.y*cosA)})); const landerBottomY=Math.max(...worldCorners.map(c=>c.y)), landerTopY=Math.min(...worldCorners.map(c=>c.y)), landerLeftX=Math.min(...worldCorners.map(c=>c.x)), landerRightX=Math.max(...worldCorners.map(c=>c.x));

    const impactVSpeed = gameState.lander.vy;
    const impactHSpeed = gameState.lander.vx;
    let impactAngle = gameState.lander.angle % 360; if(impactAngle>180)impactAngle-=360; if(impactAngle<-180)impactAngle+=360; const impactRotation = Math.abs(impactAngle);

    // Surface collision
    if(landerBottomY >= gameState.game.surfaceY){
        gameState.lander.y -= (landerBottomY - gameState.game.surfaceY); // Correct position

        const padLeft=gameState.game.pad.x-gameState.game.pad.width/2, padRight=gameState.game.pad.x+gameState.game.pad.width/2;
        const overlapsPadHorizontally=landerRightX > padLeft && landerLeftX < padRight;

        const maxV = gameState.game.difficultySettings.maxVSpeed;
        const maxH = gameState.game.difficultySettings.maxHSpeed;
        const maxRot = CONFIG.MAX_LANDING_ROTATION;

        // Check landing conditions
        if(overlapsPadHorizontally && impactVSpeed <= maxV && Math.abs(impactHSpeed) <= maxH && impactRotation <= maxRot){
            gameState.lander.landed = true;
            gameState.lander.vy = 0; gameState.lander.vx = 0; gameState.lander.angle = 0; // Stabilize
            gameState.lander.y = gameState.game.surfaceY - gameState.lander.height / 2; // Set final position
            createDust(gameState.lander.x, gameState.game.surfaceY); // Visual effect
            // Landing sounds
            if(impactVSpeed < maxV * 0.5 && gameState.sounds['land_soft']) playSound('land_soft',false,0.7); else if(gameState.sounds['land_hard']) playSound('land_hard',false,0.7); else if(gameState.sounds['land_soft']) playSound('land_soft',false,0.7);
            playSound('success',false,0.8);
            endGame(true, "", { impactVSpeed, impactHSpeed, impactRotation }); // Pass impact data for scoring
        } else {
            // Crash
            gameState.lander.crashed = true;
            createExplosion(gameState.lander.x, gameState.game.surfaceY);
            DOMElements.lander?.style.setProperty('display','none'); // Hide lander element from index.html
            let reason = "Crashed!";
            if (!overlapsPadHorizontally) reason = "Missed the pad!";
            else if (impactVSpeed > maxV) reason = `Too fast vertically! (${(impactVSpeed * CONFIG.SPEED_DISPLAY_FACTOR).toFixed(1)} > ${(maxV*CONFIG.SPEED_DISPLAY_FACTOR).toFixed(1)} m/s)`;
            else if (Math.abs(impactHSpeed) > maxH) reason = `Too fast horizontally! (${(Math.abs(impactHSpeed)*CONFIG.SPEED_DISPLAY_FACTOR).toFixed(1)} > ${(maxH*CONFIG.SPEED_DISPLAY_FACTOR).toFixed(1)} m/s)`;
            else if (impactRotation > maxRot) reason = `Tilted too much! (${impactRotation.toFixed(0)} > ${maxRot} deg)`;
            else reason = "Bad landing!";
            endGame(false, reason);
        }
        return; // Collision handled
    }

    // Obstacle collision
    const landerRect={left:landerLeftX,right:landerRightX,top:landerTopY,bottom:landerBottomY};
    for(const obs of gameState.obstacles){
        const obsRect={left:obs.x,right:obs.x+obs.width,top:obs.y,bottom:obs.y+obs.height};
        // Basic AABB collision check
        if(landerRect.right > obsRect.left && landerRect.left < obsRect.right &&
           landerRect.bottom > obsRect.top && landerRect.top < obsRect.bottom)
        {
            gameState.lander.crashed = true;
            createExplosion((landerRect.left + landerRect.right)/2, (landerRect.top + landerRect.bottom)/2);
            DOMElements.lander?.style.setProperty('display','none'); // Hide lander
            endGame(false,"Collided with an obstacle!");
            return; // Collision handled
        }
    }

    // Add near-miss detection
    if (!gameState.lander.crashed && !gameState.lander.landed) {
        const distanceToPad = Math.abs(gameState.lander.y - gameState.game.pad.y);
        const speed = Math.sqrt(gameState.lander.vx * gameState.lander.vx + gameState.lander.vy * gameState.lander.vy);
        
        if (distanceToPad < 100 && speed > CONFIG.MAX_LANDING_SPEED * 0.8) {
            applyScreenShake();
            gameState.game.nearMissStreak++;
            // ... rest of near-miss handling ...
        }
    }
}

// --- UI Update ---
// Updates DOM elements from index.html and applies classes from style.css
function updateUI() { if ((!gameState.game.active && DOMElements.startScreen?.style.display !== 'none') || !DOMElements.lander) return; DOMElements.lander.style.left = `${gameState.lander.x-gameState.lander.width/2}px`; DOMElements.lander.style.top = `${gameState.lander.y-gameState.lander.height/2}px`; DOMElements.lander.style.transform = `rotate(${gameState.lander.angle}deg)`; const altitude = Math.max(0, gameState.game.surfaceY-(gameState.lander.y+gameState.lander.height/2)); const vSpeed=gameState.lander.vy, hSpeed=gameState.lander.vx; let displayAngle=gameState.lander.angle%360; if(displayAngle>180) displayAngle-=360; if(displayAngle<-180) displayAngle+=360; const rotation=displayAngle; const speedFactor=CONFIG.SPEED_DISPLAY_FACTOR; if(DOMElements.altitude) DOMElements.altitude.textContent=`${Math.round(altitude)} m`; if(DOMElements.vSpeed) DOMElements.vSpeed.textContent=`${(vSpeed*speedFactor).toFixed(1)} m/s`; if(DOMElements.hSpeed) DOMElements.hSpeed.textContent=`${(hSpeed*speedFactor).toFixed(1)} m/s`; if(DOMElements.rotation) DOMElements.rotation.textContent=`${Math.round(rotation)} deg`; if(DOMElements.fuelLevel) DOMElements.fuelLevel.style.width=`${clamp(gameState.lander.fuel,0,100)}%`; if(DOMElements.planetDisplay) DOMElements.planetDisplay.textContent=gameState.game.currentPlanetData.name; if(DOMElements.altitude) updateDisplayColor(DOMElements.altitude, altitude, 100, 50); if(DOMElements.vSpeed) updateDisplayColor(DOMElements.vSpeed, vSpeed, gameState.game.difficultySettings.maxVSpeed, gameState.game.difficultySettings.maxVSpeed*2, true); if(DOMElements.hSpeed) updateDisplayColor(DOMElements.hSpeed, Math.abs(hSpeed), gameState.game.difficultySettings.maxHSpeed, gameState.game.difficultySettings.maxHSpeed*2); if(DOMElements.rotation) updateDisplayColor(DOMElements.rotation, Math.abs(rotation), CONFIG.MAX_LANDING_ROTATION, CONFIG.MAX_LANDING_ROTATION*2); }
function updateDisplayColor(element, value, goodThreshold, warnThreshold, checkLower = false) { if (!element) return; element.classList.remove('good','warning','critical'); if(checkLower) { if(value<=goodThreshold) element.classList.add('good'); else if(value<=warnThreshold) element.classList.add('warning'); else element.classList.add('critical'); } else { if(value>=goodThreshold) element.classList.add('good'); else if(value>=warnThreshold) element.classList.add('warning'); else element.classList.add('critical'); } }

// --- Game Flow ---
let gameLoopHandle;
function gameLoop(timestamp) {
    if (!gameState.game.active) return;
    if(gameState.game.paused) { // Handle pause state
        gameLoopHandle = requestAnimationFrame(gameLoop);
        return;
    }
    if (!gameState.game.startTime) gameState.game.startTime = timestamp;
    if (!gameState.game.lastFrameTime) gameState.game.lastFrameTime = timestamp;
    gameState.game.deltaTime = Math.max(1, timestamp - gameState.game.lastFrameTime); // Calculate delta time, ensure minimum
    gameState.game.lastFrameTime = timestamp;

    try { // Wrap core logic in try-catch for robustness
        updatePhysics(gameState.game.deltaTime);
        checkCollisions();
        updateParticles(gameState.game.deltaTime);
        updateParallax();
        updateUI();
        updateLandingGuides(); // Add this line
    } catch (error) {
        console.error("Critical Error in Game Loop:", error);
        gameState.game.active = false; // Stop game on critical error
        alert("A critical game error occurred. Please check the console.");
        endGame(false, "Critical game error!"); // End game gracefully
        return;
    }

    if (gameState.game.active) { // Request next frame if game is still active
        gameLoopHandle = requestAnimationFrame(gameLoop);
    }
}

// Starts the game, interacts with start screen elements from index.html
function startGame() {
    console.log("Attempting mission...");
    try {
        // Ensure essential DOM elements exist
        if (!DOMElements.startScreen || !DOMElements.lander) throw new Error("DOM elements missing");
        DOMElements.startScreen.style.display='none'; // Hide start screen
        DOMElements.messageOverlay.style.display='none'; // Ensure message overlay is hidden
        DOMElements.lander.style.display='block'; // Show lander
        loadCompletionStatus(); // Load saved progress
        gameState.game.score = 0; // Reset score
        gameState.game.active = true;
        gameState.game.paused = false;
        gameState.game.startTime = 0;
        gameState.game.lastFrameTime = 0;
        gameState.game.lowFuelWarningPlayed = false;
        if (!gameState.game.initialLevelCompleted) { // Start on Moon if not completed
            gameState.game.currentPlanetIndex = 0;
        }
        gameState.game.difficulty = 'impossible'; // Set difficulty
        gameState.game.difficultySettings = DIFFICULTIES.impossible;
        setupMission(); // Set up current planet environment
        loadHighScores(); // Load scores
        displayHighScores(); // Display scores (uses elements from index.html)
        // Show planet progression if unlocked (uses elements from index.html)
        if(DOMElements.planetProgression) DOMElements.planetProgression.style.display = gameState.game.initialLevelCompleted ? 'block' : 'none';
        displayPlanetProgression(); // Update planet list display
        // Reset controls state
        gameState.controls.thrust = false;
        gameState.controls.rotateLeft = false;
        gameState.controls.rotateRight = false;
        // Resume audio context if suspended
        if(gameState.audioContext?.state === 'suspended') {
            gameState.audioContext.resume().catch(e => console.error("Audio context resume failed:", e));
        }
        console.log("Starting game loop...");
        cancelAnimationFrame(gameLoopHandle); // Ensure no duplicate loops
        gameState.game.lastFrameTime = performance.now(); // Reset timer
        gameLoopHandle = requestAnimationFrame(gameLoop); // Start the loop
        console.log("Mission initiated.");
    } catch (error) {
        console.error("Error starting game:", error);
        alert("Failed to start the mission. Check console for details.");
        gameState.game.active = false;
        if(DOMElements.startScreen) DOMElements.startScreen.style.display = 'flex'; // Show start screen again on error
    }
}

// Ends the game, displays results in message overlay from index.html
function endGame(success, message = "", impactData = null) { // Added impactData parameter for scoring
     if (!gameState.game.active && !gameState.game.paused) return; // Prevent multiple calls

     gameState.game.active = false; // Stop game logic
     cancelAnimationFrame(gameLoopHandle); // Stop loop
     stopSound('thrust'); // Stop engine sound

     const planetName = gameState.game.currentPlanetData.name;
     let levelScore = 0;
     let displayMessage = "";
     let awardedBonusMessage = ""; // To store messages about bonuses

     if (success) {
         // Base score + fuel bonus
         levelScore = CONFIG.SCORE_BASE_LANDING + Math.max(0, gameState.lander.fuel) * CONFIG.SCORE_FUEL_BONUS_FACTOR;

         // --- Apply Precision Bonuses based on CONFIG ---
         if (gameState.lander.fuel < CONFIG.PRECISION_LOW_FUEL_THRESHOLD) {
             levelScore += CONFIG.PRECISION_LOW_FUEL_BONUS;
             awardedBonusMessage += ` Low Fuel Bonus! (+${CONFIG.PRECISION_LOW_FUEL_BONUS})`;
         }
         // Check H Speed Bonus using impactData if available
         if (impactData && Math.abs(impactData.impactHSpeed) < CONFIG.PRECISION_H_SPEED_THRESHOLD) {
            levelScore += CONFIG.PRECISION_H_SPEED_BONUS;
            awardedBonusMessage += ` Still Landing Bonus! (+${CONFIG.PRECISION_H_SPEED_BONUS})`;
         }
         // ------------------------------

         levelScore = Math.max(50, Math.round(levelScore * gameState.game.difficultySettings.scoreMult)); // Apply difficulty multiplier
         gameState.game.score += levelScore; // Add to total score

         displayMessage = `Flawless landing on ${planetName}! Incredible skill! ${awardedBonusMessage.trim()}`; // Add bonus message

         // Handle initial completion (unlocking other planets)
         if (!gameState.game.initialLevelCompleted && gameState.game.currentPlanetIndex === 0) {
             gameState.game.initialLevelCompleted = true;
             saveCompletionStatus(); // Save progress
             displayMessage += ` You've proven your mettle. Other planets are now accessible!`;
             console.log("Initial Impossible Level Completed!");
             // Show silly graphic (element from index.html)
             if(DOMElements.sillySuccessGraphic) DOMElements.sillySuccessGraphic.style.display = 'block';
         } else {
             displayMessage += ` Prepare for the next challenge.`;
             if(DOMElements.sillySuccessGraphic) DOMElements.sillySuccessGraphic.style.display = 'none';
         }

         // Add streak bonus to score
         const streakMultiplier = Math.min(
             CONFIG.MAX_NEAR_MISS_STREAK,
             1 + (gameState.game.nearMissStreak * CONFIG.NEAR_MISS_STREAK_MULTIPLIER)
         );
         levelScore = Math.round(levelScore * streakMultiplier);
         
         if (gameState.game.nearMissStreak > 0) {
             awardedBonusMessage += ` Near Miss Streak x${gameState.game.nearMissStreak}!`;
         }

         // Check for achievements
         const achievements = checkAchievements(impactData);
         if (achievements.length > 0) {
             // Add achievement bonuses
             achievements.forEach(achievement => {
                 levelScore += achievement.bonus;
                 awardedBonusMessage += ` ${achievement.name} Bonus! (+${achievement.bonus})`;
                 
                 // Generate and show share button
                 const shareBtn = document.createElement('button');
                 shareBtn.className = 'share-achievement-btn';
                 shareBtn.textContent = `Share ${achievement.name}`;
                 shareBtn.onclick = () => {
                     const imageUrl = generateShareableAchievement(achievement, gameState.game.score);
                     // Create temporary link to download/share
                     const link = document.createElement('a');
                     link.download = `impossible-lander-${achievement.name.toLowerCase().replace(/\s+/g, '-')}.png`;
                     link.href = imageUrl;
                     link.click();
                 };
                 
                 if (DOMElements.messageContainer) {
                     DOMElements.messageContainer.appendChild(shareBtn);
                 }
             });
         }

     } else { // Crash
         levelScore = 0;
         displayMessage = message || `Crashed on ${planetName}!`;
         if(DOMElements.sillySuccessGraphic) DOMElements.sillySuccessGraphic.style.display = 'none';
         // Reset streak on crash
         gameState.game.nearMissStreak = 0;
     }

     // Show message overlay (element from index.html)
     if(DOMElements.messageOverlay) DOMElements.messageOverlay.style.display = 'flex';
     if(DOMElements.messageContainer) DOMElements.messageContainer.style.display = 'block';

     // Update message content (elements from index.html)
     if(DOMElements.messageTitle){
         DOMElements.messageTitle.textContent = success ? `Landed on ${planetName}!` : `Mission Failed on ${planetName}!`;
         DOMElements.messageTitle.style.color = success ? 'var(--good-color)' : 'var(--critical-color)'; // Use colors from style.css
     }
     if(DOMElements.messageText) DOMElements.messageText.textContent = displayMessage;
     if(DOMElements.messageScore){
         DOMElements.messageScore.textContent = `Attempt Score: ${levelScore} | Total Score: ${gameState.game.score}`;
         DOMElements.messageScore.style.display = 'block';
     }

     // Handle high scores
     let isNewHighScore = false;
     if (gameState.game.score > 0) {
         isNewHighScore = checkAndSaveHighScore(gameState.game.score); // Check/save score
     }
     // Display high score message (element from index.html)
     if(DOMElements.messageHighscore){
         DOMElements.messageHighscore.textContent = isNewHighScore ? "New High Score!" : "";
         DOMElements.messageHighscore.style.display = isNewHighScore ? 'block' : 'none';
         if(isNewHighScore) displayHighScores(); // Update high score list if new score
     }

     // Show/hide 'Next Planet' button (element from index.html)
     const showNextPlanet = success && gameState.game.initialLevelCompleted && gameState.game.currentPlanetIndex < PLANETS.length - 1;
     if(DOMElements.nextPlanetBtn) DOMElements.nextPlanetBtn.style.display = showNextPlanet ? 'inline-block' : 'none';

     // Show/update 'Restart/Try Again' and 'Main Menu' buttons (elements from index.html)
     if(DOMElements.restartBtn){
         DOMElements.restartBtn.textContent = success ? 'Replay Planet' : 'Try Again';
         DOMElements.restartBtn.style.display = 'inline-block';
     }
     if(DOMElements.mainMenuBtn) DOMElements.mainMenuBtn.style.display = 'inline-block';

     /* AD Placeholder - Potential integration point */
}

// Function to proceed to the next planet
function goToNextPlanet() {
    playSound('click');
    gameState.game.currentPlanetIndex = (gameState.game.currentPlanetIndex + 1) % PLANETS.length; // Move to next planet index
    saveCompletionStatus(); // Save progress

    // Reset UI for next level
    if (DOMElements.messageOverlay) DOMElements.messageOverlay.style.display = 'none';
    if (DOMElements.lander) DOMElements.lander.style.display = 'block'; // Ensure lander is visible
    if (DOMElements.sillySuccessGraphic) DOMElements.sillySuccessGraphic.style.display = 'none';

    // Reset game state for next level
    gameState.game.active = true;
    gameState.game.paused = false;
    gameState.game.startTime = 0;
    gameState.game.lastFrameTime = 0;
    gameState.game.lowFuelWarningPlayed = false;

    setupMission(); // Set up the new planet

    // Reset controls
    gameState.controls.thrust = false;
    gameState.controls.rotateLeft = false;
    gameState.controls.rotateRight = false;

    /* AD Placeholder */
    // Restart game loop
    cancelAnimationFrame(gameLoopHandle);
    gameState.game.lastFrameTime = performance.now();
    gameLoopHandle = requestAnimationFrame(gameLoop);
}

// Function to restart the current mission
function restartMission() {
    playSound('click');
    // Reset UI
    if (DOMElements.messageOverlay) DOMElements.messageOverlay.style.display = 'none';
    if (DOMElements.lander) DOMElements.lander.style.display = 'block';
    if (DOMElements.sillySuccessGraphic) DOMElements.sillySuccessGraphic.style.display = 'none';

    // Reset game state
    gameState.game.active = true;
    gameState.game.paused = false;
    gameState.game.startTime = 0;
    gameState.game.lastFrameTime = 0;
    gameState.game.lowFuelWarningPlayed = false;
    // Note: Score is NOT reset here, only on starting a brand new game via main menu

    setupMission(); // Reset the current planet

    // Reset controls
    gameState.controls.thrust = false;
    gameState.controls.rotateLeft = false;
    gameState.controls.rotateRight = false;

    /* AD Placeholder */
    // Restart game loop
    cancelAnimationFrame(gameLoopHandle);
    gameState.game.lastFrameTime = performance.now();
    gameLoopHandle = requestAnimationFrame(gameLoop);
}

// Function to return to the main menu (start screen from index.html)
function goToMainMenu() {
    console.log("Returning to Main Menu...");
    playSound('click');
    // Stop game
    gameState.game.active = false;
    gameState.game.paused = false;
    cancelAnimationFrame(gameLoopHandle);
    stopSound('thrust');
    // Reset UI elements
    if (DOMElements.messageOverlay) DOMElements.messageOverlay.style.display = 'none';
    if (DOMElements.sillySuccessGraphic) DOMElements.sillySuccessGraphic.style.display = 'none';
    if (DOMElements.startScreen) DOMElements.startScreen.style.display = 'flex'; // Show start screen
    loadCompletionStatus(); // Load progress to show correct planet list
    if(DOMElements.planetProgression) DOMElements.planetProgression.style.display = gameState.game.initialLevelCompleted ? 'block' : 'none';
    displayPlanetProgression(); // Update planet list on main menu
    displayHighScores(); // Show high scores on main menu
}

// --- High Score Management ---
// Interacts with localStorage and highscore list element from index.html
function loadHighScores() { try { const s=localStorage.getItem('landerImpossibleHighScores'); if(s){gameState.game.highScores=JSON.parse(s); if(!Array.isArray(gameState.game.highScores)||gameState.game.highScores.some(i=>typeof i!=='object'||!i.hasOwnProperty('score')||!i.hasOwnProperty('name')))gameState.game.highScores=[];}else gameState.game.highScores=[];} catch(e){console.error("HS Load Err",e);gameState.game.highScores=[];} gameState.game.highScores.sort((a,b)=>b.score-a.score); }
function checkAndSaveHighScore(score) { if(score<=0)return false; loadHighScores(); const lowest=gameState.game.highScores.length<5?0:gameState.game.highScores[gameState.game.highScores.length-1].score; if(score>lowest){const name=prompt(`New High Score (${score})! Name (3 chars):`,"PIL")?.substring(0,3).toUpperCase()||"PIL"; const newScore={name:name,score:score}; gameState.game.highScores.push(newScore); gameState.game.highScores.sort((a,b)=>b.score-a.score).splice(5); try{localStorage.setItem('landerImpossibleHighScores',JSON.stringify(gameState.game.highScores)); return true;}catch(e){console.error("HS Save Err",e); alert("Could not save high score."); return false;}} return false; }
function displayHighScores() { if (!DOMElements.highscoreList) return; DOMElements.highscoreList.innerHTML=''; if(gameState.game.highScores.length===0) DOMElements.highscoreList.innerHTML='<li>No scores yet!</li>'; else gameState.game.highScores.forEach(s=>{const li=document.createElement('li'); const name=String(s.name||"???").substring(0,3); const score=Number(s.score||0); li.textContent=`${name}: ${score}`; DOMElements.highscoreList.appendChild(li);}); }

// --- Progress Saving/Loading ---
// Uses localStorage to save completion status and current planet index
const COMPLETION_KEY = 'landerImpossibleCompleted';
const PLANET_INDEX_KEY = 'landerImpossiblePlanetIndex';

function saveCompletionStatus() {
    try {
        localStorage.setItem(COMPLETION_KEY, gameState.game.initialLevelCompleted.toString());
        if (gameState.game.initialLevelCompleted) {
             localStorage.setItem(PLANET_INDEX_KEY, gameState.game.currentPlanetIndex.toString());
        }
        console.log("Progress saved.");
    } catch (e) {
        console.error("Failed to save progress:", e);
    }
}

function loadCompletionStatus() {
    try {
        const completed = localStorage.getItem(COMPLETION_KEY);
        gameState.game.initialLevelCompleted = completed === 'true';
        if (gameState.game.initialLevelCompleted) {
             const savedIndex = localStorage.getItem(PLANET_INDEX_KEY);
             gameState.game.currentPlanetIndex = savedIndex ? parseInt(savedIndex, 10) : 0;
             // Validate loaded index
             if (isNaN(gameState.game.currentPlanetIndex) || gameState.game.currentPlanetIndex < 0 || gameState.game.currentPlanetIndex >= PLANETS.length) {
                 gameState.game.currentPlanetIndex = 0;
             }
        } else {
             gameState.game.currentPlanetIndex = 0; // Start at Moon if not completed
        }
         console.log(`Progress loaded: Completed=${gameState.game.initialLevelCompleted}, PlanetIndex=${gameState.game.currentPlanetIndex}`);
    } catch (e) {
        console.error("Failed to load progress:", e);
        // Reset to default on error
        gameState.game.initialLevelCompleted = false;
        gameState.game.currentPlanetIndex = 0;
    }
}

// --- Initialization ---
// Gets all necessary DOM element references from index.html
function initGame() {
    console.log("Initializing IMPOSSIBLE Lander...");
    DOMElements = {
        wrapper: $('#game-wrapper'), container: $('#game-container'), lander: $('#lander'),
        landerImg: $('#lander-img'), altitude: $('#altitude'), vSpeed: $('#vertical-speed'),
        hSpeed: $('#horizontal-speed'), rotation: $('#rotation'), fuelLevel: $('#fuel-level'),
        fuelBar: $('#fuel-bar'), planetDisplay: $('#planet-display'),
        pad: $('#landing-pad'), surface: $('#moon-surface'), starsBg: $('#stars-bg'),
        starsMg: $('#stars-mg'), starsFg: $('#stars-fg'), earth: $('#earth'),
        dashboardTitle: $('#dashboard-title'), messageOverlay: $('#message-overlay'),
        messageContainer: $('#message-container'), messageTitle: $('#message-title'),
        messageText: $('#message-text'), messageScore: $('#message-score'),
        messageHighscore: $('#message-highscore'),
        nextPlanetBtn: $('#next-planet-btn'), // Button from index.html
        restartBtn: $('#restart-btn'),       // Button from index.html
        mainMenuBtn: $('#main-menu-btn'),     // Button from index.html
        startScreen: $('#start-screen'),       // Element from index.html
        startGameBtn: $('#start-game-btn'),   // Button from index.html
        highscoreDisplay: $('#highscore-display'), // Element from index.html
        highscoreList: $('#highscore-list'),       // Element from index.html
        controlsInfo: $('#controls-info'),         // Element from index.html
        planetProgression: $('#planet-progression'), // Element from index.html
        planetList: $('#planet-list'),               // Element from index.html
        sillySuccessGraphic: $('#silly-success-graphic'), // Img element from index.html
        dangerBorder: $('.danger-border'),
        speedLines: $('.speed-lines'),
        thrusterFlame: $('.thruster-flame'),
        thrusterGlow: $('.thruster-glow'),
        nearMissFlash: $('.near-miss-flash'),
        nearMissParticles: $('.near-miss-particles'),
        landingGuides: $('#landing-guides'),
        approachLine: $('.approach-line'),
        idealAngleZone: $('.ideal-angle-zone'),
        speedMarkers: $('.speed-markers'),
        distanceMarkers: $('.distance-markers'),
        mobileControls: $('#mobile-controls'),
        rotateLeftBtn: $('#rotate-left-btn'),
        rotateRightBtn: $('#rotate-right-btn'),
        thrustBtn: $('#thrust-btn'),
    };

    // Check if essential elements are loaded
    if (!DOMElements.container || !DOMElements.lander || !DOMElements.surface || !DOMElements.startScreen) {
        console.error("Essential game elements are missing from the DOM!");
        alert("Error initializing game: Missing core elements.");
        return;
    }

    // Set game dimensions based on container size
    function setDimensions() {
        const rect = DOMElements.container.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            gameState.game.width = rect.width;
            gameState.game.height = rect.height;
            const surfaceRect = DOMElements.surface.getBoundingClientRect();
            const containerRect = DOMElements.container.getBoundingClientRect();
            gameState.game.surfaceY = surfaceRect.top - containerRect.top; // Calculate surface Y position relative to container
            console.log(`Dimensions set: ${gameState.game.width}x${gameState.game.height}, SurfaceY: ${gameState.game.surfaceY}`);
        } else {
            console.warn("Container dimensions not ready, retrying...");
            requestAnimationFrame(setDimensions); // Retry if dimensions aren't ready
        }
    }
    setDimensions(); // Initial dimension setting

    // Load initial state
    loadCompletionStatus();
    loadHighScores();
    initAudio();
    createStars(); // Create star backgrounds (elements from index.html, styled by style.css)

    // Add event listeners to buttons defined in index.html
    DOMElements.startGameBtn?.addEventListener('click', () => { playSound('click'); startGame(); });
    DOMElements.nextPlanetBtn?.addEventListener('click', () => { playSound('click'); goToNextPlanet(); });
    DOMElements.restartBtn?.addEventListener('click', () => { playSound('click'); restartMission(); });
    DOMElements.mainMenuBtn?.addEventListener('click', goToMainMenu);
    // Add global key listeners
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    // Handle window resize
    window.addEventListener('resize', () => {
        console.warn("Resize detected. Recalculating dimensions.");
        setDimensions();
        // Optionally, could reset/redraw elements sensitive to size changes like craters
        // createCraters();
    });

    // Show start screen initially
    if (DOMElements.startScreen) DOMElements.startScreen.style.display = 'flex';
    if(DOMElements.planetProgression) DOMElements.planetProgression.style.display = gameState.game.initialLevelCompleted ? 'block' : 'none';
    displayHighScores(); // Show scores on start screen
    displayPlanetProgression(); // Show planet progress on start screen

    // Add mobile control event listeners
    if (DOMElements.rotateLeftBtn) {
        DOMElements.rotateLeftBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            gameState.controls.rotateLeft = true;
            playSound('rotate', false, 0.3);
        });
        DOMElements.rotateLeftBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            gameState.controls.rotateLeft = false;
        });
    }

    if (DOMElements.rotateRightBtn) {
        DOMElements.rotateRightBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            gameState.controls.rotateRight = true;
            playSound('rotate', false, 0.3);
        });
        DOMElements.rotateRightBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            gameState.controls.rotateRight = false;
        });
    }

    if (DOMElements.thrustBtn) {
        DOMElements.thrustBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!gameState.controls.thrust && !gameState.lander.thrusterMalfunctioning) {
                gameState.controls.thrust = true;
                playSound('thrust', true, 0.5);
            }
        });
        DOMElements.thrustBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (gameState.controls.thrust) {
                stopSound('thrust');
                gameState.controls.thrust = false;
            }
        });
    }

    // Add touch event prevention for game container
    if (DOMElements.container) {
        DOMElements.container.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
    }

    console.log("Initialization complete. Ready to attempt mission.");
}

// --- Start Game Loading ---
// Ensure DOM is ready before initializing
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame(); // DOM already loaded
}

function checkNearMiss() {
    if (gameState.lander.landed || gameState.lander.crashed) return;
    
    const now = Date.now();
    if (now - gameState.game.lastNearMissTime < CONFIG.NEAR_MISS_COOLDOWN) return;
    
    const landerBottom = gameState.lander.y + gameState.lander.height / 2;
    const surfaceY = gameState.game.surfaceY;
    const vSpeed = Math.abs(gameState.lander.vy);
    const hSpeed = Math.abs(gameState.lander.vx);
    
    // Check if we're dangerously close to the surface
    if (Math.abs(landerBottom - surfaceY) < 10 && 
        (vSpeed > gameState.game.difficultySettings.maxVSpeed * 0.8 || 
         hSpeed > gameState.game.difficultySettings.maxHSpeed * 0.8)) {
        
        gameState.game.nearMissStreak++;
        gameState.game.lastNearMissTime = now;
        
        // Trigger dramatic effects
        triggerNearMissEffects();
        
        // Play dramatic sound
        playSound('near_miss', false, 0.7);
        
        // Show streak message
        showNearMissMessage();
    }
}

function triggerNearMissEffects() {
    // Flash effect
    const flash = DOMElements.container.querySelector('.near-miss-flash');
    if (flash) {
        flash.classList.add('active');
        setTimeout(() => flash.classList.remove('active'), 500);
    }
    
    // Particle burst
    createNearMissParticles();
    
    // Enhanced screen shake
    applyScreenShake(1.5, true);
    
    // Dramatic text
    showNearMissText();
}

function createNearMissParticles() {
    const particlesContainer = DOMElements.container.querySelector('.near-miss-particles');
    if (!particlesContainer) return;
    
    // Create 20 particles in a burst pattern
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'near-miss-particle';
        
        // Random angle and distance for particle movement
        const angle = (Math.PI * 2 * i) / 20 + (Math.random() - 0.5) * 0.5;
        const distance = 50 + Math.random() * 50;
        
        // Set particle position and movement
        particle.style.left = `${gameState.lander.x}px`;
        particle.style.top = `${gameState.lander.y}px`;
        particle.style.setProperty('--tx', `${Math.cos(angle) * distance}px`);
        particle.style.setProperty('--ty', `${Math.sin(angle) * distance}px`);
        
        particlesContainer.appendChild(particle);
        
        // Remove particle after animation
        setTimeout(() => particle.remove(), 500);
    }
}

function showNearMissMessage() {
    if (!DOMElements.messageOverlay) return;
    
    const messages = [
        "CLOSE CALL!",
        "ALMOST THERE!",
        "THAT WAS CLOSE!",
        "NARROW ESCAPE!",
        "DEATH DEFYING!"
    ];
    
    const streakMsg = document.createElement('div');
    streakMsg.className = 'near-miss-text';
    streakMsg.textContent = `${messages[Math.floor(Math.random() * messages.length)]} x${gameState.game.nearMissStreak}`;
    DOMElements.messageOverlay.appendChild(streakMsg);
    
    setTimeout(() => streakMsg.remove(), 1000);
}

function showNearMissText() {
    if (!DOMElements.messageOverlay) return;
    
    const text = document.createElement('div');
    text.className = 'near-miss-text';
    text.textContent = "NEAR MISS!";
    DOMElements.messageOverlay.appendChild(text);
    
    setTimeout(() => text.remove(), 500);
}

function applyScreenShake(intensity = 1, isNearMiss = false) {
    const container = DOMElements.container;
    container.classList.add('screen-shake');
    if (isNearMiss) {
        container.classList.add('near-miss');
    }
    
    setTimeout(() => {
        container.classList.remove('screen-shake', 'near-miss');
    }, 500);
}

function generateShareableAchievement(achievement, score) {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    
    // Draw achievement card
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add achievement text
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(achievement.name, canvas.width/2, 200);
    
    ctx.font = '24px Arial';
    ctx.fillText(achievement.description, canvas.width/2, 300);
    
    ctx.font = 'bold 36px Arial';
    ctx.fillText(`Score: ${score}`, canvas.width/2, 400);
    
    // Add game title
    ctx.font = 'bold 36px Arial';
    ctx.fillText('IMPOSSIBLE LANDER', canvas.width/2, 500);
    
    return canvas.toDataURL('image/png');
}

function checkAchievements(impactData) {
    const achievements = [];
    
    // Check perfect landing
    if (Math.abs(impactData.impactVSpeed) < CONFIG.ACHIEVEMENTS.PERFECT_LANDING.threshold) {
        achievements.push({
            ...CONFIG.ACHIEVEMENTS.PERFECT_LANDING,
            score: gameState.game.score
        });
    }
    
    // Check fuel master
    if (gameState.lander.fuel < CONFIG.ACHIEVEMENTS.FUEL_MASTER.threshold) {
        achievements.push({
            ...CONFIG.ACHIEVEMENTS.FUEL_MASTER,
            score: gameState.game.score
        });
    }
    
    // Check death defying
    if (gameState.game.nearMissStreak >= CONFIG.ACHIEVEMENTS.DEATH_DEFYING.threshold) {
        achievements.push({
            ...CONFIG.ACHIEVEMENTS.DEATH_DEFYING,
            score: gameState.game.score
        });
    }
    
    return achievements;
}

// Add new functions for visual effects
function updateDangerEffects() {
    if (!gameState.game.active || gameState.lander.landed || gameState.lander.crashed) return;
    
    const lander = gameState.lander;
    const speed = Math.sqrt(lander.vx * lander.vx + lander.vy * lander.vy);
    const maxVSpeed = gameState.game.difficultySettings.maxVSpeed;
    const maxHSpeed = gameState.game.difficultySettings.maxHSpeed;
    
    // Update danger border
    const dangerBorder = DOMElements.container.querySelector('.danger-border');
    if (dangerBorder) {
        if (speed > maxVSpeed * 0.8 || Math.abs(lander.vx) > maxHSpeed * 0.8) {
            dangerBorder.classList.add('active');
        } else {
            dangerBorder.classList.remove('active');
        }
    }
    
    // Update speed lines - now with rate limiting
    const speedLines = DOMElements.container.querySelector('.speed-lines');
    if (speedLines) {
        if (speed > maxVSpeed * 0.6 || Math.abs(lander.vx) > maxHSpeed * 0.6) {
            speedLines.classList.add('active');
            // Only create new lines periodically
            if (!gameState.game.lastSpeedLineTime || 
                Date.now() - gameState.game.lastSpeedLineTime > 100) { // 100ms between lines
                createSpeedLine();
                gameState.game.lastSpeedLineTime = Date.now();
            }
        } else {
            speedLines.classList.remove('active');
        }
    }
    
    // Update landing pad color
    const landingPad = DOMElements.container.querySelector('#landing-pad');
    if (landingPad) {
        const distanceToPad = Math.abs(lander.y - gameState.game.pad.y);
        if (distanceToPad < 200) {
            if (speed > maxVSpeed * 0.8 || Math.abs(lander.vx) > maxHSpeed * 0.8) {
                landingPad.classList.add('danger');
                landingPad.classList.remove('warning', 'safe');
            } else if (speed > maxVSpeed * 0.6 || Math.abs(lander.vx) > maxHSpeed * 0.6) {
                landingPad.classList.add('warning');
                landingPad.classList.remove('danger', 'safe');
            } else {
                landingPad.classList.add('safe');
                landingPad.classList.remove('danger', 'warning');
            }
        } else {
            landingPad.classList.remove('danger', 'warning', 'safe');
        }
    }
}

function createSpeedLine() {
    const speedLines = DOMElements.container.querySelector('.speed-lines');
    if (!speedLines || !gameState.game.active) return;
    
    // Limit the number of speed lines that can exist at once
    const existingLines = speedLines.querySelectorAll('.speed-line').length;
    if (existingLines >= 8) return; // Maximum of 8 lines at once
    
    const speedLine = document.createElement('div');
    speedLine.className = 'speed-line';
    speedLine.style.left = Math.random() * 100 + '%';
    speedLines.appendChild(speedLine);
    
    // Remove the speed line after animation
    setTimeout(() => {
        if (speedLine && speedLine.parentNode) {
            speedLine.remove();
        }
    }, 800);
}

function updateThrusterEffects() {
    if (!gameState.game.active || !DOMElements.lander) return;
    
    // Get all thruster elements
    const mainThrusterFlame = DOMElements.lander.querySelector('.thruster-flame');
    const mainThrusterGlow = DOMElements.lander.querySelector('.thruster-glow');
    const leftThrusterFlame = DOMElements.lander.querySelector('.side-thruster-flame.left');
    const leftThrusterGlow = DOMElements.lander.querySelector('.side-thruster-glow.left');
    const rightThrusterFlame = DOMElements.lander.querySelector('.side-thruster-flame.right');
    const rightThrusterGlow = DOMElements.lander.querySelector('.side-thruster-glow.right');
    
    if (!mainThrusterFlame || !mainThrusterGlow || !leftThrusterFlame || !leftThrusterGlow || !rightThrusterFlame || !rightThrusterGlow) return;
    
    const isMainThrusting = gameState.controls.thrust && gameState.lander.fuel > 0 && !gameState.lander.thrusterMalfunctioning;
    const isLeftThrusting = gameState.controls.rotateRight && gameState.lander.fuel > 0 && !gameState.lander.thrusterMalfunctioning;
    const isRightThrusting = gameState.controls.rotateLeft && gameState.lander.fuel > 0 && !gameState.lander.thrusterMalfunctioning;
    const fuelPercentage = (gameState.lander.fuel / CONFIG.INITIAL_FUEL) * 100;
    
    // Update main thruster with corrected positioning
    mainThrusterFlame.classList.toggle('active', isMainThrusting);
    mainThrusterGlow.classList.toggle('active', isMainThrusting);
    
    // Update side thrusters
    leftThrusterFlame.classList.toggle('active', isLeftThrusting);
    leftThrusterGlow.classList.toggle('active', isLeftThrusting);
    rightThrusterFlame.classList.toggle('active', isRightThrusting);
    rightThrusterGlow.classList.toggle('active', isRightThrusting);
    
    // Update fuel state classes for all thrusters
    const isCritical = fuelPercentage < 10;
    const isLowFuel = fuelPercentage < 30;
    
    [mainThrusterFlame, leftThrusterFlame, rightThrusterFlame].forEach(flame => {
        if (flame) {
            flame.classList.toggle('low-fuel', isLowFuel && !isCritical);
            flame.classList.toggle('critical', isCritical);
        }
    });
    
    [mainThrusterGlow, leftThrusterGlow, rightThrusterGlow].forEach(glow => {
        if (glow) {
            glow.classList.toggle('low-fuel', isLowFuel && !isCritical);
            glow.classList.toggle('critical', isCritical);
        }
    });
    
    // Update flame size based on thrust intensity with corrected positioning
    if (isMainThrusting) {
        const thrustIntensity = 1 + (Math.random() * 0.3);
        mainThrusterFlame.style.transform = `translate(-50%, 100%) scaleY(${thrustIntensity})`;
        mainThrusterGlow.style.transform = `translate(-50%, 100%) scaleY(${thrustIntensity * 1.2})`;
    } else {
        mainThrusterFlame.style.transform = 'translate(-50%, 100%) scaleY(1)';
        mainThrusterGlow.style.transform = 'translate(-50%, 100%) scaleY(1)';
    }
    
    // Update side thruster effects with proper positioning
    if (isLeftThrusting) {
        const intensity = 1 + (Math.random() * 0.2);
        leftThrusterFlame.style.transform = `translate(-100%, -50%) scaleX(${intensity})`;
        leftThrusterGlow.style.transform = `translate(-100%, -50%) scaleX(${intensity * 1.2})`;
    }
    if (isRightThrusting) {
        const intensity = 1 + (Math.random() * 0.2);
        rightThrusterFlame.style.transform = `translate(0%, -50%) scaleX(${intensity})`;
        rightThrusterGlow.style.transform = `translate(0%, -50%) scaleX(${intensity * 1.2})`;
    }
}

function updateLandingGuides() {
    if (!gameState.game.active || !DOMElements.landingGuides) return;
    
    const lander = gameState.lander;
    const pad = gameState.game.pad;
    const maxVSpeed = gameState.game.difficultySettings.maxVSpeed;
    const maxHSpeed = gameState.game.difficultySettings.maxHSpeed;
    
    // Update approach line
    const approachLine = DOMElements.landingGuides.querySelector('.approach-line');
    if (approachLine) {
        const distanceToPad = Math.abs(lander.y - pad.y);
        const speed = Math.sqrt(lander.vx * lander.vx + lander.vy * lander.vy);
        
        // Show/hide based on distance and speed
        approachLine.style.display = (distanceToPad < 300 && speed > maxVSpeed * 0.5) ? 'block' : 'none';
        
        // Update color based on approach
        if (approachLine.style.display === 'block') {
            if (speed > maxVSpeed * 0.8 || Math.abs(lander.vx) > maxHSpeed * 0.8) {
                approachLine.style.backgroundColor = 'var(--critical-color)';
            } else if (speed > maxVSpeed * 0.6 || Math.abs(lander.vx) > maxHSpeed * 0.6) {
                approachLine.style.backgroundColor = 'var(--warning-color)';
            } else {
                approachLine.style.backgroundColor = 'var(--good-color)';
            }
        }
    }
    
    // Update ideal angle zone
    const idealAngleZone = DOMElements.landingGuides.querySelector('.ideal-angle-zone');
    if (idealAngleZone) {
        const currentAngle = Math.abs(lander.angle % 360);
        const isInIdealRange = currentAngle <= CONFIG.MAX_LANDING_ROTATION;
        
        idealAngleZone.style.display = (Math.abs(lander.y - pad.y) < 200) ? 'block' : 'none';
        idealAngleZone.style.backgroundColor = isInIdealRange ? 'var(--good-color)' : 'var(--warning-color)';
    }
    
    // Update speed markers
    const speedMarkers = DOMElements.landingGuides.querySelector('.speed-markers');
    if (speedMarkers) {
        const vSpeed = Math.abs(lander.vy);
        const hSpeed = Math.abs(lander.vx);
        
        speedMarkers.style.display = (Math.abs(lander.y - pad.y) < 200) ? 'block' : 'none';
        
        // Update vertical speed marker
        const vMarker = speedMarkers.querySelector('.v-speed-marker');
        if (vMarker) {
            vMarker.style.backgroundColor = vSpeed <= maxVSpeed ? 'var(--good-color)' : 
                                          vSpeed <= maxVSpeed * 1.2 ? 'var(--warning-color)' : 
                                          'var(--critical-color)';
        }
        
        // Update horizontal speed marker
        const hMarker = speedMarkers.querySelector('.h-speed-marker');
        if (hMarker) {
            hMarker.style.backgroundColor = hSpeed <= maxHSpeed ? 'var(--good-color)' : 
                                          hSpeed <= maxHSpeed * 1.2 ? 'var(--warning-color)' : 
                                          'var(--critical-color)';
        }
    }
    
    // Update distance markers
    const distanceMarkers = DOMElements.landingGuides.querySelector('.distance-markers');
    if (distanceMarkers) {
        const distanceToPad = Math.abs(lander.y - pad.y);
        const padLeft = pad.x - pad.width/2;
        const padRight = pad.x + pad.width/2;
        const isOverPad = lander.x >= padLeft && lander.x <= padRight;
        
        distanceMarkers.style.display = (distanceToPad < 300) ? 'block' : 'none';
        
        // Update horizontal alignment marker
        const hAlignMarker = distanceMarkers.querySelector('.h-align-marker');
        if (hAlignMarker) {
            hAlignMarker.style.backgroundColor = isOverPad ? 'var(--good-color)' : 'var(--warning-color)';
        }
        
        // Update distance indicator
        const distanceIndicator = distanceMarkers.querySelector('.distance-indicator');
        if (distanceIndicator) {
            const distancePercent = Math.min(100, (distanceToPad / 300) * 100);
            distanceIndicator.style.height = `${distancePercent}%`;
            distanceIndicator.style.backgroundColor = distanceToPad <= 100 ? 'var(--good-color)' : 
                                                   distanceToPad <= 200 ? 'var(--warning-color)' : 
                                                   'var(--critical-color)';
        }
    }
}

function gameLoop(timestamp) {
    if (!gameState.game.active) return;
    if(gameState.game.paused) { // Handle pause state
        gameLoopHandle = requestAnimationFrame(gameLoop);
        return;
    }
    if (!gameState.game.startTime) gameState.game.startTime = timestamp;
    if (!gameState.game.lastFrameTime) gameState.game.lastFrameTime = timestamp;
    gameState.game.deltaTime = Math.max(1, timestamp - gameState.game.lastFrameTime); // Calculate delta time, ensure minimum
    gameState.game.lastFrameTime = timestamp;

    try { // Wrap core logic in try-catch for robustness
        updatePhysics(gameState.game.deltaTime);
        checkCollisions();
        updateParticles(gameState.game.deltaTime);
        updateParallax();
        updateUI();
        updateLandingGuides(); // Add this line
    } catch (error) {
        console.error("Critical Error in Game Loop:", error);
        gameState.game.active = false; // Stop game on critical error
        alert("A critical game error occurred. Please check the console.");
        endGame(false, "Critical game error!"); // End game gracefully
        return;
    }

    if (gameState.game.active) { // Request next frame if game is still active
        gameLoopHandle = requestAnimationFrame(gameLoop);
    }
}

// Add mobile-specific pause handling
function handlePause(e) {
    if (e.type === 'touchstart') {
        e.preventDefault();
    }
    togglePause();
}

// Update pause event listener to handle both click and touch
document.addEventListener('click', handlePause);
document.addEventListener('touchstart', handlePause);