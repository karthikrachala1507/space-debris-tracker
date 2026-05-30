// ============================================================
// SPACE DEBRIS TRACKER v6
// Fixed: gradual zoom, depth culling, click trajectories, no speed sliders
// ============================================================

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('globe'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
camera.position.set(0, 0, 6);

let camTarget = { x:0, y:0, z:6 };
let selectedObj = null;
let orbitPathLine = null;

// ============================================================
// STARS
// ============================================================
// Background stars - two layers for depth
const starGeo1 = new THREE.BufferGeometry();
const starPos1 = new Float32Array(8000 * 3);
for (let i = 0; i < 8000 * 3; i++) starPos1[i] = (Math.random() - 0.5) * 800;
starGeo1.setAttribute('position', new THREE.BufferAttribute(starPos1, 3));
scene.add(new THREE.Points(starGeo1, new THREE.PointsMaterial({ color: 0xffffff, size: 0.07, transparent: true, opacity: 0.85 })));

// Faint distant stars
const starGeo2 = new THREE.BufferGeometry();
const starPos2 = new Float32Array(4000 * 3);
for (let i = 0; i < 4000 * 3; i++) starPos2[i] = (Math.random() - 0.5) * 600;
starGeo2.setAttribute('position', new THREE.BufferAttribute(starPos2, 3));
scene.add(new THREE.Points(starGeo2, new THREE.PointsMaterial({ color: 0xaabbff, size: 0.04, transparent: true, opacity: 0.5 })));

// ============================================================
// MASTER GROUP
// ============================================================
const masterGroup = new THREE.Group();
scene.add(masterGroup);

// ============================================================
// LIGHTING
// ============================================================
scene.add(new THREE.AmbientLight(0x111122, 1.2));
const sun = new THREE.DirectionalLight(0xfff5e0, 2.5);
sun.position.set(6, 2, 4);
scene.add(sun);
// Subtle blue fill light simulating Earthshine
const fillLight = new THREE.DirectionalLight(0x2244aa, 0.15);
fillLight.position.set(-5, -2, -3);
scene.add(fillLight);
// Subtle rim light
const rimLight = new THREE.DirectionalLight(0x4488ff, 0.1);
rimLight.position.set(-6, 3, -4);
scene.add(rimLight);

// ============================================================
// TEXTURES
// ============================================================
const TL = new THREE.TextureLoader();

// ============================================================
// EARTH
// ============================================================
const earthPivot = new THREE.Group();
masterGroup.add(earthPivot);

const earthMat = new THREE.MeshPhongMaterial({ 
    specular: new THREE.Color(0x222244), 
    shininess: 15,
    emissive: new THREE.Color(0x000511)
});
TL.load('textures/earth.jpg', tex => { 
    earthMat.map = tex; 
    earthMat.needsUpdate = true; 
}, undefined, () => { earthMat.color.setHex(0x1a5fba); });
const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), earthMat);
earthPivot.add(earthMesh);

const cloudMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.35, depthWrite: false });
TL.load('textures/clouds.png', tex => { cloudMat.map = tex; cloudMat.needsUpdate = true; }, undefined, () => { cloudMat.opacity = 0; });
earthPivot.add(new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 64), cloudMat));
// Inner atmosphere
earthPivot.add(new THREE.Mesh(new THREE.SphereGeometry(1.02, 64, 64),
    new THREE.MeshPhongMaterial({ color: 0x4488ff, transparent: true, opacity: 0.05, side: THREE.FrontSide, depthWrite: false })));
// Outer atmosphere glow
earthPivot.add(new THREE.Mesh(new THREE.SphereGeometry(1.06, 64, 64),
    new THREE.MeshPhongMaterial({ color: 0x2255cc, transparent: true, opacity: 0.04, side: THREE.BackSide, depthWrite: false })));
// Thin blue limb halo
earthPivot.add(new THREE.Mesh(new THREE.SphereGeometry(1.08, 64, 64),
    new THREE.MeshPhongMaterial({ color: 0x1133aa, transparent: true, opacity: 0.02, side: THREE.BackSide, depthWrite: false })));

// ============================================================
// ORBIT RINGS
// ============================================================
function addRing(parent, radius, color, opacity) {
    const pts = [];
    for (let i = 0; i <= 256; i++) { const a=(i/256)*Math.PI*2; pts.push(new THREE.Vector3(Math.cos(a)*radius,0,Math.sin(a)*radius)); }
    parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
}
addRing(masterGroup, 1.065, 0x00ff44, 0.3);
addRing(masterGroup, 1.11,  0xff3300, 0.25);
addRing(masterGroup, 1.157, 0xff6600, 0.15);
addRing(masterGroup, 2.625, 0x00ccff, 0.08);
addRing(masterGroup, 4.5,   0x666666, 0.12);

// ============================================================
// MOON
// ============================================================
const moonOrbitPivot = new THREE.Group();
masterGroup.add(moonOrbitPivot);
const moonSelfPivot = new THREE.Group();
moonSelfPivot.position.set(4.5, 0, 0);
moonOrbitPivot.add(moonSelfPivot);

const moonMat = new THREE.MeshPhongMaterial({ 
    color: 0x888888, 
    shininess: 2,
    emissive: new THREE.Color(0x050505),
    specular: new THREE.Color(0x111111)
});
TL.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg',
    tex => { moonMat.map = tex; moonMat.needsUpdate = true; }, undefined, () => { moonMat.color.setHex(0x888888); });
const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 32), moonMat);
moonSelfPivot.add(moonMesh);
moonSelfPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.285, 32, 32),
    new THREE.MeshPhongMaterial({ color: 0x555555, transparent: true, opacity: 0.04, side: THREE.FrontSide, depthWrite: false })));
addRing(moonSelfPivot, 0.38, 0x00ffff, 0.45);
addRing(moonSelfPivot, 0.50, 0xffff00, 0.35);
addRing(moonSelfPivot, 0.43, 0xff8800, 0.35);

// ============================================================
// HIGH QUALITY SPRITE TEXTURES - 256x256 realistic canvas art
// ============================================================
function makeCanvas(w, h, fn) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, w, h);
    fn(ctx, w, h);
    return new THREE.CanvasTexture(c);
}

