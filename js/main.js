// ============================================================
// SPACE DEBRIS TRACKER - v4 Master Group Fix
// Single masterGroup contains Earth + Moon + all satellites
// Drag rotates masterGroup = everything moves together
// ============================================================

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('globe'), antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
camera.position.set(0, 0, 6);

// ============================================================
// STARS - in scene directly, never rotate
// ============================================================
const starGeo = new THREE.BufferGeometry();
const starPos = new Float32Array(12000 * 3);
for (let i = 0; i < 12000 * 3; i++) starPos[i] = (Math.random() - 0.5) * 800;
starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.9 })));

// ============================================================
// MASTER GROUP - contains EVERYTHING except stars
// Rotating this rotates the entire Earth-Moon system
// ============================================================
const masterGroup = new THREE.Group();
scene.add(masterGroup);

// ============================================================
// LIGHTING
// ============================================================
scene.add(new THREE.AmbientLight(0x222233, 1.5));
const sun = new THREE.DirectionalLight(0xfff5e0, 2.2);
sun.position.set(6, 2, 4);
scene.add(sun);

// ============================================================
// TEXTURE LOADER
// ============================================================
const TL = new THREE.TextureLoader();

// ============================================================
// EARTH - inside masterGroup
// ============================================================
const earthPivot = new THREE.Group(); // Earth self-rotation pivot
masterGroup.add(earthPivot);

const earthMat = new THREE.MeshPhongMaterial({ specular: new THREE.Color(0x111111), shininess: 8 });
TL.load('textures/earth.jpg', tex => { earthMat.map = tex; earthMat.needsUpdate = true; }, undefined, () => { earthMat.color.setHex(0x1a5fba); });
earthPivot.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), earthMat));

const cloudMat = new THREE.MeshPhongMaterial({ transparent: true, opacity: 0.35, depthWrite: false });
TL.load('textures/clouds.png', tex => { cloudMat.map = tex; cloudMat.needsUpdate = true; }, undefined, () => { cloudMat.opacity = 0; });
earthPivot.add(new THREE.Mesh(new THREE.SphereGeometry(1.012, 64, 64), cloudMat));

earthPivot.add(new THREE.Mesh(new THREE.SphereGeometry(1.05, 64, 64),
    new THREE.MeshPhongMaterial({ color: 0x3377ff, transparent: true, opacity: 0.07, side: THREE.FrontSide, depthWrite: false })));

// Earth orbit rings - inside masterGroup so they rotate with everything
function addRing(parent, radius, color, opacity) {
    const pts = [];
    for (let i = 0; i <= 256; i++) { const a = (i/256)*Math.PI*2; pts.push(new THREE.Vector3(Math.cos(a)*radius, 0, Math.sin(a)*radius)); }
    parent.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity })));
}
addRing(masterGroup, 1.065, 0x00ff44, 0.35);
addRing(masterGroup, 1.11,  0xff3300, 0.3);
addRing(masterGroup, 1.157, 0xff6600, 0.18);
addRing(masterGroup, 2.625, 0x00ccff, 0.1);

// ============================================================
// MOON SYSTEM - inside masterGroup at offset position
// moonOrbitPivot handles Moon's orbital revolution around Earth
// moonSelfPivot handles Moon's own rotation + its satellites
// ============================================================
const moonOrbitPivot = new THREE.Group(); // orbits around Earth
masterGroup.add(moonOrbitPivot);

const moonSelfPivot = new THREE.Group(); // Moon's position + satellite host
moonSelfPivot.position.set(4.5, 0, 0); // Moon distance from Earth
moonOrbitPivot.add(moonSelfPivot);

// Moon sphere
const moonMat = new THREE.MeshPhongMaterial({ color: 0x999999, shininess: 3 });
TL.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/moon_1024.jpg',
    tex => { moonMat.map = tex; moonMat.needsUpdate = true; },
    undefined, () => { moonMat.color.setHex(0x888888); });
const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(0.27, 32, 32), moonMat);
moonSelfPivot.add(moonMesh);

