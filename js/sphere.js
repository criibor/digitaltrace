import * as THREE from 'three';

const container = document.getElementById('sphere-container');

// --- Theme handling ---
const themeToggle = document.getElementById('theme-toggle');
const applyTheme = (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
};
const savedTheme = localStorage.getItem('theme')
  || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
applyTheme(savedTheme);
themeToggle.addEventListener('click', () => {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
});

// --- Daten laden ---
fetch('data/inhalte.json')
  .then((res) => res.json())
  .then((kategorien) => initSphere(kategorien))
  .catch((err) => {
    console.error('Konnte inhalte.json nicht laden:', err);
  });

// Gleichmäßig verteilte "Zentren" für n Kategorien im Raum (Fibonacci)
function getClusterCenters(n) {
  const centers = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / Math.max(n - 1, 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    centers.push(new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r));
  }
  return centers;
}

// Scharfe, kreisförmige Punkt-Textur (harte Kante, kein Blur)
function makeDotTexture() {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = false;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

function buildPointsMesh(positions, colors, size, dotTexture) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions.slice(), 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();

  const material = new THREE.PointsMaterial({
    map: dotTexture,
    size,
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    alphaTest: 0.5,
    depthWrite: true
  });

  const points = new THREE.Points(geometry, material);

  // Für das Schweben: Basisposition + zufällige Phase/Amplitude pro Punkt
  const count = positions.length / 3;
  const phases = new Float32Array(count * 3);
  const amps = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    phases[i] = Math.random() * Math.PI * 2;
    amps[i] = 0.05 + Math.random() * 0.07; // deutlicheres, aber weiches Schweben
  }

  return { points, basePositions: positions, phases, amps };
}

