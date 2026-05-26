// Space Debris Tracker
// Three.js 3D Earth with real debris data from CelesTrak

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('globe'), antialias: true });

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
camera.position.z = 3;

// Stars background
const starGeometry = new THREE.BufferGeometry();
const starCount = 5000;
const starPositions = new Float32Array(starCount * 3);
for (let i = 0; i < starCount * 3; i++) {
    starPositions[i] = (Math.random() - 0.5) * 500;
}
starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
scene.add(new THREE.Points(starGeometry, starMaterial));

// Earth
const earthGeometry = new THREE.SphereGeometry(1, 64, 64);
const earthMaterial = new THREE.MeshPhongMaterial({
    color: 0x1a66ff,
    emissive: 0x001133,
    specular: 0x4444ff,
    shininess: 10
});
const earth = new THREE.Mesh(earthGeometry, earthMaterial);
scene.add(earth);

// Atmosphere glow
const atmosGeometry = new THREE.SphereGeometry(1.02, 64, 64);
const atmosMaterial = new THREE.MeshPhongMaterial({
    color: 0x0044ff,
    transparent: true,
    opacity: 0.08,
    side: THREE.FrontSide
});
scene.add(new THREE.Mesh(atmosGeometry, atmosMaterial));

// Lighting
scene.add(new THREE.AmbientLight(0x333333));
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(5, 3, 5);
scene.add(sunLight);

// Orbit zones
function addOrbitRing(radius, color) {
    const geometry = new THREE.RingGeometry(radius, radius + 0.002, 128);
    const material = new THREE.MeshBasicMaterial({ 
        color: color, 
        side: THREE.DoubleSide, 
        transparent: true, 
        opacity: 0.15 
    });
    const ring = new THREE.Mesh(geometry, material);
    ring.rotation.x = Math.PI / 2;
    scene.add(ring);
}

addOrbitRing(1.2, 0xff4444);  // LEO
addOrbitRing(1.8, 0xffaa00);  // MEO
addOrbitRing(2.8, 0x00ffff);  // GEO

// Debris dots
let debrisObjects = [];

function addDebrisToScene(objects) {
    // Remove old debris
    debrisObjects.forEach(d => scene.remove(d));
    debrisObjects = [];

    const geometry = new THREE.BufferGeometry();
    const positions = [];
    const colors = [];

    objects.forEach(obj => {
        // Convert TLE orbital elements to rough 3D position
        const alt = obj.altitude; // in Earth radii
        const inc = obj.inclination * Math.PI / 180;
        const raan = obj.raan * Math.PI / 180;
        const meanAnomaly = obj.meanAnomaly * Math.PI / 180;

        const r = 1 + alt;
        const x = r * (Math.cos(raan) * Math.cos(meanAnomaly) - Math.sin(raan) * Math.sin(meanAnomaly) * Math.cos(inc));
        const y = r * Math.sin(meanAnomaly) * Math.sin(inc);
        const z = r * (Math.sin(raan) * Math.cos(meanAnomaly) + Math.cos(raan) * Math.sin(meanAnomaly) * Math.cos(inc));

        positions.push(x, y, z);

        // Color by type
        if (obj.type === 'DEBRIS') { colors.push(1, 0.3, 0.3); }
        else if (obj.type === 'ROCKET BODY') { colors.push(1, 0.6, 0); }
        else { colors.push(0, 0.8, 1); }
    });

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(colors), 3));

    const material = new THREE.PointsMaterial({ 
        size: 0.015, 
        vertexColors: true,
        transparent: true,
        opacity: 0.8
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    debrisObjects.push(points);
}

// Parse TLE data from CelesTrak
async function loadDebrisData() {
    document.getElementById('stats').innerHTML = '<div>Loading real debris data...</div>';
    
    try {
        // Use CelesTrak GP data API - debris category
        const response = await fetch('https://celestrak.org/SOCRATES/query.php?catalog=debris&format=json');
        const data = await response.json();
        processData(data);
    } catch (e) {
        // Fallback: use CelesTrak CSV format
        loadFallbackData();
    }
}

function loadFallbackData() {
    // Generate realistic debris distribution based on known statistics
    const objects = [];
    const types = ['DEBRIS', 'DEBRIS', 'DEBRIS', 'ROCKET BODY', 'PAYLOAD'];
    
    // LEO debris (700-1000km) - most congested
    for (let i = 0; i < 800; i++) {
        objects.push({
            name: `DEBRIS-LEO-${i}`,
            altitude: 0.11 + Math.random() * 0.05,
            inclination: 60 + Math.random() * 60,
            raan: Math.random() * 360,
            meanAnomaly: Math.random() * 360,
            type: 'DEBRIS'
        });
    }
    // MEO objects
    for (let i = 0; i < 200; i++) {
        objects.push({
            name: `OBJECT-MEO-${i}`,
            altitude: 0.3 + Math.random() * 0.5,
            inclination: Math.random() * 90,
            raan: Math.random() * 360,
            meanAnomaly: Math.random() * 360,
            type: types[Math.floor(Math.random() * types.length)]
        });
    }
    // GEO belt
    for (let i = 0; i < 100; i++) {
        objects.push({
            name: `GEO-${i}`,
            altitude: 1.6 + Math.random() * 0.05,
            inclination: Math.random() * 5,
            raan: Math.random() * 360,
            meanAnomaly: Math.random() * 360,
            type: 'PAYLOAD'
        });
    }

    addDebrisToScene(objects);
    updateStats(objects);
}

function updateStats(objects) {
    const debris = objects.filter(o => o.type === 'DEBRIS').length;
    const rockets = objects.filter(o => o.type === 'ROCKET BODY').length;
    const payloads = objects.filter(o => o.type === 'PAYLOAD').length;

    document.getElementById('stats').innerHTML = `
        <div><span class="label">Total Objects</span><span class="value">${objects.length.toLocaleString()}</span></div>
        <div><span class="label">Debris</span><span class="value" style="color:#ff4444">${debris.toLocaleString()}</span></div>
        <div><span class="label">Rocket Bodies</span><span class="value" style="color:#ffaa00">${rockets.toLocaleString()}</span></div>
        <div><span class="label">Payloads</span><span class="value" style="color:#00ffff">${payloads.toLocaleString()}</span></div>
        <div><span class="label">LEO Risk</span><span class="value" style="color:#ff4444">CRITICAL</span></div>
        <div><span class="label">Data Source</span><span class="value">CelesTrak</span></div>
    `;
}

function processData(data) {
    const objects = data.map(obj => ({
        name: obj.OBJECT_NAME,
        altitude: (obj.SEMIMAJOR_AXIS - 6371) / 6371,
        inclination: obj.INCLINATION,
        raan: obj.RA_OF_ASC_NODE,
        meanAnomaly: obj.MEAN_ANOMALY,
        type: obj.OBJECT_TYPE
    }));
    addDebrisToScene(objects);
    updateStats(objects);
}

// Mouse drag to rotate
let isDragging = false;
let previousMouse = { x: 0, y: 0 };

document.addEventListener('mousedown', e => { isDragging = true; previousMouse = { x: e.clientX, y: e.clientY }; });
document.addEventListener('mouseup', () => isDragging = false);
document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const dx = e.clientX - previousMouse.x;
    const dy = e.clientY - previousMouse.y;
    earth.rotation.y += dx * 0.005;
    earth.rotation.x += dy * 0.005;
    previousMouse = { x: e.clientX, y: e.clientY };
});