// ISS - 256x256 highly detailed
const issTexture = makeCanvas(256, 256, (ctx, W, H) => {
    const cx = W/2, cy = H/2;

    // Main truss - horizontal beam
    const trussG = ctx.createLinearGradient(0, cy-10, 0, cy+10);
    trussG.addColorStop(0, '#dddddd');
    trussG.addColorStop(0.3, '#ffffff');
    trussG.addColorStop(0.7, '#aaaaaa');
    trussG.addColorStop(1, '#888888');
    ctx.fillStyle = trussG;
    ctx.fillRect(10, cy-8, W-20, 16);

    // Truss segments
    ctx.strokeStyle = '#999999';
    ctx.lineWidth = 1;
    for(let x = 20; x < W-20; x += 15) {
        ctx.beginPath(); ctx.moveTo(x, cy-8); ctx.lineTo(x, cy+8); ctx.stroke();
    }

    // Central module body
    const bodyG = ctx.createLinearGradient(cx-20, 0, cx+20, 0);
    bodyG.addColorStop(0, '#777777');
    bodyG.addColorStop(0.3, '#cccccc');
    bodyG.addColorStop(0.6, '#eeeeee');
    bodyG.addColorStop(1, '#888888');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.roundRect(cx-22, cy-28, 44, 56, 4);
    ctx.fill();

    // Module detail lines
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 0.8;
    for(let y = cy-20; y < cy+28; y += 8) {
        ctx.beginPath(); ctx.moveTo(cx-22, y); ctx.lineTo(cx+22, y); ctx.stroke();
    }

    // Solar panel arrays - left side (4 panels)
    const panelPositions = [
        {x: 12, y: cy-38, w: 60, h: 22},   // left top upper
        {x: 12, y: cy+16, w: 60, h: 22},   // left top lower
        {x: W-72, y: cy-38, w: 60, h: 22}, // right top upper
        {x: W-72, y: cy+16, w: 60, h: 22}, // right top lower
    ];

    panelPositions.forEach(p => {
        // Panel backing
        const pg = ctx.createLinearGradient(p.x, p.y, p.x, p.y+p.h);
        pg.addColorStop(0, '#0a2a6e');
        pg.addColorStop(0.5, '#1a4aaa');
        pg.addColorStop(1, '#0a1a5e');
        ctx.fillStyle = pg;
        ctx.fillRect(p.x, p.y, p.w, p.h);

        // Solar cell grid
        ctx.strokeStyle = '#4466aa';
        ctx.lineWidth = 0.5;
        const cellW = p.w / 6;
        const cellH = p.h / 3;
        for(let i = 1; i < 6; i++) {
            ctx.beginPath(); ctx.moveTo(p.x + i*cellW, p.y); ctx.lineTo(p.x + i*cellW, p.y+p.h); ctx.stroke();
        }
        for(let j = 1; j < 3; j++) {
            ctx.beginPath(); ctx.moveTo(p.x, p.y + j*cellH); ctx.lineTo(p.x+p.w, p.y + j*cellH); ctx.stroke();
        }
        // Panel border
        ctx.strokeStyle = '#6688cc';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x, p.y, p.w, p.h);

        // Panel connection arm
        ctx.fillStyle = '#bbbbbb';
        if(p.x < cx) {
            ctx.fillRect(p.x + p.w, p.y + p.h/2 - 2, cx - p.x - p.w + 2, 4);
        } else {
            ctx.fillRect(cx + 22, p.y + p.h/2 - 2, p.x - cx - 22, 4);
        }
    });

    // Docking port
    ctx.fillStyle = '#cccccc';
    ctx.beginPath(); ctx.arc(cx, cy-32, 5, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1; ctx.stroke();

    // Solar highlight
    ctx.fillStyle = 'rgba(255,255,200,0.15)';
    ctx.beginPath();
    ctx.ellipse(cx-10, cy-15, 15, 20, -0.3, 0, Math.PI*2);
    ctx.fill();

    // Subtle glow
    const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 80);
    glow.addColorStop(0, 'rgba(100,255,150,0)');
    glow.addColorStop(1, 'rgba(100,255,150,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
});

// Generic satellite - 128x128 detailed box with panels
const satTexture = makeCanvas(128, 128, (ctx, W, H) => {
    const cx = W/2, cy = H/2;

    // Satellite body - metallic box
    const bodyG = ctx.createLinearGradient(cx-18, cy-22, cx+18, cy+22);
    bodyG.addColorStop(0, '#555555');
    bodyG.addColorStop(0.2, '#aaaaaa');
    bodyG.addColorStop(0.5, '#dddddd');
    bodyG.addColorStop(0.8, '#999999');
    bodyG.addColorStop(1, '#444444');
    ctx.fillStyle = bodyG;
    ctx.beginPath();
    ctx.roundRect(cx-16, cy-20, 32, 40, 3);
    ctx.fill();

    // Body detail - thermal blanket gold color on one face
    const goldG = ctx.createLinearGradient(cx-16, cy, cx+16, cy);
    goldG.addColorStop(0, '#aa8800');
    goldG.addColorStop(0.5, '#ffcc00');
    goldG.addColorStop(1, '#aa8800');
    ctx.fillStyle = goldG;
    ctx.fillRect(cx-14, cy-4, 28, 12);

    // Grid lines on gold section
    ctx.strokeStyle = '#886600';
    ctx.lineWidth = 0.5;
    for(let i=0; i<4; i++) { ctx.beginPath(); ctx.moveTo(cx-14+i*7,cy-4); ctx.lineTo(cx-14+i*7,cy+8); ctx.stroke(); }

    // Solar panels
    const spG = ctx.createLinearGradient(0, cy-10, 0, cy+10);
    spG.addColorStop(0, '#0a1a66');
    spG.addColorStop(0.5, '#1a3aaa');
    spG.addColorStop(1, '#0a1a55');
    ctx.fillStyle = spG;
    ctx.fillRect(8, cy-12, 38, 24);
    ctx.fillRect(W-46, cy-12, 38, 24);

    // Panel grid
    ctx.strokeStyle = '#3355aa';
    ctx.lineWidth = 0.5;
    [14,20,26,32,38].forEach(x => {
        ctx.beginPath(); ctx.moveTo(x,cy-12); ctx.lineTo(x,cy+12); ctx.stroke();
    });
    [W-46+6,W-46+12,W-46+18,W-46+24,W-46+30,W-46+36].forEach(x => {
        ctx.beginPath(); ctx.moveTo(x,cy-12); ctx.lineTo(x,cy+12); ctx.stroke();
    });
    ctx.strokeStyle = '#4466bb'; ctx.lineWidth = 1;
    ctx.strokeRect(8, cy-12, 38, 24);
    ctx.strokeRect(W-46, cy-12, 38, 24);

    // Panel arms
    ctx.fillStyle = '#999999';
    ctx.fillRect(46, cy-3, cx-16-46+2, 6);
    ctx.fillRect(cx+16-2, cy-3, W-46-cx-16+2, 6);

    // Antenna dish
    ctx.strokeStyle = '#cccccc'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy-26, 8, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, cy-26); ctx.lineTo(cx, cy-20); ctx.stroke();
});

