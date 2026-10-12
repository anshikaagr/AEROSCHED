import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import "./intro.css";

/* ------------------------------------------------------------------ */
/*  Timeline (seconds)                                                 */
/* ------------------------------------------------------------------ */
const DURATION = 8.4;
const HOLD = 0.8; // plane sits on the runway before the roll starts
const ROTATE_AT = 3.4; // seconds into the roll when the nose lifts

const STAGES = [
  { at: 0, code: "09R", text: "Lining up on the runway" },
  { at: 1.4, code: "09R", text: "Cleared for takeoff" },
  { at: 4.0, code: "09R", text: "Rotate" },
  { at: 5.4, code: "EGLL", text: "Positive rate of climb" },
  { at: 7.0, code: "EGLL", text: "Opening the control center" },
];

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (t) => t * t * (3 - 2 * t);

/* ------------------------------------------------------------------ */
/*  Scene helpers                                                      */
/* ------------------------------------------------------------------ */
function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, "rgba(255,255,255,1)");
  gr.addColorStop(0.25, "rgba(255,255,255,0.55)");
  gr.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function flatGeometry(points, depth) {
  const s = new THREE.Shape();
  s.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) s.lineTo(points[i][0], points[i][1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false });
  g.rotateX(Math.PI / 2); // shape y -> world z, thickness points down
  return g;
}

function buildPlane() {
  const plane = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide });
  const gold = new THREE.MeshStandardMaterial({ color: 0xe9b949, roughness: 0.4, metalness: 0.2, side: THREE.DoubleSide });
  const dark = new THREE.MeshStandardMaterial({ color: 0x141c24, roughness: 0.7 });
  const grey = new THREE.MeshStandardMaterial({ color: 0xaab4bd, roughness: 0.4, metalness: 0.4 });

  // Fuselage
  const fus = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 12, 28), white);
  fus.rotation.x = Math.PI / 2;
  plane.add(fus);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.1, 28, 16), white);
  nose.scale.set(1, 1, 1.9);
  nose.position.z = 6;
  plane.add(nose);

  const tailCone = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 0.3, 4, 28), white);
  tailCone.rotation.x = Math.PI / 2;
  tailCone.position.z = -8;
  plane.add(tailCone);

  // Gold band around the fuselage
  const stripeBand = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.05, 6, 40), gold);
  stripeBand.position.set(0, 0, 3.4);
  plane.add(stripeBand);

  // Cockpit glass
  const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.35, 0.9), dark);
  cockpit.position.set(0, 0.55, 6.1);
  cockpit.rotation.x = -0.35;
  plane.add(cockpit);

  // Wings (with a slight dihedral)
  const wingPts = [[1, 2.5], [10, -2.2], [10, -4], [1, -2.6]];
  const wingGeo = flatGeometry(wingPts, 0.2);
  const wingR = new THREE.Mesh(wingGeo, white);
  const wingL = new THREE.Mesh(wingGeo, white);
  wingL.scale.x = -1;
  const wings = new THREE.Group();
  wingR.rotation.z = 0.05;
  wingL.rotation.z = -0.05;
  wings.add(wingR, wingL);
  wings.position.set(0, -0.55, 0.6);
  plane.add(wings);

  // Winglets in gold
  [1, -1].forEach((s) => {
    const wl = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.3, 1.1), gold);
    wl.position.set(s * 10.4, 0.25, -2.4 + 0.6);
    wl.rotation.z = s * -0.18;
    plane.add(wl);
  });

  // Engines
  [1, -1].forEach((s) => {
    const eng = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.7, 3.2, 20), grey);
    eng.rotation.x = Math.PI / 2;
    eng.position.set(s * 4.3, -1.35, 1.1);
    plane.add(eng);
    const intake = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.1, 20), dark);
    intake.rotation.x = Math.PI / 2;
    intake.position.set(s * 4.3, -1.35, 2.72);
    plane.add(intake);
  });

  // Tail fin (gold) and horizontal stabilizers
  const finShape = new THREE.Shape();
  finShape.moveTo(-5.5, 0);
  finShape.lineTo(-7.8, 3.8);
  finShape.lineTo(-9.5, 3.8);
  finShape.lineTo(-9.5, 0);
  finShape.closePath();
  const fg = new THREE.ExtrudeGeometry(finShape, { depth: 0.16, bevelEnabled: false });
  fg.rotateY(-Math.PI / 2);
  fg.translate(0.08, 0, 0);
  const fin = new THREE.Mesh(fg, gold);
  fin.position.y = 0.8;
  plane.add(fin);

  const stabGeo = flatGeometry([[0.8, 1.2], [4.4, -0.7], [4.4, -1.7], [0.8, -1.6]], 0.12);
  const stabR = new THREE.Mesh(stabGeo, white);
  const stabL = new THREE.Mesh(stabGeo, white);
  stabL.scale.x = -1;
  const stabs = new THREE.Group();
  stabs.add(stabR, stabL);
  stabs.position.set(0, 0.25, -7.2);
  plane.add(stabs);

  // Landing gear
  const gear = new THREE.Group();
  const addLeg = (x, z) => {
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.1, 8), grey);
    strut.position.set(x, -1.55, z);
    const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheel = new THREE.Mesh(wheelGeo, dark);
    wheel.position.set(x, -2.1, z);
    gear.add(strut, wheel);
  };
  addLeg(0, 4.6);
  addLeg(1.7, -0.6);
  addLeg(-1.7, -0.6);
  plane.add(gear);

  // Navigation lights + strobes
  const lamp = (color, x, y, z) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 10), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, y, z);
    plane.add(m);
    return m;
  };
  lamp(0xff3b30, -10.2, 0.0, -3.4);
  lamp(0x34e07a, 10.2, 0.0, -3.4);
  const strobes = [lamp(0xffffff, 0, 4.7, -9.2), lamp(0xffffff, -10.1, 0.2, -3.9), lamp(0xffffff, 10.1, 0.2, -3.9)];

  return { plane, gear, strobes };
}