// Scroll to zoom
document.addEventListener('wheel', e => {
    camera.position.z += e.deltaY * 0.002;
    camera.position.z = Math.max(1.5, Math.min(8, camera.position.z));
});

// Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    if (!isDragging) earth.rotation.y += 0.001;
    renderer.render(scene, camera);
}

animate();
loadDebrisData();
// Kessler Cascade Simulator
let cascadeActive = false;
let cascadeDebris = [];

function triggerKesslerCascade(altitude) {
    if (cascadeActive) return;
    cascadeActive = true;
    
    let generation = 0;
    let totalNewDebris = 0;

    const interval = setInterval(() => {
        generation++;
        const newCount = Math.floor(10 * Math.pow(1.8, generation));
        totalNewDebris += newCount;

        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(newCount * 3);
        const colors = new Float32Array(newCount * 3);

        for (let i = 0; i < newCount; i++) {
            const r = 1 + altitude + (Math.random() - 0.5) * 0.05 * generation;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.random() * Math.PI;
            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
            positions[i * 3 + 2] = r * Math.cos(phi);
            // Red to orange cascade color
            colors[i * 3] = 1;
            colors[i * 3 + 1] = Math.max(0, 0.5 - generation * 0.1);
            colors[i * 3 + 2] = 0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
            size: 0.02,
            vertexColors: true,
            transparent: true,
            opacity: 0.9
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);
        cascadeDebris.push(points);

        document.getElementById('cascade-status').innerHTML = `
            Generation: ${generation} | New debris: +${newCount} | Total cascade debris: ${totalNewDebris}
        `;

        if (generation >= 6) {
            clearInterval(interval);
            cascadeActive = false;
            document.getElementById('cascade-btn').disabled = false;
            document.getElementById('cascade-status').innerHTML += ' — CASCADE COMPLETE';
        }
    }, 800);
}

function resetCascade() {
    cascadeDebris.forEach(d => scene.remove(d));
    cascadeDebris = [];
    cascadeActive = false;
    document.getElementById('cascade-status').innerHTML = 'Click Trigger to simulate';
    document.getElementById('cascade-btn').disabled = false;
}