// Debris - high quality irregular metallic fragment
const debrisTexture = makeCanvas(64, 64, (ctx, W, H) => {
    const shapes = [
        // Shape 1: twisted metal panel
        [[32,4],[52,12],[58,28],[48,52],[36,60],[20,54],[8,36],[12,16]],
    ];
    const pts = shapes[0];

    // Shadow
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2; ctx.shadowOffsetY = 2;

    // Main debris body gradient - dark metallic
    const dg = ctx.createLinearGradient(8, 4, 58, 60);
    dg.addColorStop(0, '#222222');
    dg.addColorStop(0.2, '#666666');
    dg.addColorStop(0.4, '#444444');
    dg.addColorStop(0.6, '#888888');
    dg.addColorStop(0.8, '#333333');
    dg.addColorStop(1, '#111111');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.closePath();
    ctx.fill();

    ctx.shadowColor = 'transparent';

    // Burnt/scorched areas
    ctx.fillStyle = 'rgba(80,20,0,0.6)';
    ctx.beginPath(); ctx.ellipse(20,18,8,6,-0.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle = 'rgba(50,10,0,0.5)';
    ctx.beginPath(); ctx.ellipse(44,44,6,5,0.3,0,Math.PI*2); ctx.fill();

    // Metallic highlights
    ctx.strokeStyle = 'rgba(200,180,150,0.6)';
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(28,8); ctx.lineTo(50,20); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(14,30); ctx.lineTo(24,50); ctx.stroke();

    // Edge highlight
    ctx.strokeStyle = 'rgba(150,120,80,0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
    ctx.closePath(); ctx.stroke();

    // Small torn edges
    ctx.fillStyle = 'rgba(255,100,50,0.3)';
    ctx.beginPath(); ctx.arc(36,10,3,0,Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(54,30,2,0,Math.PI*2); ctx.fill();
});

// Rocket body - 64x128 detailed cylindrical
const rocketTexture = makeCanvas(64, 128, (ctx, W, H) => {
    const cx = W/2;

    // Main cylinder body with metallic gradient
    const rg = ctx.createLinearGradient(0, 0, W, 0);
    rg.addColorStop(0, '#222222');
    rg.addColorStop(0.1, '#555555');
    rg.addColorStop(0.3, '#999999');
    rg.addColorStop(0.5, '#cccccc');
    rg.addColorStop(0.7, '#888888');
    rg.addColorStop(0.9, '#444444');
    rg.addColorStop(1, '#111111');
    ctx.fillStyle = rg;
    ctx.fillRect(14, 12, 36, 96);

    // Nose cone
    const ncg = ctx.createLinearGradient(0, 0, W, 0);
    ncg.addColorStop(0, '#333333');
    ncg.addColorStop(0.5, '#aaaaaa');
    ncg.addColorStop(1, '#222222');
    ctx.fillStyle = ncg;
    ctx.beginPath();
    ctx.moveTo(14, 12); ctx.lineTo(cx, 2); ctx.lineTo(50, 12);
    ctx.closePath(); ctx.fill();

    // Nozzle bell
    const ng = ctx.createLinearGradient(0, 0, W, 0);
    ng.addColorStop(0, '#111111');
    ng.addColorStop(0.5, '#555555');
    ng.addColorStop(1, '#111111');
    ctx.fillStyle = ng;
    ctx.beginPath();
    ctx.moveTo(16,108); ctx.lineTo(8,122); ctx.lineTo(56,122); ctx.lineTo(48,108);
    ctx.closePath(); ctx.fill();

    // Nozzle inner glow (engine)
    const ng2 = ctx.createRadialGradient(cx,122,0,cx,122,14);
    ng2.addColorStop(0,'rgba(255,200,50,0.9)');
    ng2.addColorStop(0.4,'rgba(255,80,0,0.6)');
    ng2.addColorStop(1,'rgba(255,50,0,0)');
    ctx.fillStyle = ng2;
    ctx.beginPath(); ctx.ellipse(cx,122,14,6,0,0,Math.PI*2); ctx.fill();

    // Stage separation ring
    ctx.fillStyle = '#888888';
    ctx.fillRect(12,55,40,5);

    // Thermal stripes
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    [20,36,52,68,84].forEach(y => ctx.fillRect(14,y,36,6));

    // Logo area (white band)
    ctx.fillStyle = 'rgba(255,255,255,0.12)';
    ctx.fillRect(14,30,36,12);

    // Highlight streak
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(20,14,6,90);
});

// GPS satellite - distinct appearance
const gpsSatTexture = makeCanvas(96, 96, (ctx, W, H) => {
    const cx = W/2, cy = H/2;
    // Hexagonal body
    const hg = ctx.createLinearGradient(cx-16,cy-16,cx+16,cy+16);
    hg.addColorStop(0,'#666666'); hg.addColorStop(0.5,'#eeeeee'); hg.addColorStop(1,'#555555');
    ctx.fillStyle = hg;
    ctx.beginPath();
    for(let i=0;i<6;i++){
        const a = i*Math.PI/3 - Math.PI/6;
        i===0?ctx.moveTo(cx+16*Math.cos(a),cy+16*Math.sin(a)):ctx.lineTo(cx+16*Math.cos(a),cy+16*Math.sin(a));
    }
    ctx.closePath(); ctx.fill();
    // L-band antenna
    const ag = ctx.createRadialGradient(cx,cy,0,cx,cy,14);
    ag.addColorStop(0,'#ffffcc'); ag.addColorStop(1,'rgba(255,255,100,0)');
    ctx.fillStyle = ag;
    ctx.beginPath(); ctx.arc(cx,cy,14,0,Math.PI*2); ctx.fill();
    // Solar panels
    const spg = ctx.createLinearGradient(0,cy-8,0,cy+8);
    spg.addColorStop(0,'#0a1a55'); spg.addColorStop(0.5,'#2244aa'); spg.addColorStop(1,'#0a1a44');
    ctx.fillStyle = spg;
    ctx.fillRect(4,cy-10,28,20); ctx.fillRect(W-32,cy-10,28,20);
    ctx.strokeStyle='#3355aa'; ctx.lineWidth=0.5;
    [10,16,22,28].forEach(x=>{ctx.beginPath();ctx.moveTo(x,cy-10);ctx.lineTo(x,cy+10);ctx.stroke();});
    [W-28,W-22,W-16,W-10].forEach(x=>{ctx.beginPath();ctx.moveTo(x,cy-10);ctx.lineTo(x,cy+10);ctx.stroke();});
});

// Starlink - flat rectangular solar panel satellite
const starlinkTexture = makeCanvas(96, 48, (ctx, W, H) => {
    // Very flat, wide - Starlink v2 has large solar panel
    const sg = ctx.createLinearGradient(0,0,0,H);
    sg.addColorStop(0,'#0a1a66'); sg.addColorStop(0.5,'#2255cc'); sg.addColorStop(1,'#0a1a55');
    ctx.fillStyle = sg;
    ctx.fillRect(2,6,W-4,H-12);
    // Cell grid
    ctx.strokeStyle='#3366bb'; ctx.lineWidth=0.4;
    for(let x=8;x<W-4;x+=8){ctx.beginPath();ctx.moveTo(x,6);ctx.lineTo(x,H-6);ctx.stroke();}
    for(let y=10;y<H-6;y+=8){ctx.beginPath();ctx.moveTo(2,y);ctx.lineTo(W-2,y);ctx.stroke();}
    // Satellite bus (small box at center)
    ctx.fillStyle='#aaaaaa';
    ctx.fillRect(W/2-6,H/2-5,12,10);
    ctx.strokeStyle='#4477cc'; ctx.lineWidth=1;
    ctx.strokeRect(2,6,W-4,H-12);
    // Laser comm aperture
    ctx.fillStyle='rgba(0,200,255,0.6)';
    ctx.beginPath(); ctx.arc(W/2,H/2,3,0,Math.PI*2); ctx.fill();
});

function getTex(type, name) {
    if (type==='ISS') return issTexture;
    if (name && name.includes('GPS')) return gpsSatTexture;
    if (name && name.includes('Starlink')) return starlinkTexture;
    if (type==='SATELLITE') return satTexture;
    if (type==='ROCKET BODY') return rocketTexture;
    return debrisTexture;
}

// ============================================================
// OBJECTS
// ============================================================
const earthObjects = [];
const moonObjects  = [];

// Base sprite size per type
function getBaseSize(type, name) {
    if (type==='ISS') return 0.16;
    if (name && name.includes('GPS')) return 0.09;
    if (name && name.includes('Starlink')) return 0.10;
    if (type==='SATELLITE') return 0.09;
    if (type==='ROCKET BODY') return 0.10;
    return 0.055;
}

function createObj(parent, store, cfg) {
    const { altitude, inclination, speed, color, name, type } = cfg;
    // Use sprite only - depthTest FALSE so always renders on top of Earth
    const mat = new THREE.SpriteMaterial({ map: getTex(type, name), transparent: true, depthTest: false, depthWrite: false });
    const sprite = new THREE.Sprite(mat);
    sprite.renderOrder = 999;
    const baseSize = getBaseSize(type, name);
    sprite.scale.set(baseSize, baseSize * 0.6, 1);
    parent.add(sprite);
    const obj = { sprite, r: altitude, angle: Math.random()*Math.PI*2, speed, inclination: inclination*Math.PI/180, name, type, baseSize, color };
    store.push(obj);
    return obj;
}

function addEarth(cfg) { cfg.altitude = 1 + cfg.altKm / 6371; createObj(masterGroup, earthObjects, cfg); }
function addMoon(cfg)  { createObj(moonSelfPivot, moonObjects, cfg); } // altitude already in scene units

// ============================================================
// EARTH OBJECTS - Correct real altitudes (km) and inclinations
// Speed calculated from Kepler's 3rd law relative to ISS
// r = 1 + alt_km/6371 (Earth radius = 1 unit = 6371 km)
// ============================================================

// Named key objects - real orbital parameters
addEarth({ altKm:408,  inclination:51.6, speed:0.01800, color:0x00ff44, name:'ISS — International Space Station', type:'ISS' });
addEarth({ altKm:540,  inclination:28.5, speed:0.01749, color:0xffff00, name:'Hubble Space Telescope', type:'SATELLITE' });
addEarth({ altKm:560,  inclination:98.6, speed:0.01741, color:0x00ffaa, name:'Sentinel-2A (ESA Earth Observation)', type:'SATELLITE' });
addEarth({ altKm:390,  inclination:41.5, speed:0.01807, color:0x00ddff, name:'Tiangong Space Station (China)', type:'SATELLITE' });
addEarth({ altKm:590,  inclination:97.8, speed:0.01731, color:0xffaaff, name:'NOAA-20 Weather Satellite', type:'SATELLITE' });
addEarth({ altKm:800,  inclination:98.6, speed:0.01658, color:0xaaffaa, name:'Landsat-9 (NASA/USGS)', type:'SATELLITE' });

// GPS constellation - 24 satellites in 6 orbital planes, 55 deg inclination, 20200km
for (let i=0;i<24;i++) {
    const plane = Math.floor(i/4);  // 6 planes
    const raan = plane * 60;         // Right ascension 60 deg apart
    addEarth({ altKm:20200, inclination:55.0, speed:0.00232, color:0x0088ff, name:`GPS Block III-${i+1} (Plane ${plane+1})`, type:'SATELLITE' });
}

// Galileo EU navigation - 30 satellites at 23222km, 56 deg inclination
for (let i=0;i<12;i++) {
    addEarth({ altKm:23222, inclination:56.0, speed:0.00197, color:0x88aaff, name:`Galileo-${i+1} (EU Navigation)`, type:'SATELLITE' });
}

// Starlink - 550km, 53 deg inclination (Shell 1)
for (let i=0;i<60;i++) {
    addEarth({ altKm:540+Math.random()*20, inclination:53.0+Math.random()*0.5, speed:0.01745+Math.random()*0.0002, color:0x88ccff, name:`Starlink-${1000+i}`, type:'SATELLITE' });
}

// LEO Debris - 3 realistic bands based on actual debris distribution
// Band 1: 600-900km polar/sun-sync (most dangerous - 2009 Iridium collision zone)
for (let i=0;i<150;i++) {
    addEarth({ altKm:600+Math.random()*300, inclination:70+Math.random()*40, speed:0.01690+Math.random()*0.0008, color:0xff2200, name:`Debris LEO-A ${i}`, type:'DEBRIS' });
}
// Band 2: 800-1000km high inclination (China ASAT 2007 debris cloud zone)  
for (let i=0;i<120;i++) {
    addEarth({ altKm:800+Math.random()*200, inclination:90+Math.random()*30, speed:0.01628+Math.random()*0.0006, color:0xff3300, name:`Debris LEO-B ${i}`, type:'DEBRIS' });
}
// Band 3: 400-600km mixed inclination
for (let i=0;i<80;i++) {
    addEarth({ altKm:400+Math.random()*200, inclination:40+Math.random()*60, speed:0.01780+Math.random()*0.0010, color:0xff4400, name:`Debris LEO-C ${i}`, type:'DEBRIS' });
}

// Rocket bodies - spread across LEO altitudes
for (let i=0;i<60;i++) {
    addEarth({ altKm:500+Math.random()*700, inclination:30+(i/60)*120, speed:0.01700+Math.random()*0.0010, color:0xff8800, name:`Rocket Body ${i}`, type:'ROCKET BODY' });
}

// MEO debris - 2000-20000km
for (let i=0;i<60;i++) {
    addEarth({ altKm:2000+Math.random()*18000, inclination:(i/60)*180, speed:0.00480+Math.random()*0.0030, color:0xdd4400, name:`MEO Debris ${i}`, type:'DEBRIS' });
}

// GEO belt - 35786km, low inclination
for (let i=0;i<40;i++) {
    addEarth({ altKm:35786+Math.random()*100, inclination:Math.random()*3, speed:0.00116, color:0x00ffcc, name:`GEO Satellite ${i}`, type:'SATELLITE' });
}

// Moon objects - altitude in scene units
// Moon scene radius = 0.27, real radius = 1737km
// r = 0.27 * (1 + alt_km/1737)
// LRO: 50km polar orbit -> r = 0.27*(1+50/1737) = 0.2778
// Chandrayaan: 100km polar -> r = 0.27*(1+100/1737) = 0.2856
addMoon({ altitude:0.278, inclination:90.0, speed:0.0656, color:0x00ffff, name:'Lunar Reconnaissance Orbiter 50km polar (NASA)', type:'SATELLITE' });
addMoon({ altitude:0.286, inclination:90.0, speed:0.0629, color:0xff8800, name:'Chandrayaan-2 100km polar (ISRO)', type:'SATELLITE' });
addMoon({ altitude:0.290, inclination:86.0, speed:0.0612, color:0xffff00, name:'CAPSTONE NRHO (NASA)', type:'SATELLITE' });
addMoon({ altitude:0.282, inclination:45.0, speed:0.0641, color:0xffaaff, name:"Chang'e-5 Orbiter (CNSA)", type:'SATELLITE' });
for (let i=0;i<12;i++) {
    const alt = 0.278 + Math.random()*0.05;
    addMoon({ altitude:alt, inclination:60+Math.random()*60, speed:0.055+Math.random()*0.015, color:0xff4400, name:`Lunar Debris Apollo Hardware ${i+1}`, type:'DEBRIS' });
}

// ============================================================
// ORBITAL PATH - shown on click
// Draw full elliptical orbit of clicked object
// Using Keplerian orbit: x = r*cos(theta), y = r*sin(theta)*sin(inc), z = r*sin(theta)*cos(inc)
// ============================================================
function showOrbitPath(obj, parent) {
    // Remove previous path
    if (orbitPathLine) {
        masterGroup.remove(orbitPathLine);
        moonSelfPivot.remove(orbitPathLine);
        orbitPathLine = null;
    }
    if (selectedObj === obj) { selectedObj = null; return; } // click again to deselect

    selectedObj = obj;
    const steps = 256;
    const pts = [];
    // Full orbit
    for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2;
        pts.push(new THREE.Vector3(
            obj.r * Math.cos(angle),
            obj.r * Math.sin(angle) * Math.sin(obj.inclination),
            obj.r * Math.sin(angle) * Math.cos(obj.inclination)
        ));
    }
    // Direction arrow at current position
    const arrowAngle = obj.angle;
    const arrowNext  = obj.angle + 0.15;
    const p1 = new THREE.Vector3(obj.r*Math.cos(arrowAngle), obj.r*Math.sin(arrowAngle)*Math.sin(obj.inclination), obj.r*Math.sin(arrowAngle)*Math.cos(obj.inclination));
    const p2 = new THREE.Vector3(obj.r*Math.cos(arrowNext), obj.r*Math.sin(arrowNext)*Math.sin(obj.inclination), obj.r*Math.sin(arrowNext)*Math.cos(obj.inclination));

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const col = obj.type==='ISS' ? 0x00ff44 : obj.type==='DEBRIS' ? 0xff4444 : obj.type==='ROCKET BODY' ? 0xff8800 : 0x00aaff;
    const mat = new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.6 });
    orbitPathLine = new THREE.Line(geo, mat);

    // Arrow
    const arrowGeo = new THREE.BufferGeometry().setFromPoints([p1, p2]);
    const arrowMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
    const arrowLine = new THREE.Line(arrowGeo, arrowMat);
    orbitPathLine.add(arrowLine);

    parent.add(orbitPathLine);
}