// Moon atmosphere
moonSelfPivot.add(new THREE.Mesh(new THREE.SphereGeometry(0.285, 32, 32),
    new THREE.MeshPhongMaterial({ color: 0x555555, transparent: true, opacity: 0.04, side: THREE.FrontSide, depthWrite: false })));

// Moon orbit ring around Earth - in masterGroup
addRing(masterGroup, 4.5, 0x666666, 0.15);

// Moon satellite rings - in moonSelfPivot so they move with Moon
addRing(moonSelfPivot, 0.38, 0x00ffff, 0.5);
addRing(moonSelfPivot, 0.50, 0xffff00, 0.4);
addRing(moonSelfPivot, 0.43, 0xff8800, 0.4);

// ============================================================
// SPRITE TEXTURES
// ============================================================
function makeCanvas(w, h, fn) { const c = document.createElement('canvas'); c.width=w; c.height=h; fn(c.getContext('2d')); return new THREE.CanvasTexture(c); }

const issTexture = makeCanvas(64, 64, ctx => {
    ctx.fillStyle='#aaaaaa'; ctx.fillRect(22,27,20,10);
    ctx.fillStyle='#4488ff';
    ctx.fillRect(2,25,18,6); ctx.fillRect(2,33,18,6);
    ctx.fillRect(44,25,18,6); ctx.fillRect(44,33,18,6);
    ctx.fillStyle='#ffffff'; ctx.fillRect(28,29,8,6);
});
const satTexture = makeCanvas(32, 32, ctx => {
    ctx.fillStyle='#888888'; ctx.fillRect(11,12,10,8);
    ctx.fillStyle='#2255cc'; ctx.fillRect(1,13,8,6); ctx.fillRect(23,13,8,6);
});
const debrisTexture = makeCanvas(16, 16, ctx => {
    ctx.fillStyle='#cc3311'; ctx.beginPath();
    ctx.moveTo(8,1); ctx.lineTo(14,5); ctx.lineTo(13,13); ctx.lineTo(5,14); ctx.lineTo(1,7); ctx.closePath(); ctx.fill();
});
const rocketTexture = makeCanvas(20, 32, ctx => {
    ctx.fillStyle='#cc6600'; ctx.fillRect(7,6,6,18);
    ctx.fillStyle='#ffaa00'; ctx.beginPath(); ctx.moveTo(7,6); ctx.lineTo(10,1); ctx.lineTo(13,6); ctx.fill();
    ctx.fillStyle='#ff4400'; ctx.fillRect(4,22,4,6); ctx.fillRect(12,22,4,6);
});
function getTex(type) {
    if (type==='ISS') return issTexture;
    if (type==='SATELLITE') return satTexture;
    if (type==='ROCKET BODY') return rocketTexture;
    return debrisTexture;
}

// ============================================================
// OBJECT CREATION
// ============================================================
const earthObjects = [];
const moonObjects  = [];

function createObj(parent, store, cfg) {
    const { altitude, inclination, speed, color, dotSize, name, type } = cfg;
    const dot = new THREE.Mesh(new THREE.SphereGeometry(dotSize,5,5), new THREE.MeshBasicMaterial({ color }));
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: getTex(type), transparent: true, depthTest: false }));
    sprite.visible = false;
    parent.add(dot); parent.add(sprite);
    store.push({ dot, sprite, r: altitude, angle: Math.random()*Math.PI*2, speed, inclination: inclination*Math.PI/180, name, type });
}

// Earth objects - parent is masterGroup, altitude = 1 + km
function addEarth(cfg) { cfg.altitude = 1 + cfg.altKm; createObj(masterGroup, earthObjects, cfg); }
// Moon objects - parent is moonSelfPivot, altitude = radius from Moon center
function addMoon(cfg) { createObj(moonSelfPivot, moonObjects, cfg); }