function buildWorld(scene) {
  const glow = glowTexture();

  // Ground + runway
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(6000, 6000),
    new THREE.MeshStandardMaterial({ color: 0x0d141b, roughness: 1 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  const runway = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 900),
    new THREE.MeshStandardMaterial({ color: 0x222c36, roughness: 0.9 })
  );
  runway.rotation.x = -Math.PI / 2;
  runway.position.set(0, 0.02, 390);
  scene.add(runway);

  const paint = new THREE.MeshBasicMaterial({ color: 0xc9d1d9 });
  const dummy = new THREE.Object3D();

  // Centre line dashes
  const dashes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.02, 10), paint, 42);
  for (let i = 0; i < 42; i++) {
    dummy.position.set(0, 0.05, -40 + i * 22);
    dummy.updateMatrix();
    dashes.setMatrixAt(i, dummy.matrix);
  }
  scene.add(dashes);

  // Edge lines
  [-14.4, 14.4].forEach((x) => {
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.02, 900), paint);
    edge.position.set(x, 0.05, 390);
    scene.add(edge);
  });

  // Touchdown-zone bars
  const bars = new THREE.InstancedMesh(new THREE.BoxGeometry(1.8, 0.02, 14), paint, 18);
  let n = 0;
  for (let k = 0; k < 9; k++) {
    [-6, 6].forEach((x) => {
      dummy.position.set(x, 0.05, 110 + k * 60);
      dummy.updateMatrix();
      bars.setMatrixAt(n++, dummy.matrix);
    });
  }
  scene.add(bars);

  // Runway lights (glowing points)
  const makePoints = (positions, color, size) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      map: glow, color, size, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    const p = new THREE.Points(geo, mat);
    scene.add(p);
    return p;
  };

  const edgeLights = [];
  for (let z = -40; z <= 840; z += 20) edgeLights.push(-15.6, 0.5, z, 15.6, 0.5, z);
  makePoints(edgeLights, 0xffe2a8, 4);

  const threshold = [];
  for (let x = -14; x <= 14; x += 2) threshold.push(x, 0.5, -52);
  makePoints(threshold, 0x3cf08a, 3.2);

  const endLights = [];
  for (let x = -14; x <= 14; x += 2) endLights.push(x, 0.5, 842);
  makePoints(endLights, 0xff4a3d, 3.2);

  // Approach lights leading into the threshold
  const approach = [];
  for (let z = -500; z < -60; z += 30) approach.push(0, 0.6, z);
  makePoints(approach, 0xfff1d0, 5);

  // Distant city lights
  const cityPos = [];
  const cityCol = [];
  const c1 = new THREE.Color(0xffc578);
  const c2 = new THREE.Color(0xdfe9ff);
  for (let i = 0; i < 2200; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const x = side * (70 + Math.pow(Math.random(), 1.6) * 1400);
    const z = -400 + Math.random() * 2800;
    cityPos.push(x, 0.4, z);
    const c = c1.clone().lerp(c2, Math.random() * 0.6);
    cityCol.push(c.r, c.g, c.b);
  }
  const cityGeo = new THREE.BufferGeometry();
  cityGeo.setAttribute("position", new THREE.Float32BufferAttribute(cityPos, 3));
  cityGeo.setAttribute("color", new THREE.Float32BufferAttribute(cityCol, 3));
  scene.add(new THREE.Points(cityGeo, new THREE.PointsMaterial({
    map: glow, size: 3.2, vertexColors: true, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true, opacity: 0.9,
  })));

  // Control tower
  const concrete = new THREE.MeshStandardMaterial({ color: 0x1b2530, roughness: 0.8 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(3, 4.2, 52, 16), concrete);
  tower.position.set(-130, 26, 260);
  scene.add(tower);
  const cab = new THREE.Mesh(
    new THREE.CylinderGeometry(7.5, 5, 6.5, 16),
    new THREE.MeshStandardMaterial({ color: 0x2a3644, emissive: 0xffc46b, emissiveIntensity: 0.9, roughness: 0.5 })
  );
  cab.position.set(-130, 55, 260);
  scene.add(cab);
  const beacon = makePoints([-130, 61, 260], 0xff4a3d, 14);

  // Terminal blocks
  const termMat = new THREE.MeshStandardMaterial({ color: 0x18222c, emissive: 0xffb764, emissiveIntensity: 0.18, roughness: 0.9 });
  [[120, 60, 140, 12, 90], [150, 40, 380, 10, 120], [-190, 50, 520, 14, 80]].forEach(([x, w, z, h, d]) => {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), termMat);
    b.position.set(x, h / 2, z);
    scene.add(b);
  });

  // Sky dome: dusk gradient with the sun low ahead of the aircraft
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(4000, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { sun: { value: new THREE.Vector3(0.3, 0.045, 1).normalize() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
      fragmentShader: `
        varying vec3 vP; uniform vec3 sun;
        float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
        void main(){
          float h = clamp(vP.y, 0.0, 1.0);
          vec3 horizon = vec3(0.227, 0.208, 0.314);
          vec3 mid = vec3(0.09, 0.13, 0.26);
          vec3 top = vec3(0.02, 0.035, 0.09);
          vec3 c = mix(horizon, mid, smoothstep(0.0, 0.3, h));
          c = mix(c, top, smoothstep(0.2, 0.85, h));
          float d = max(dot(normalize(vP), sun), 0.0);
          c += vec3(1.0, 0.52, 0.2) * pow(d, 5.0) * 0.8 * (1.0 - smoothstep(0.0, 0.5, h));
          c += vec3(1.0, 0.78, 0.45) * pow(d, 70.0) * 0.9;
          c += vec3(1.0, 0.95, 0.8) * smoothstep(0.9993, 0.9998, d) * 1.6;
          vec3 q = floor(normalize(vP) * 260.0);
          float star = step(0.9985, hash(q)) * smoothstep(0.35, 0.8, h);
          c += vec3(star) * 0.85;
          gl_FragColor = vec4(c, 1.0);
        }`,
    })
  );
  scene.add(sky);

  return { sky, beacon };
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */
export default function Intro({ onReveal, onDone }) {
  const mountRef = useRef(null);
  const speedRef = useRef(null);
  const altRef = useRef(null);
  const doneRef = useRef(false);
  const [stage, setStage] = useState(0);
  const [leaving, setLeaving] = useState(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setLeaving(true);
    onReveal && onReveal();
    setTimeout(() => onDone && onDone(), 1000);
  }, [onDone, onReveal]);

  // Skip with Escape / Enter / Space
  useEffect(() => {
    const onKey = (e) => {
      if (["Escape", "Enter", " "].includes(e.key)) finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [finish]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // Respect reduced-motion: go straight to the dashboard
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onReveal && onReveal();
      onDone && onDone();
      return;
    }

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    } catch (err) {
      // No WebGL: skip the intro quietly
      onReveal && onReveal();
      onDone && onDone();
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.className = "intro-canvas";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x3a3550, 150, 1900);

    const baseFov = () => (mount.clientWidth / mount.clientHeight < 1 ? 62 : 42);
    const camera = new THREE.PerspectiveCamera(baseFov(), mount.clientWidth / mount.clientHeight, 0.5, 8000);

    scene.add(new THREE.HemisphereLight(0x8a9cc8, 0x1a1410, 0.9));
    const sunLight = new THREE.DirectionalLight(0xffc58a, 2.4);
    sunLight.position.set(60, 14, 200);
    scene.add(sunLight);
    const fill = new THREE.DirectionalLight(0x6a86c8, 1.3);
    fill.position.set(-40, 60, -120);
    scene.add(fill);

    const { sky } = buildWorld(scene);
    const { plane, gear, strobes } = buildPlane();
    scene.add(plane);

    // Soft shadow under the aircraft
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.set(11, 7, 1);
    shadow.position.y = 0.06;
    scene.add(shadow);

    const GROUND_Y = 2.55;
    plane.position.set(0, GROUND_Y, 0);

    const camPos = new THREE.Vector3(-13, 3.6, -26);
    const camLook = new THREE.Vector3(0, 3, 8);
    camera.position.copy(camPos);
    camera.lookAt(camLook);

    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.fov = baseFov();
      camera.updateProjectionMatrix();
    };
    window.addEventListener("resize", onResize);

    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    let speed = 0;
    let lastStage = 0;
    let lastHud = 0;
    const desired = new THREE.Vector3();
    const lookDesired = new THREE.Vector3();

    const tick = (now) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      elapsed += dt;

      const tt = Math.max(0, elapsed - HOLD); // roll time
      const rot = tt - ROTATE_AT; // time since rotation began

      // Speed profile (world units per second)
      if (tt > 0) {
        speed = rot < 0 ? 17 * tt : 17 * ROTATE_AT + 12 * rot;
      }
      plane.position.z += speed * dt;

      // Pitch and climb
      const pitch = rot > 0 ? smooth(clamp(rot / 1.1, 0, 1)) * 0.27 + clamp(rot - 1.1, 0, 5) * 0.012 : 0;
      plane.rotation.x = -pitch;
      if (rot > 0.55) plane.position.y += speed * Math.sin(pitch) * dt * smooth(clamp((rot - 0.55) / 0.8, 0, 1));
      else plane.position.y = GROUND_Y + (tt > 0 ? Math.sin(elapsed * 55) * 0.012 : 0);

      // Gentle bank once airborne
      plane.rotation.z = rot > 1.4 ? Math.sin((rot - 1.4) * 0.7) * 0.05 : 0;

      // Gear retracts
      gear.visible = rot < 2.0;

      // Strobes
      const blinkOn = Math.sin(elapsed * 13) > 0.8;
      strobes.forEach((s) => (s.visible = blinkOn));

      // Shadow follows the aircraft on the ground
      const alt = plane.position.y - GROUND_Y;
      shadow.position.x = plane.position.x;
      shadow.position.z = plane.position.z - 0.5;
      shadow.material.opacity = 0.45 * Math.exp(-alt / 22);
      const sc = 1 + alt * 0.012;
      shadow.scale.set(11 * sc, 7 * sc, 1);

      // Chase camera
      const climb = Math.max(0, rot);
      const sp = clamp(tt / ROTATE_AT, 0, 1);
      const side = -13 - sp * 3 - climb * 2.4;
      const back = 26 + sp * 6 + climb * 4.5;
      const height = 3.6 + clamp(plane.position.y * 0.42, 0, 60) + sp * 1.2;
      desired.set(plane.position.x + side, Math.max(1.8, height), plane.position.z - back);
      camPos.lerp(desired, 1 - Math.exp(-dt * (tt < 0.1 ? 8 : 2.4)));
      camera.position.copy(camPos);
      lookDesired.set(plane.position.x, plane.position.y + 1.2, plane.position.z + 5);
      camLook.lerp(lookDesired, 1 - Math.exp(-dt * 4.5));
      camera.lookAt(camLook);

      // Speed rush: widen the lens during acceleration
      const fovTarget = baseFov() + sp * 9 - clamp(climb, 0, 3) * 2;
      camera.fov += (fovTarget - camera.fov) * (1 - Math.exp(-dt * 3));
      camera.updateProjectionMatrix();

      sky.position.copy(camera.position);

      renderer.render(scene, camera);

      // Stage text (React state only on change)
      let s = 0;
      for (let i = 0; i < STAGES.length; i++) if (elapsed >= STAGES[i].at) s = i;
      if (s !== lastStage) {
        lastStage = s;
        setStage(s);
      }

      // Telemetry readout, ~15 Hz, written straight to the DOM
      if (now - lastHud > 66) {
        lastHud = now;
        if (speedRef.current) speedRef.current.textContent = Math.round(speed * 2.4);
        if (altRef.current) altRef.current.textContent = Math.round(alt * 12).toLocaleString("en-GB");
      }

      if (elapsed >= DURATION) finish();
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      scene.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material) {
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current = STAGES[stage];

  return (
    <div className={`intro ${leaving ? "leaving" : ""}`} role="dialog" aria-label="AeroSched introduction">
      <div className="intro-scene" ref={mountRef} aria-hidden="true" />
      <div className="intro-vignette" aria-hidden="true" />

      <header className="intro-brand">
        <div className="intro-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
          </svg>
        </div>
        <div>
          <strong>AeroSched</strong>
          <span>Runway control</span>
        </div>
      </header>

      <aside className="intro-telemetry" aria-hidden="true">
        <div>
          <span>Ground speed</span>
          <strong><b ref={speedRef}>0</b> kt</strong>
        </div>
        <div>
          <span>Altitude</span>
          <strong><b ref={altRef}>0</b> ft</strong>
        </div>
      </aside>

      <section className="intro-title">
        <h1>AeroSched</h1>
        <p>FCFS and priority-queue runway allocation for London Heathrow</p>
        <div className="intro-stage" aria-live="polite">
          <em key={`c${stage}`}>{current.code}</em>
          <span key={`t${stage}`}>{current.text}</span>
        </div>
      </section>

      <button className="intro-skip" onClick={finish} type="button">
        Skip intro
        <kbd>Esc</kbd>
      </button>

      <div className="intro-progress" aria-hidden="true">
        <i style={{ animationDuration: `${DURATION}s` }} />
      </div>
    </div>
  );
}