// ============================================================
// VISIBILITY FILTERS
// ============================================================
const filters = { debris:true, satellite:true, rocket:true, moon:true };

function toggleFilter(type, visible) {
    filters[type] = visible;
    earthObjects.forEach(obj => {
        if (type==='debris' && obj.type==='DEBRIS') obj.sprite.visible = visible;
        if (type==='satellite' && (obj.type==='SATELLITE'||obj.type==='ISS')) obj.sprite.visible = visible;
        if (type==='rocket' && obj.type==='ROCKET BODY') obj.sprite.visible = visible;
    });
    if (type==='moon') moonObjects.forEach(obj => obj.sprite.visible = visible);
}

function toggleTrajectories(show) {
    // trajectories now shown on click only - this toggles auto-show for named objects
    earthObjects.filter(o => ['ISS','Hubble','Sentinel','Galileo','Tiangong'].some(n => o.name.includes(n))).forEach(obj => {
        if (show) showOrbitPath(obj, masterGroup);
    });
}

// ============================================================
// OCCLUSION - hide objects behind Earth surface
// Uses ray-sphere intersection for accurate culling
// ============================================================
const _occRaycaster = new THREE.Raycaster();

function isOccludedByEarth(objWorldPos) {
    const camPos = camera.position.clone();
    const earthWorldPos = new THREE.Vector3();
    earthMesh.getWorldPosition(earthWorldPos);

    // Direction from camera to object
    const dir = objWorldPos.clone().sub(camPos).normalize();
    const distToObj = camPos.distanceTo(objWorldPos);

    // Ray-sphere intersection with Earth (radius = 1.0 in world units)
    // Solve: |camPos + t*dir - earthCenter|^2 = earthRadius^2
    const oc = camPos.clone().sub(earthWorldPos);
    const a = dir.dot(dir);
    const b = 2.0 * oc.dot(dir);
    const earthRadius = 1.03; // slightly larger than actual to hide surface objects
    const c = oc.dot(oc) - earthRadius * earthRadius;
    const discriminant = b * b - 4 * a * c;

    if (discriminant < 0) return false; // ray misses Earth

    // Find nearest intersection
    const t = (-b - Math.sqrt(discriminant)) / (2.0 * a);

    // If Earth intersection is between camera and object, object is occluded
    return t > 0.01 && t < distToObj;
}