function initSphere(kategorien) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(
    50,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );
  camera.position.z = 9;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  const group = new THREE.Group();
  scene.add(group);

  const baseRadius = 4.2;
  const dotTexture = makeDotTexture();
  const clusterCenters = getClusterCenters(kategorien.length);

  // zwei Größen-Ebenen für Tiefenwirkung: viele kleine, wenige größere Punkte
  const smallPositions = [];
  const smallColors = [];
  const largePositions = [];
  const largeColors = [];

  kategorien.forEach((kategorie, kIdx) => {
    const center = clusterCenters[kIdx];
    const color = new THREE.Color(kategorie.farbe || '#999999');

    const punkteProEintrag = 140;
    const anzahl = kategorie.eintraege
      ? kategorie.eintraege.length * punkteProEintrag
      : 500;

    // Mehrere "Trace"-Linien pro Kategorie, die alle vom Ursprung (0,0,0)
    // ausgehen und sich Richtung Kategorie-Zentrum auffächern
    const numTraces = 9 + Math.floor(Math.random() * 6);
    const traces = [];
    for (let t = 0; t < numTraces; t++) {
      const traceDir = center
        .clone()
        .add(
          new THREE.Vector3(
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5,
            (Math.random() - 0.5) * 0.5
          )
        )
        .normalize();

      // zwei zueinander und zur Trace-Richtung orthogonale Achsen für seitlichen Versatz
      const helper = Math.abs(traceDir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const perp1 = new THREE.Vector3().crossVectors(traceDir, helper).normalize();
      const perp2 = new THREE.Vector3().crossVectors(traceDir, perp1).normalize();

      traces.push({
        dir: traceDir,
        perp1,
        perp2,
        length: 0.75 + Math.random() * 0.4,
        // Jede Trace bekommt eigene Kurven-Parameter -> organisch statt gerade
        curveFreqA: 2 + Math.random() * 4,
        curveFreqB: 2 + Math.random() * 4,
        curvePhaseA: Math.random() * Math.PI * 2,
        curvePhaseB: Math.random() * Math.PI * 2,
        curveAmp: 0.3 + Math.random() * 0.5
      });
    }

    const punkteProTrace = Math.floor(anzahl / numTraces);

    traces.forEach((trace) => {
      for (let i = 0; i < punkteProTrace; i++) {
        // t=0 nahe am Ursprung, t=1 am äußeren Ende der Trace-Linie
        const t = Math.pow(Math.random(), 0.6) * trace.length;
        const radius = baseRadius * t;

        // organische Krümmung: wächst mit der Distanz vom Ursprung,
        // sodass die Trace sanft ausschwingt statt einer geraden Linie zu folgen
        const curveA = Math.sin(t * trace.curveFreqA + trace.curvePhaseA) * trace.curveAmp * t;
        const curveB = Math.sin(t * trace.curveFreqB + trace.curvePhaseB) * trace.curveAmp * t;

        // zusätzliches feines Rauschen -> ausfransend/wolkig am Ende
        const lateralSpread = 0.12 + t * 0.6;
        const a = curveA + (Math.random() - 0.5) * lateralSpread;
        const b = curveB + (Math.random() - 0.5) * lateralSpread;

        const position = trace.dir
          .clone()
          .multiplyScalar(radius)
          .add(trace.perp1.clone().multiplyScalar(a))
          .add(trace.perp2.clone().multiplyScalar(b));

        if (Math.random() < 0.25) {
          largePositions.push(position.x, position.y, position.z);
          largeColors.push(color.r, color.g, color.b);
        } else {
          smallPositions.push(position.x, position.y, position.z);
          smallColors.push(color.r, color.g, color.b);
        }
      }
    });
  });

  const smallCloud = buildPointsMesh(smallPositions, smallColors, 0.09, dotTexture);
  const largeCloud = buildPointsMesh(largePositions, largeColors, 0.2, dotTexture);
  group.add(smallCloud.points);
  group.add(largeCloud.points);

  // Unsichtbares Hüll-Objekt als verlässliches Klick-/Hover-Ziel
  const hitGeo = new THREE.SphereGeometry(baseRadius * 1.05, 24, 24);
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  const hitSphere = new THREE.Mesh(hitGeo, hitMat);
  group.add(hitSphere);

  // --- Inhaltsverzeichnis (Dropdown neben About) ---
  const tocToggle = document.getElementById('toc-toggle');
  const tocPanel = document.getElementById('toc-panel');
  tocPanel.innerHTML = kategorien
    .map(
      (k) => `
      <a class="toc-entry" href="pages/${k.id}.html">
        <span class="toc-dot" style="background:${k.farbe}"></span>${k.titel}
      </a>`
    )
    .join('');
  tocToggle.addEventListener('click', () => {
    tocPanel.classList.toggle('open');
  });

  // --- Raycasting: Klick auf die Sphere führt zu Final Piece ---
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let didDrag = false;

  renderer.domElement.addEventListener('click', (e) => {
    if (didDrag) return;
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(hitSphere);
    if (intersects.length > 0) {
      window.location.href = `pages/final-piece.html`;
    }
  });

  renderer.domElement.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(hitSphere);
    renderer.domElement.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
  });

  // --- Drag-Rotation ---
  let isDragging = false;
  let prevX = 0;
  let prevY = 0;
  let rotationVelocity = { x: 0, y: 0.0022 };

  renderer.domElement.addEventListener('mousedown', (e) => {
    isDragging = true;
    didDrag = false;
    prevX = e.clientX;
    prevY = e.clientY;
  });
  window.addEventListener('mouseup', () => { isDragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag = true;
    group.rotation.y += dx * 0.005;
    group.rotation.x += dy * 0.005;
    rotationVelocity = { x: dy * 0.0003, y: dx * 0.0003 };
    prevX = e.clientX;
    prevY = e.clientY;
  });

  // --- Zoom via Scroll ---
  window.addEventListener(
    'wheel',
    (e) => {
      camera.position.z += e.deltaY * 0.01;
      camera.position.z = Math.max(5, Math.min(16, camera.position.z));
    },
    { passive: true }
  );

  // --- Resize ---
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // --- Animationsloop ---
  const clock = new THREE.Clock();
  let parallaxX = 0;
  let parallaxY = 0;

  // Ebene durch den Ursprung, auf die der Cursor projiziert wird ->
  // ergibt einen Punkt im Raum, auf den die Partikel reagieren können
  const cursorPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const cursorWorldPoint = new THREE.Vector3();
  const cursorLocal = new THREE.Vector3();
  const cursorSmooth = new THREE.Vector3();
  const influenceRadius = 2.4;
  const pushStrength = 0.9;

  function floatPositions(cloud) {
    const posAttr = cloud.points.geometry.attributes.position;
    const t = clock.elapsedTime;
    for (let i = 0; i < posAttr.count; i++) {
      const ix = i * 3;

      // Organischeres "Wachsen" statt starrem Schweben: zwei überlagerte
      // Frequenzen pro Achse statt einer einzelnen, gleichförmigen Schwingung
      const fx = cloud.amps[ix] * (0.6 * Math.sin(t * 0.7 + cloud.phases[ix]) + 0.4 * Math.sin(t * 0.26 + cloud.phases[ix] * 1.7));
      const fy = cloud.amps[ix + 1] * (0.6 * Math.sin(t * 0.6 + cloud.phases[ix + 1]) + 0.4 * Math.sin(t * 0.23 + cloud.phases[ix + 1] * 1.7));
      const fz = cloud.amps[ix + 2] * (0.6 * Math.sin(t * 0.8 + cloud.phases[ix + 2]) + 0.4 * Math.sin(t * 0.3 + cloud.phases[ix + 2] * 1.7));

      let px = cloud.basePositions[ix] + fx;
      let py = cloud.basePositions[ix + 1] + fy;
      let pz = cloud.basePositions[ix + 2] + fz;

      // Cursor-Reaktion: Punkte in der Nähe des projizierten Cursors werden
      // sanft weggeschoben
      const dx = px - cursorSmooth.x;
      const dy = py - cursorSmooth.y;
      const dz = pz - cursorSmooth.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      if (distSq < influenceRadius * influenceRadius && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const factor = (1 - dist / influenceRadius);
        const push = factor * factor * pushStrength;
        px += (dx / dist) * push;
        py += (dy / dist) * push;
        pz += (dz / dist) * push;
      }

      posAttr.array[ix] = px;
      posAttr.array[ix + 1] = py;
      posAttr.array[ix + 2] = pz;
    }
    posAttr.needsUpdate = true;
  }

  function animate() {
    requestAnimationFrame(animate);

    if (!isDragging) {
      group.rotation.y += rotationVelocity.y;
      group.rotation.x += rotationVelocity.x;
      rotationVelocity.x *= 0.96;
      rotationVelocity.y = rotationVelocity.y * 0.98 + 0.0022 * 0.02;
    }

    // Cursor-Position in den lokalen Raum der (rotierenden) Punktwolke übersetzen
    raycaster.setFromCamera(mouse, camera);
    if (raycaster.ray.intersectPlane(cursorPlane, cursorWorldPoint)) {
      cursorLocal.copy(cursorWorldPoint).applyQuaternion(group.quaternion.clone().invert());
      cursorSmooth.lerp(cursorLocal, 0.08);
    }

    floatPositions(smallCloud);
    floatPositions(largeCloud);

    // Cursor-reaktive Kamera-Parallaxe: Sphere reagiert leicht auf Mausposition
    parallaxX += (mouse.x * 1.1 - parallaxX) * 0.04;
    parallaxY += (mouse.y * 0.7 - parallaxY) * 0.04;
    camera.position.x = parallaxX;
    camera.position.y = parallaxY;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();
}
