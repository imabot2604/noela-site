import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const host = document.getElementById('date3d');
const stage = host?.closest('.dip__stage');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

try { init(); } catch (e) { console.warn('3D date unavailable, using illustration', e); }

function init() {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0.55, 7.2);
  camera.lookAt(0, -0.05, 0);

  const key = new THREE.DirectionalLight(0xffe2c4, 2.4); key.position.set(-3, 4, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc9a8, 3.2); rim.position.set(3.5, 2, -3); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xfff3e6, 0x3a2418, 0.5));

  const rig = new THREE.Group(); scene.add(rig);
  const piece = new THREE.Group(); rig.add(piece);
  piece.rotation.z = -0.08;

  /* ---------- value noise (for organic wrinkles) ---------- */
  const hash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
  const fade = t => t * t * (3 - 2 * t);
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = fade(x - xi), yf = fade(y - yi), zf = fade(z - zi);
    const l = THREE.MathUtils.lerp;
    const c = (a, b, d) => hash(xi + a, yi + b, zi + d);
    return l(l(l(c(0,0,0), c(1,0,0), xf), l(c(0,1,0), c(1,1,0), xf), yf), l(l(c(0,0,1), c(1,0,1), xf), l(c(0,1,1), c(1,1,1), xf), yf), zf);
  }
  const fbm = (x, y, z) => vnoise(x, y, z) * 0.55 + vnoise(x * 2.1, y * 2.1, z * 2.1) * 0.3 + vnoise(x * 4.3, y * 4.3, z * 4.3) * 0.15;
  // creases: ridged noise stretched so folds run across the date, like a real Medjool
  const crease = (x, y, z) => { const n = 1 - Math.abs(vnoise(x * 3.2, y * 7.5, z * 3.2) * 2 - 1); return n * n * n; };

  /* ---------- geometry helpers ---------- */
  const A = 0.64, B = 1.36, C = 0.58; // ellipsoid radii (x, y, z)
  const tmp = new THREE.Vector3(), nrm = new THREE.Vector3();

  // A date: an ellipsoid with slightly pointed ends, organic wrinkles and a front slit.
  function dateGeometry({ wrinkle = 1, groove = 1, inflate = 1 } = {}) {
    const g = new THREE.SphereGeometry(1, 160, 120);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const dark = new THREE.Color('#1a0802'), mid = new THREE.Color('#40190a'), hi = new THREE.Color('#6b3215'), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      tmp.fromBufferAttribute(pos, i);
      const y = tmp.y, th = Math.atan2(tmp.z, tmp.x);
      // taper the tips a touch so it reads as a date, not an egg
      const taper = 1 - 0.1 * Math.pow(Math.abs(y), 3);
      let x = tmp.x * A * taper * inflate, yy = y * B * inflate, z = tmp.z * C * taper * inflate;
      nrm.set(x / (A * A), yy / (B * B), z / (C * C)).normalize();
      const tipFade = 1 - Math.pow(Math.abs(y), 6);
      const w = ((fbm(tmp.x * 2.4 + 3, tmp.y * 2.8, tmp.z * 2.4) - 0.5) * 0.07
        - crease(tmp.x + 7, tmp.y, tmp.z) * 0.034
        - crease(tmp.x * 1.7 + 2, tmp.y * 1.6 + 5, tmp.z * 1.7) * 0.014) * tipFade * wrinkle;
      const gz = Math.max(0, tmp.z);
      const slit = groove * 0.17 * Math.exp(-Math.pow(x / 0.085, 2)) * gz * (1 - smooth(0.68, 0.92, Math.abs(y)));
      const d = w - slit;
      x += nrm.x * d; yy += nrm.y * d; z += nrm.z * d;
      pos.setXYZ(i, x, yy, z);
      const t = THREE.MathUtils.clamp(0.62 + w * 9 - slit * 5, 0, 1);
      t < 0.5 ? c.lerpColors(dark, mid, t * 2) : c.lerpColors(mid, hi, (t - 0.5) * 2);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }
  function smooth(a, b, v) { const t = THREE.MathUtils.clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); }
  const surfaceZ = (x, y, k = 1.07) => C * k * Math.sqrt(Math.max(0, 1 - (x / (A * k)) ** 2 - (y / (B * k)) ** 2));

  /* ---------- the date ---------- */
  const dateMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.38, clearcoat: 0.85, clearcoatRoughness: 0.22, sheen: 0.3, sheenColor: new THREE.Color('#a85f34') });
  const date = new THREE.Mesh(dateGeometry(), dateMat);
  piece.add(date);

  /* ---------- the nut (almond / pistachio) ---------- */
  function nutGeometry() {
    const g = new THREE.SphereGeometry(1, 64, 48), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      tmp.fromBufferAttribute(p, i);
      const pinch = 1 - 0.35 * Math.pow(Math.max(0, tmp.y), 2); // pointed top like an almond
      const ridge = 1 + 0.04 * Math.sin(tmp.y * 26 + Math.atan2(tmp.z, tmp.x) * 3);
      p.setXYZ(i, tmp.x * 0.13 * pinch * ridge, tmp.y * 0.74, tmp.z * 0.1 * pinch * ridge);
    }
    g.computeVertexNormals(); return g;
  }
  const nutMat = new THREE.MeshPhysicalMaterial({ color: '#b98a5c', roughness: 0.8, sheen: 0.6, sheenColor: new THREE.Color('#f3d9b5') });
  const nut = new THREE.Mesh(nutGeometry(), nutMat);
  nut.position.set(0, 0, 0.45);
  piece.add(nut);
  const NUT = { almond: new THREE.Color('#b98a5c'), pistachio: new THREE.Color('#8fa451') };

  /* ---------- chocolate shell with a live, wavy fill line ---------- */
  const uniforms = { uLevel: { value: -2 }, uTime: { value: 0 } };
  const chocMat = new THREE.MeshPhysicalMaterial({
    color: '#2a160d', roughness: 0.24, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.12,
    sheen: 0.25, sheenColor: new THREE.Color('#7a4a32'), side: THREE.DoubleSide
  });
  chocMat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;\nuniform float uLevel;\nuniform float uTime;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        float edge = uLevel + 0.045*sin(vObj.x*11.0 + uTime*1.6) + 0.025*sin(vObj.z*17.0 - uTime*1.1) + 0.015*sin((vObj.x+vObj.z)*29.0 + uTime*2.3);
        if (vObj.y > edge) discard;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        if (!gl_FrontFacing) diffuseColor.rgb *= 0.55;`);
  };
  const shell = new THREE.Mesh(dateGeometry({ wrinkle: 0.35, groove: 0.15, inflate: 1.07 }), chocMat);
  shell.geometry.deleteAttribute('color');
  piece.add(shell);

  /* ---------- drizzle ---------- */
  const zig = [[-0.42, 0.95], [0.4, 0.78], [-0.5, 0.5], [0.5, 0.3], [-0.52, 0.02], [0.52, -0.2], [-0.5, -0.48], [0.44, -0.7], [-0.3, -0.92]];
  const pts = [];
  for (let s = 0; s < zig.length - 1; s++) for (let k = 0; k < 24; k++) {
    const t = k / 24, x = THREE.MathUtils.lerp(zig[s][0], zig[s + 1][0], t), y = THREE.MathUtils.lerp(zig[s][1], zig[s + 1][1], t);
    pts.push(new THREE.Vector3(x, y, surfaceZ(x, y, 1.085) + 0.004));
  }
  const RADIAL = 10;
  const drizzleGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 700, 0.024, RADIAL, false);
  const drizzle = new THREE.Mesh(drizzleGeo, new THREE.MeshPhysicalMaterial({ color: '#4b2a1b', roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.08 }));
  drizzleGeo.setDrawRange(0, 0);
  piece.add(drizzle);
  const drizzleTotal = drizzleGeo.index.count, stride = RADIAL * 6;

  /* ---------- gold leaf ---------- */
  const goldMat = new THREE.MeshStandardMaterial({ color: '#e0b04f', metalness: 1, roughness: 0.28, side: THREE.DoubleSide, emissive: '#3a2400', emissiveIntensity: 0.25 });
  const flakes = [];
  const flakeSpots = [[-0.12, 1.02], [0.06, 1.08], [0.16, 0.96], [-0.02, 0.9], [0.1, 1.17], [-0.2, 1.12]];
  flakeSpots.forEach(([x, y], i) => {
    const sh = new THREE.Shape(), n = 7, r = 0.08 + (i % 3) * 0.025;
    for (let k = 0; k < n; k++) {
      const a = k / n * Math.PI * 2, rr = r * (0.55 + Math.random() * 0.6);
      k ? sh.lineTo(Math.cos(a) * rr * 1.4, Math.sin(a) * rr) : sh.moveTo(Math.cos(a) * rr * 1.4, Math.sin(a) * rr);
    }
    const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), goldMat);
    const z = surfaceZ(x, y, 1.08) + 0.006;
    m.position.set(x, y, z);
    m.lookAt(new THREE.Vector3(x / (A * A), y / (B * B), z / (C * C)).normalize().add(m.position));
    m.rotateZ(Math.random() * Math.PI);
    m.userData = { home: m.position.clone(), delay: i * 0.12 };
    m.scale.setScalar(0.0001);
    piece.add(m); flakes.push(m);
  });

  /* ---------- soft contact shadow ---------- */
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const cx = cv.getContext('2d'), grd = cx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(42,28,23,.55)'); grd.addColorStop(1, 'rgba(42,28,23,0)');
  cx.fillStyle = grd; cx.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 2.4), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = -1.62; shadow.scale.set(1, 0.55, 1);
  rig.add(shadow);

  /* ---------- drag to turn ---------- */
  let drag = false, lastX = 0, sx = 0, sy = 0, axis = null, spin = 0, vel = 0;
  host.addEventListener('pointerdown', e => { drag = true; axis = null; sx = lastX = e.clientX; sy = e.clientY; vel = 0; });
  addEventListener('pointermove', e => {
    if (!drag) return;
    if (!axis) { const ax = Math.abs(e.clientX - sx), ay = Math.abs(e.clientY - sy); if (ax + ay < 5) return; axis = ax > ay ? 'x' : 'y'; }
    if (axis !== 'x') return;
    const dx = e.clientX - lastX; lastX = e.clientX; spin += dx * 0.012; vel = dx * 0.012;
  });
  addEventListener('pointerup', () => { drag = false; });

  /* ---------- sizing / visibility ---------- */
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    // keep the whole piece in frame on narrow screens
    const fitH = 3.9, fitW = 2.2 / camera.aspect;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.max(fitH, fitW * 1.6) / 2 / 7.2));
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(host); resize();
  let visible = true;
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }).observe(host);

  /* ---------- frame loop: read the scroll state main.js publishes ---------- */
  const clock = new THREE.Clock();
  const products = document.getElementById('products');
  let flav = 'almond';
  const ease = t => 1 - Math.pow(1 - t, 3);
  const back = t => { const c1 = 1.9, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  let running = false;
  function loop() {
    if (running) return; running = true;
    const tick = () => {
      if (!visible) { running = false; return; }
      const t = clock.getElapsedTime();
      const s = window.__dipState || { nutY: -260, choc: 600, drizzle: 1600, gold: 0 };
      const nutT = THREE.MathUtils.clamp(1 - s.nutY / -260, 0, 1);
      const chocT = THREE.MathUtils.clamp((600 - s.choc) / 640, 0, 1);
      const drizT = THREE.MathUtils.clamp(1 - s.drizzle / 1600, 0, 1);
      const goldT = THREE.MathUtils.clamp(s.gold, 0, 1);

      nut.position.y = (1 - ease(nutT)) * 3.2;
      nut.position.z = 0.41 + (1 - ease(nutT)) * 0.5;
      nut.rotation.z = (1 - nutT) * 1.2;
      nut.visible = nutT > 0.001;

      uniforms.uLevel.value = THREE.MathUtils.lerp(-1.75, 1.75, chocT);
      uniforms.uTime.value = reduce ? 0 : t;
      shell.visible = chocT > 0.001;

      drizzleGeo.setDrawRange(0, Math.floor(drizzleTotal * drizT / stride) * stride);
      drizzle.visible = drizT > 0.001;

      flakes.forEach(f => {
        const k = THREE.MathUtils.clamp((goldT - f.userData.delay) / 0.4, 0, 1);
        f.scale.setScalar(Math.max(0.0001, back(k)));
        f.position.copy(f.userData.home); f.position.y += (1 - ease(k)) * 0.6;
      });

      const f = products?.dataset.flavour || 'almond';
      if (f !== flav) flav = f;
      nutMat.color.lerp(NUT[flav], 0.08);

      if (!drag) { vel *= 0.94; spin += vel; spin *= 0.985; }
      rig.rotation.y = (reduce ? 0 : Math.sin(t * 0.5) * 0.32) + spin;
      rig.position.y = reduce ? 0 : Math.sin(t * 0.9) * 0.04;

      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    };
    tick();
  }
  loop();
  stage.classList.add('is-3d');
}