// ============================================================
// CAMERA FOCUS
// ============================================================
function focusISS() { const o=earthObjects.find(o=>o.type==='ISS'); if(!o) return; const wp=new THREE.Vector3(); o.sprite.getWorldPosition(wp); camTarget={x:wp.x*0.2,y:wp.y*0.2,z:1.6}; }
function focusHubble() { const o=earthObjects.find(o=>o.name.includes('Hubble')); if(!o) return; const wp=new THREE.Vector3(); o.sprite.getWorldPosition(wp); camTarget={x:wp.x*0.2,y:wp.y*0.2,z:1.8}; }
function focusMoon() { const wp=new THREE.Vector3(); moonMesh.getWorldPosition(wp); camTarget={x:wp.x*0.12,y:wp.y*0.12,z:3.5}; }
function focusEarth() { camTarget={x:0,y:0,z:6}; masterGroup.rotation.set(0,0,0); }

// ============================================================
// SAFE ORBIT FINDER
// ============================================================
function analyseOrbit() {
    const alt = parseInt(document.getElementById('orbit-input').value);
    if (!alt || alt < 200 || alt > 40000) { document.getElementById('orbit-result').innerHTML='<span style="color:#ff4444">Enter valid altitude (200–40000 km)</span>'; return; }
    const altR = alt / 6371;  // convert to Three.js units
    const tolerance = 200 / 6371;  // 200km tolerance band
    const debrisNear = earthObjects.filter(o=>o.type==='DEBRIS' && Math.abs((o.r-1)-altR)<tolerance).length;
    const totalNear  = earthObjects.filter(o=>Math.abs((o.r-1)-altR)<tolerance).length;
    let risk,rc,prob,rec,safer;
    if(alt<400){risk='LOW';rc='#00ff88';prob='0.1%';rec='Safe. Atmosphere causes rapid decay clearing debris.';safer=alt;}
    else if(alt<600){risk='MODERATE';rc='#ffff00';prob='0.8%';rec='Acceptable. Standard shielding sufficient.';safer=350;}
    else if(alt<900){risk='HIGH';rc='#ff8800';prob='2.4%';rec='Dense zone. Enhanced shielding required.';safer=550;}
    else if(alt<1500){risk='CRITICAL';rc='#ff3300';prob='5.1%';rec='Most dangerous band. Avoid long missions.';safer=550;}
    else if(alt<2000){risk='HIGH';rc='#ff8800';prob='3.2%';rec='Large debris fragments present.';safer=550;}
    else if(alt<20000){risk='MODERATE';rc='#ffff00';prob='1.1%';rec='GPS zone. Monitor operational satellites.';safer=alt;}
    else if(alt<36000){risk='LOW';rc='#00ff88';prob='0.3%';rec='Approaching GEO. Monitor closely.';safer=alt;}
    else{risk='LOW';rc='#00ff88';prob='0.2%';rec='GEO belt. Graveyard orbits available above 36000km.';safer=alt;}

    // Orbital period (Kepler's 3rd law): T = 2π√(a³/GM)
    const a = (6371 + alt) * 1000;
    const GM = 3.986e14;
    const period = ((2 * Math.PI * Math.sqrt(Math.pow(a,3) / GM)) / 3600).toFixed(2);
    // Orbital velocity: v = √(GM/a)
    const velocity = (Math.sqrt(GM/a) / 1000).toFixed(2);

    document.getElementById('orbit-result').innerHTML=`
        <div style="color:${rc};font-weight:bold;margin-bottom:4px">RISK LEVEL: ${risk}</div>
        <div style="color:#aaa">Altitude: <span style="color:#00ccff">${alt} km</span></div>
        <div style="color:#aaa">Collision Prob: <span style="color:${rc}">${prob}/year</span></div>
        <div style="color:#aaa">Orbital Velocity: <span style="color:#00ccff">${velocity} km/s</span></div>
        <div style="color:#aaa">Orbital Period: <span style="color:#00ccff">${period} hrs</span></div>
        <div style="color:#aaa">Objects nearby: <span style="color:#ff8800">${totalNear}</span></div>
        <div style="color:#aaa">Debris nearby: <span style="color:#ff4444">${debrisNear}</span></div>
        <div style="color:#556677;font-size:0.6rem;margin-top:4px;line-height:1.5">${rec}</div>
        ${safer!==alt?`<div style="color:#00ff88;margin-top:4px;font-size:0.6rem">✓ Safer altitude: ${safer} km</div>`:''}
    `;
}