// EARTH OBJECTS
addEarth({ altKm:0.063, inclination:51.6, speed:0.018, color:0x00ff44, dotSize:0.013, name:'ISS — International Space Station', type:'ISS' });
addEarth({ altKm:0.085, inclination:28.5, speed:0.015, color:0xffff00, dotSize:0.009, name:'Hubble Space Telescope', type:'SATELLITE' });
for (let i=0;i<24;i++) addEarth({ altKm:0.32, inclination:55+(i%3)*5, speed:0.002+Math.random()*0.001, color:0x0088ff, dotSize:0.006, name:`GPS Block III-${i+1}`, type:'SATELLITE' });
for (let i=0;i<60;i++) addEarth({ altKm:0.087+Math.random()*0.01, inclination:53+Math.random()*5, speed:0.012+Math.random()*0.004, color:0x88ccff, dotSize:0.004, name:`Starlink-${1000+i}`, type:'SATELLITE' });
for (let i=0;i<350;i++) addEarth({ altKm:0.075+Math.random()*0.18, inclination:Math.random()*180, speed:0.004+Math.random()*0.012, color:0xff2200, dotSize:0.003, name:`Debris Fragment ${i}`, type:'DEBRIS' });
for (let i=0;i<60;i++) addEarth({ altKm:0.1+Math.random()*0.3, inclination:Math.random()*120, speed:0.002+Math.random()*0.007, color:0xff8800, dotSize:0.007, name:`Rocket Body ${i}`, type:'ROCKET BODY' });
for (let i=0;i<80;i++) addEarth({ altKm:0.28+Math.random()*0.5, inclination:Math.random()*90, speed:0.001+Math.random()*0.003, color:0xdd4400, dotSize:0.005, name:`MEO Debris ${i}`, type:'DEBRIS' });
for (let i=0;i<40;i++) addEarth({ altKm:1.61+Math.random()*0.04, inclination:Math.random()*2, speed:0.0003, color:0x00ffcc, dotSize:0.006, name:`GEO Satellite ${i}`, type:'SATELLITE' });

// MOON OBJECTS
addMoon({ altitude:0.38, inclination:0,  speed:0.08, color:0x00ffff, dotSize:0.008, name:'Lunar Reconnaissance Orbiter (NASA)', type:'SATELLITE' });
addMoon({ altitude:0.50, inclination:57, speed:0.05, color:0xffff00, dotSize:0.006, name:'CAPSTONE CubeSat (Halo Orbit)', type:'SATELLITE' });
addMoon({ altitude:0.43, inclination:90, speed:0.06, color:0xff8800, dotSize:0.007, name:'Chandrayaan-2 Orbiter (ISRO)', type:'SATELLITE' });
for (let i=0;i<12;i++) addMoon({ altitude:0.33+Math.random()*0.15, inclination:Math.random()*180, speed:0.03+Math.random()*0.05, color:0xff4400, dotSize:0.004, name:`Lunar Debris / Apollo Hardware ${i+1}`, type:'DEBRIS' });

// ============================================================
// MOUSE CONTROLS - rotate masterGroup
// ============================================================
let isDragging = false;
let simPaused  = false;
let autoRotate = true;
let prevMouse  = { x:0, y:0 };

document.addEventListener('mousedown', e => {
    isDragging=true; simPaused=true; autoRotate=false;
    prevMouse={x:e.clientX, y:e.clientY};
});
document.addEventListener('mouseup', () => {
    isDragging=false; simPaused=false;
    setTimeout(()=>{ autoRotate=true; }, 5000);
});
document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - prevMouse.x;
    const dy = e.clientY - prevMouse.y;
    masterGroup.rotation.y += dx * 0.005;
    masterGroup.rotation.x += dy * 0.005;
    masterGroup.rotation.x = Math.max(-Math.PI/2.2, Math.min(Math.PI/2.2, masterGroup.rotation.x));
    prevMouse = {x:e.clientX, y:e.clientY};
});

document.addEventListener('wheel', e => {
    camera.position.z += e.deltaY * 0.003;
    camera.position.z = Math.max(1.3, Math.min(12, camera.position.z));
});

let lastTouch = {x:0,y:0};
document.addEventListener('touchstart', e => { lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY}; simPaused=true; autoRotate=false; });
document.addEventListener('touchend', () => { simPaused=false; setTimeout(()=>{autoRotate=true;},5000); });
document.addEventListener('touchmove', e => {
    const dx=e.touches[0].clientX-lastTouch.x, dy=e.touches[0].clientY-lastTouch.y;
    masterGroup.rotation.y+=dx*0.005; masterGroup.rotation.x+=dy*0.005;
    masterGroup.rotation.x=Math.max(-Math.PI/2.2,Math.min(Math.PI/2.2,masterGroup.rotation.x));
    lastTouch={x:e.touches[0].clientX,y:e.touches[0].clientY};
});