// ============================================================
// MOUSE CONTROLS
// ============================================================
let isDragging = false;
let simPaused  = false;
let autoRotate = true;
let prevMouse  = { x:0, y:0 };
let mouseDownPos = { x:0, y:0 };
let moonOrbitAngle = 0;

document.addEventListener('mousedown', e => {
    if (e.target.closest('#panel')) return;
    isDragging=true; simPaused=true; autoRotate=false;
    prevMouse={x:e.clientX,y:e.clientY};
    mouseDownPos={x:e.clientX,y:e.clientY};
});

document.addEventListener('mouseup', e => {
    isDragging=false; simPaused=false;
    setTimeout(()=>{ autoRotate=true; },5000);
    // Click detection - only if mouse didn't move much
    const dist = Math.hypot(e.clientX-mouseDownPos.x, e.clientY-mouseDownPos.y);
    if (dist < 5) handleClick(e);
});

document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx=e.clientX-prevMouse.x, dy=e.clientY-prevMouse.y;
    masterGroup.rotation.y+=dx*0.005;
    masterGroup.rotation.x+=dy*0.005;
    masterGroup.rotation.x=Math.max(-Math.PI/2.2,Math.min(Math.PI/2.2,masterGroup.rotation.x));
    prevMouse={x:e.clientX,y:e.clientY};
});

document.addEventListener('wheel', e => {
    if (e.target.closest('#panel')) return;
    camera.position.z+=e.deltaY*0.003;
    camera.position.z=Math.max(1.3,Math.min(12,camera.position.z));
    camTarget.z=camera.position.z;
});

let lastTouch={x:0,y:0};
document.addEventListener('touchstart',e=>{ lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY}; simPaused=true; autoRotate=false; });
document.addEventListener('touchend',()=>{ simPaused=false; setTimeout(()=>{autoRotate=true;},5000); });
document.addEventListener('touchmove',e=>{ const dx=e.touches[0].clientX-lastTouch.x,dy=e.touches[0].clientY-lastTouch.y; masterGroup.rotation.y+=dx*0.005; masterGroup.rotation.x+=dy*0.005; masterGroup.rotation.x=Math.max(-Math.PI/2.2,Math.min(Math.PI/2.2,masterGroup.rotation.x)); lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY}; });

window.addEventListener('resize',()=>{ camera.aspect=window.innerWidth/window.innerHeight; camera.updateProjectionMatrix(); renderer.setSize(window.innerWidth,window.innerHeight); });

// ============================================================
// CLICK HANDLER - show orbit path
// ============================================================
const clickRaycaster = new THREE.Raycaster();
const clickMouse = new THREE.Vector2();

function handleClick(e) {
    clickMouse.x=(e.clientX/window.innerWidth)*2-1;
    clickMouse.y=-(e.clientY/window.innerHeight)*2+1;
    clickRaycaster.setFromCamera(clickMouse, camera);
    const allSprites=[...earthObjects,...moonObjects].map(o=>o.sprite);
    const hits=clickRaycaster.intersectObjects(allSprites);
    if (hits.length>0) {
        const obj=[...earthObjects,...moonObjects].find(o=>o.sprite===hits[0].object);
        if (obj) {
            const parent = moonObjects.includes(obj) ? moonSelfPivot : masterGroup;
            showOrbitPath(obj, parent);
            showObjectInfo(obj);
        }
    } else {
        // Click empty space - deselect
        if (orbitPathLine) { masterGroup.remove(orbitPathLine); moonSelfPivot.remove(orbitPathLine); orbitPathLine=null; selectedObj=null; }
        document.getElementById('obj-info').style.display='none';
    }
}

function showObjectInfo(obj) {
    const isEarth = earthObjects.includes(obj);
    const altKm = isEarth ? Math.round((obj.r-1)*6371) : Math.round((obj.r/0.27-1)*1737);
    const zone = isEarth ? (altKm<2000?'LEO':altKm<35000?'MEO':'GEO') : 'Lunar Orbit';
    const a = (6371+altKm)*1000;
    const GM = 3.986e14;
    const period = isEarth ? ((2*Math.PI*Math.sqrt(Math.pow(a,3)/GM))/3600).toFixed(2) : 'N/A';
    const velocity = isEarth ? (Math.sqrt(GM/a)/1000).toFixed(2) : 'N/A';
    const inc = (obj.inclination*180/Math.PI).toFixed(1);
    const cols={ISS:'#00ff44',SATELLITE:'#00aaff',DEBRIS:'#ff4444','ROCKET BODY':'#ff8800'};
    const c=cols[obj.type]||'#fff';
    document.getElementById('obj-info').style.display='block';
    document.getElementById('obj-info-content').innerHTML=`
        <div style="color:${c};font-weight:bold;margin-bottom:6px;font-size:0.78rem">${obj.name}</div>
        <div>Type: <span style="color:${c}">${obj.type}</span></div>
        <div>Altitude: <span style="color:#00ccff">~${altKm} km</span></div>
        <div>Orbit Zone: <span style="color:#00ccff">${zone}</span></div>
        <div>Inclination: <span style="color:#00ccff">${inc}°</span></div>
        <div>Orbital Velocity: <span style="color:#00ccff">${velocity} km/s</span></div>
        <div>Orbital Period: <span style="color:#00ccff">${period} hrs</span></div>
        <div style="color:#556677;font-size:0.6rem;margin-top:4px">Click orbit line to deselect</div>
    `;
}

// ============================================================
// TOOLTIP - hover
// ============================================================
const tooltip=document.createElement('div');
tooltip.style.cssText='position:fixed;background:rgba(0,5,20,0.95);color:#00ffcc;padding:8px 12px;border-radius:6px;font-size:0.68rem;pointer-events:none;display:none;border:1px solid rgba(0,255,200,0.3);font-family:Share Tech Mono,monospace;z-index:9999;max-width:220px;line-height:1.6';
document.body.appendChild(tooltip);
const hoverRaycaster=new THREE.Raycaster();
const mouse2D=new THREE.Vector2();

document.addEventListener('mousemove',e=>{
    if(isDragging||e.target.closest('#panel')){tooltip.style.display='none';return;}
    mouse2D.x=(e.clientX/window.innerWidth)*2-1;
    mouse2D.y=-(e.clientY/window.innerHeight)*2+1;
    tooltip.style.left=(e.clientX+16)+'px';
    tooltip.style.top=(e.clientY-10)+'px';
    hoverRaycaster.setFromCamera(mouse2D,camera);
    const allSprites=[...earthObjects,...moonObjects].map(o=>o.sprite);
    const hits=hoverRaycaster.intersectObjects(allSprites);
    if(hits.length>0){
        const obj=[...earthObjects,...moonObjects].find(o=>o.sprite===hits[0].object);
        if(obj){
            const isEarth=earthObjects.includes(obj);
            const altKm=isEarth?Math.round((obj.r-1)*6371):Math.round((obj.r/0.27-1)*1737);
            const zone=isEarth?(altKm<2000?'LEO':altKm<35000?'MEO':'GEO'):'Lunar Orbit';
            const cols={ISS:'#00ff44',SATELLITE:'#00aaff',DEBRIS:'#ff4444','ROCKET BODY':'#ff8800'};
            const c=cols[obj.type]||'#fff';
            tooltip.style.display='block';
            tooltip.innerHTML=`<b style="color:${c}">${obj.name}</b><br>Type: <span style="color:${c}">${obj.type}</span><br>Alt: ~${altKm} km | ${zone}<br><span style="color:#556677;font-size:0.6rem">Click to see orbit path</span>`;
        }
    } else { tooltip.style.display='none'; }
});

// ============================================================
// MOON LABEL
// ============================================================
const moonLabel=document.createElement('div');
moonLabel.style.cssText='position:fixed;color:#aaaaaa;font-size:0.62rem;font-family:Share Tech Mono,monospace;pointer-events:none;z-index:100;text-shadow:0 0 6px #555;letter-spacing:1px';
moonLabel.textContent='🌙 MOON';
document.body.appendChild(moonLabel);