window.addEventListener('resize', () => {
    camera.aspect=window.innerWidth/window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth,window.innerHeight);
});

// ============================================================
// TOOLTIP
// ============================================================
const tooltip = document.createElement('div');
tooltip.style.cssText='position:fixed;background:rgba(0,5,20,0.95);color:#00ffcc;padding:9px 14px;border-radius:6px;font-size:0.72rem;pointer-events:none;display:none;border:1px solid rgba(0,255,200,0.3);font-family:Courier New,monospace;z-index:9999;max-width:240px;line-height:1.6';
document.body.appendChild(tooltip);
const raycaster = new THREE.Raycaster();
const mouse2D = new THREE.Vector2();

document.addEventListener('mousemove', e => {
    if (isDragging) { tooltip.style.display='none'; return; }
    mouse2D.x=(e.clientX/window.innerWidth)*2-1;
    mouse2D.y=-(e.clientY/window.innerHeight)*2+1;
    tooltip.style.left=(e.clientX+16)+'px';
    tooltip.style.top=(e.clientY-10)+'px';
    raycaster.setFromCamera(mouse2D, camera);
    const allDots=[...earthObjects,...moonObjects].map(o=>o.dot);
    const hits=raycaster.intersectObjects(allDots);
    if (hits.length>0) {
        const obj=[...earthObjects,...moonObjects].find(o=>o.dot===hits[0].object);
        if (obj) {
            const isEarth=earthObjects.includes(obj);
            const altKm=isEarth?Math.round((obj.r-1)*6371):Math.round(obj.r*1737);
            const zone=isEarth?(altKm<2000?'LEO':altKm<35000?'MEO':'GEO'):'Lunar Orbit';
            const cols={ISS:'#00ff44',SATELLITE:'#00aaff',DEBRIS:'#ff4444','ROCKET BODY':'#ff8800'};
            const c=cols[obj.type]||'#fff';
            tooltip.style.display='block';
            tooltip.innerHTML=`<b style="color:${c}">${obj.name}</b><br>Type:<span style="color:${c}"> ${obj.type}</span><br>Altitude: ~${altKm} km<br>Zone: ${zone}`;
        }
    } else { tooltip.style.display='none'; }
});

// ============================================================
// MOON LABEL
// ============================================================
const moonLabel = document.createElement('div');
moonLabel.style.cssText='position:fixed;color:#aaaaaa;font-size:0.65rem;font-family:Courier New,monospace;pointer-events:none;z-index:100;text-shadow:0 0 6px #555';
moonLabel.textContent='🌙 Moon';
document.body.appendChild(moonLabel);

// ============================================================
// KESSLER CASCADE
// ============================================================
let cascadeActive=false, cascadeObjs=[];
function triggerKesslerCascade(altitude) {
    if (cascadeActive) return;
    cascadeActive=true; let gen=0,totalNew=0;
    const iv=setInterval(()=>{
        gen++; const count=Math.floor(8*Math.pow(2,gen)); totalNew+=count;
        for (let i=0;i<Math.min(count,100);i++) {
            addEarth({ altKm:altitude+(Math.random()-0.5)*0.04*gen, inclination:Math.random()*180, speed:0.003+Math.random()*0.015, color:new THREE.Color(1,Math.max(0,0.5-gen*0.08),0).getHex(), dotSize:0.003, name:`Cascade-G${gen}-${i}`, type:'DEBRIS' });
            cascadeObjs.push(earthObjects[earthObjects.length-1]);
        }
        document.getElementById('cascade-status').innerHTML=`<span style="color:#ff4444">Gen ${gen}</span> | +${count} | Total: <span style="color:#ff6600">${totalNew}</span>`;
        if (gen>=6){ clearInterval(iv); cascadeActive=false; document.getElementById('cascade-btn').disabled=false; document.getElementById('cascade-status').innerHTML+='<br><span style="color:#ff2200">⚠ ORBIT UNUSABLE</span>'; }
    },900);
}
function resetCascade() {
    cascadeObjs.forEach(o=>{masterGroup.remove(o.dot);masterGroup.remove(o.sprite);});
    cascadeObjs.forEach(o=>{const i=earthObjects.indexOf(o);if(i>-1)earthObjects.splice(i,1);});
    cascadeObjs=[]; cascadeActive=false;
    document.getElementById('cascade-status').innerHTML='Select orbit and trigger';
    document.getElementById('cascade-btn').disabled=false;
}