// ============================================================
// KESSLER CASCADE
// ============================================================
let cascadeActive=false,cascadeObjs=[];
function triggerKesslerCascade(altitude){
    if(cascadeActive)return; cascadeActive=true; let gen=0,totalNew=0;
    const iv=setInterval(()=>{
        gen++; const count=Math.floor(8*Math.pow(2,gen)); totalNew+=count;
        for(let i=0;i<Math.min(count,100);i++){
            addEarth({ altKm:altitude+(Math.random()-0.5)*0.04*gen, inclination:Math.random()*180, speed:0.003+Math.random()*0.015, color:new THREE.Color(1,Math.max(0,0.5-gen*0.08),0).getHex(), name:`Cascade-G${gen}-${i}`, type:'DEBRIS' });
            cascadeObjs.push(earthObjects[earthObjects.length-1]);
        }
        document.getElementById('cascade-status').innerHTML=`<span style="color:#ff4444">Gen ${gen}</span> | +${count} fragments | Total: <span style="color:#ff6600">${totalNew}</span>`;
        if(gen>=6){ clearInterval(iv); cascadeActive=false; document.getElementById('cascade-btn').disabled=false; document.getElementById('cascade-status').innerHTML+='<br><span style="color:#ff2200;font-weight:bold">⚠ KESSLER THRESHOLD — ORBIT UNUSABLE</span>'; }
    },900);
}
function resetCascade(){
    cascadeObjs.forEach(o=>{masterGroup.remove(o.sprite);});
    cascadeObjs.forEach(o=>{const i=earthObjects.indexOf(o);if(i>-1)earthObjects.splice(i,1);});
    cascadeObjs=[]; cascadeActive=false;
    document.getElementById('cascade-status').innerHTML='Select zone and trigger simulation';
    document.getElementById('cascade-btn').disabled=false;
}

// ============================================================
// STATS
// ============================================================
document.getElementById('stats').innerHTML=`
    <div><span class="label">Earth Objects</span><span class="value">${earthObjects.length}</span></div>
    <div><span class="label">Debris</span><span class="value" style="color:#ff4444">${earthObjects.filter(o=>o.type==='DEBRIS').length}</span></div>
    <div><span class="label">Satellites</span><span class="value" style="color:#00aaff">${earthObjects.filter(o=>o.type==='SATELLITE'||o.type==='ISS').length}</span></div>
    <div><span class="label">Rocket Bodies</span><span class="value" style="color:#ff8800">${earthObjects.filter(o=>o.type==='ROCKET BODY').length}</span></div>
    <div><span class="label">ISS</span><span class="value" style="color:#00ff44">Active ✓</span></div>
    <div><span class="label">Moon Orbiters</span><span class="value" style="color:#aaaaaa">${moonObjects.length}</span></div>
    <div><span class="label">LEO Risk</span><span class="value" style="color:#ff2200">CRITICAL</span></div>
    <div><span class="label">Data</span><span class="value">CelesTrak</span></div>
`;

// ============================================================
// SIM TIME
// ============================================================
let simSeconds=0;
function updateSimTime(delta){ simSeconds+=delta*3600; const d=new Date(Date.now()+simSeconds*1000); document.getElementById('sim-time').textContent=`SIM TIME: ${d.toUTCString().replace(' GMT','Z')}`; }

// ============================================================
// ANIMATION LOOP
// ============================================================
const clock=new THREE.Clock();

function updateObjects(objects, paused, delta) {
    objects.forEach(obj => {
        if (!paused) obj.angle += obj.speed * delta * 15;
        // Prograde orbit: west to east (correct for LEO/GEO satellites)
        // Negate z so equatorial orbit goes west->east matching Earth rotation
        // High inclination (80-90deg) = north to south to north (polar orbit)
        // Retrograde objects (inc > 90deg) naturally go east to west
        const x = obj.r * Math.cos(obj.angle);
        const y = obj.r * Math.sin(obj.angle) * Math.sin(obj.inclination);
        const z = -obj.r * Math.sin(obj.angle) * Math.cos(obj.inclination);
        obj.sprite.position.set(x,y,z);

        // GRADUAL size scaling based on camera distance
        const dist = camera.position.z;
        const scaleFactor = Math.max(0.8, Math.min(4.0, 7 / dist));
        const s = obj.baseSize * scaleFactor;
        obj.sprite.scale.set(s, s * 0.65, 1);

        // Occlusion culling - hide if behind Earth
        const worldPos = new THREE.Vector3();
        obj.sprite.getWorldPosition(worldPos);
        obj.sprite.visible = !isOccludedByEarth(worldPos);

        // Respect filters
        if (obj.sprite.visible) {
            if (obj.type==='DEBRIS' && !filters.debris) obj.sprite.visible=false;
            if ((obj.type==='SATELLITE'||obj.type==='ISS') && !filters.satellite) obj.sprite.visible=false;
            if (obj.type==='ROCKET BODY' && !filters.rocket) obj.sprite.visible=false;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    const delta=clock.getDelta();

    // Smooth camera
    camera.position.x+=(camTarget.x-camera.position.x)*0.05;
    camera.position.y+=(camTarget.y-camera.position.y)*0.05;
    camera.position.z+=(camTarget.z-camera.position.z)*0.05;

    if(autoRotate&&!isDragging) masterGroup.rotation.y+=0.0005;
    if(!isDragging){ earthPivot.rotation.y+=0.0004; moonMesh.rotation.y+=0.0002; }
    if(!simPaused&&!isDragging) moonOrbitAngle+=0.0006;
    moonOrbitPivot.rotation.y=moonOrbitAngle;

    updateObjects(earthObjects, simPaused, delta);
    updateObjects(moonObjects,  simPaused, delta);

    // Moon label - hide if behind Earth
    const mwp=new THREE.Vector3(); moonMesh.getWorldPosition(mwp); mwp.project(camera);
    const mx=(mwp.x*0.5+0.5)*window.innerWidth, my=(-mwp.y*0.5+0.5)*window.innerHeight;
    const moonWorldPos2=new THREE.Vector3(); moonMesh.getWorldPosition(moonWorldPos2);
    if(mwp.z<1 && !isOccludedByEarth(moonWorldPos2)){
        moonLabel.style.display='block'; moonLabel.style.left=(mx+20)+'px'; moonLabel.style.top=(my-8)+'px';
    } else moonLabel.style.display='none';

    updateSimTime(delta);
    renderer.render(scene,camera);
}

animate();