// ============================================================
// STATS
// ============================================================
document.getElementById('stats').innerHTML=`
    <div><span class="label">Earth Objects</span><span class="value">${earthObjects.length}</span></div>
    <div><span class="label">Debris</span><span class="value" style="color:#ff4444">${earthObjects.filter(o=>o.type==='DEBRIS').length}</span></div>
    <div><span class="label">Satellites</span><span class="value" style="color:#00aaff">${earthObjects.filter(o=>o.type==='SATELLITE').length}</span></div>
    <div><span class="label">Rocket Bodies</span><span class="value" style="color:#ff8800">${earthObjects.filter(o=>o.type==='ROCKET BODY').length}</span></div>
    <div><span class="label">ISS</span><span class="value" style="color:#00ff44">Active ✓</span></div>
    <div><span class="label">Moon Orbiters</span><span class="value" style="color:#aaaaaa">${moonObjects.length}</span></div>
    <div><span class="label">LEO Risk</span><span class="value" style="color:#ff2200">CRITICAL</span></div>
    <div><span class="label">Data</span><span class="value">CelesTrak</span></div>
`;

// ============================================================
// ANIMATION LOOP
// ============================================================
const clock = new THREE.Clock();
let moonOrbitAngle = 0;

function updateObjects(objects, paused, delta, zoomed) {
    objects.forEach(obj => {
        if (!paused) obj.angle += obj.speed * delta * 15;
        const x = obj.r * Math.cos(obj.angle);
        const y = obj.r * Math.sin(obj.angle) * Math.sin(obj.inclination);
        const z = obj.r * Math.sin(obj.angle) * Math.cos(obj.inclination);
        obj.dot.position.set(x, y, z);
        obj.sprite.position.set(x, y, z);
        if (zoomed) {
            obj.dot.visible=false; obj.sprite.visible=true;
            const s=obj.type==='ISS'?0.12:obj.type==='DEBRIS'?0.04:0.07;
            obj.sprite.scale.set(s, s*0.6, 1);
        } else {
            obj.dot.visible=true; obj.sprite.visible=false;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    const zoomed = camera.position.z < 2.5;

    // Auto rotate entire system
    if (autoRotate && !isDragging) masterGroup.rotation.y += 0.0005;

    // Earth self rotation - stop during drag
    if (!isDragging) earthPivot.rotation.y += 0.0004;

    // Moon orbits Earth - rotate moonOrbitPivot
    if (!simPaused && !isDragging) moonOrbitAngle += 0.0006;
    moonOrbitPivot.rotation.y = moonOrbitAngle;

    // Moon self rotation - stop during drag
    if (!isDragging) moonMesh.rotation.y += 0.0002;

    // Update Earth satellite positions
    updateObjects(earthObjects, simPaused, delta, zoomed);

    // Update Moon satellite positions (relative to moonSelfPivot)
    updateObjects(moonObjects, simPaused, delta, zoomed);

    // Moon label screen position
    const mwp = new THREE.Vector3();
    moonMesh.getWorldPosition(mwp);
    mwp.project(camera);
    const mx=(mwp.x*0.5+0.5)*window.innerWidth;
    const my=(-mwp.y*0.5+0.5)*window.innerHeight;
    if (mwp.z<1) {
        moonLabel.style.display='block';
        moonLabel.style.left=(mx+20)+'px';
        moonLabel.style.top=(my-8)+'px';
    } else { moonLabel.style.display='none'; }

    renderer.render(scene, camera);
}

animate();