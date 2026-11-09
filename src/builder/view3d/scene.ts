import * as THREE from 'three';
import { getChunki } from '../../data/chunkis';
import { cameraZoneFor, renderIdFor } from '../../data/phones';
import { prefersReducedMotion } from '../../lib/env';
import { clampToCase } from '../placement';
import type { BuilderState, BuilderStore, PlacedCharm } from '../store';
import { charmTemplate } from './charmModels';
import { loadPhone, type PhoneDims, type PhoneModel } from './phoneModel';
import { createStudio } from './studio';

export interface SceneController {
  /** Posición en pantalla de un chunki (para pruebas automáticas). */
  project(uid: number): { x: number; y: number } | null;
  bump(): void;
}

interface CharmObject {
  root: THREE.Group;
  uid: number;
  target: [number, number];
  rotation: number;
  size: number;
  appear: number;
  delay: number;
  removing: number;
  lift: number;
  landing: number;
}

const DEFAULT_ROTATION = { x: 0.1, y: -0.32 } as const;
const IDLE_AFTER_MS = 2500;
const TAP_THRESHOLD_PX = 6;

const ease = {
  outBack: (t: number): number => 1 + 2.70158 * Math.pow(t - 1, 3) + 1.70158 * Math.pow(t - 1, 2),
  outCubic: (t: number): number => 1 - Math.pow(1 - t, 3),
};

/** Monta el armador 3D dentro de `stage`. Falla si no hay WebGL o no carga el modelo. */
export async function mountScene(
  stage: HTMLElement,
  store: BuilderStore,
  controls: { reset?: HTMLButtonElement | null; spin?: HTMLButtonElement | null },
): Promise<SceneController> {
  const firstState = store.getState();
  const firstRender = renderIdFor(firstState.phoneId, firstState.size);
  const firstPhone = await loadPhone(firstRender);

  /* ---------- Escena ---------- */
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NeutralToneMapping; // conserva el negro del celular y el color de los chunkis
  renderer.toneMappingExposure = 1;
  renderer.transmissionResolutionScale = 0.75; // el plástico es lo más costoso de dibujar
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'stage-3d';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Vista 3D de tu forro. Arrastra para girarlo.');
  stage.append(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(createStudio(), 0.02).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 4.4);

  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(1.6, 2.4, 4.2);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.3, right: 1.3, top: 1.3, bottom: -1.3, near: 1, far: 10 });
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.01;
  key.shadow.radius = 5;
  const rim = new THREE.DirectionalLight(0xe384e6, 0.8);
  rim.position.set(-3, 1.5, -2.5);
  // Los chunkis son de metal: con la luz ambiente y el estudio tenue necesitan su propia luz
  const fill = new THREE.DirectionalLight(0xffffff, 1.2);
  fill.position.set(-2, -0.5, 4);
  scene.add(key, rim, fill, new THREE.AmbientLight(0xffffff, 0.15));

  const root = new THREE.Group(); // se gira con el dedo / mouse
  const charmGroup = new THREE.Group();
  root.add(charmGroup);
  scene.add(root);

  /* ---------- Celular ---------- */
  let phone: PhoneModel | null = null;
  let dims: PhoneDims = { W: 1, H: 1, backTop: 0 };
  /** El modelo en pantalla y el que se pidió (pueden diferir mientras descarga). */
  let shownRender = firstRender;
  let wantedRender = firstRender;

  const setPhone = (next: PhoneModel, renderId: string): void => {
    if (phone) root.remove(phone.group);
    phone = next;
    dims = next.dims;
    shownRender = renderId;
    root.add(next.group);
  };

  const toLocal = (x: number, y: number): [number, number] => [
    (x / 100 - 0.5) * dims.W,
    (0.5 - y / 100) * dims.H,
  ];
  const toPercent = (X: number, Y: number): [number, number] => [
    (X / dims.W + 0.5) * 100,
    (0.5 - Y / dims.H) * 100,
  ];

  /* ---------- Chunkis ---------- */
  const objects = new Map<number, CharmObject>();
  let stagger = 0;

  const createCharm = (charm: PlacedCharm, initial: boolean): CharmObject | null => {
    const chunki = getChunki(charm.id);
    if (!chunki) return null;
    const body = charmTemplate(chunki.glyph).clone();
    const charmRoot = new THREE.Group();
    charmRoot.add(body);
    charmRoot.userData.uid = charm.uid;
    body.traverse((o) => (o.userData.uid = charm.uid));
    const [x, y] = toLocal(charm.x, charm.y);
    charmRoot.position.set(x, y, dims.backTop);
    charmGroup.add(charmRoot);
    const reduce = prefersReducedMotion();
    const obj: CharmObject = {
      root: charmRoot,
      uid: charm.uid,
      target: [x, y],
      rotation: (-(charm.r || 0) * Math.PI) / 180,
      size: (chunki.mini ? 0.14 : 0.19) * dims.W,
      appear: reduce ? 1 : 0,
      delay: initial && !reduce ? stagger++ * 0.06 : 0,
      removing: 0,
      lift: 0,
      landing: 0,
    };
    charmRoot.scale.setScalar(obj.appear ? obj.size : 0.0001);
    return obj;
  };

  let dragging: CharmObject | null = null;
  let hovered: CharmObject | null = null;

  const clearCharms = (): void => {
    objects.forEach((o) => charmGroup.remove(o.root));
    objects.clear();
    dragging = null;
    hovered = null;
    stagger = 0;
  };

  const showPhone = async (renderId: string): Promise<void> => {
    try {
      const next = await loadPhone(renderId);
      if (renderId !== wantedRender) return; // ya eligió otro mientras descargaba
      setPhone(next, renderId);
      clearCharms(); // cada modelo tiene sus medidas: los chunkis se vuelven a ubicar
      sync(store.getState(), false);
    } catch (err) {
      console.warn(`No se pudo cargar el modelo 3D de ${renderId}.`, err);
      if (renderId === wantedRender) wantedRender = shownRender;
    }
  };

  const sync = (state: Readonly<BuilderState>, rebuild: boolean): void => {
    const renderId = renderIdFor(state.phoneId, state.size);
    if (renderId !== wantedRender) {
      wantedRender = renderId;
      void showPhone(renderId);
    }
    if (rebuild) clearCharms();
    const initial = objects.size === 0;
    const alive = new Set<number>();
    for (const charm of state.charms) {
      alive.add(charm.uid);
      let obj = objects.get(charm.uid);
      if (!obj) {
        const created = createCharm(charm, initial);
        if (!created) continue;
        obj = created;
        objects.set(charm.uid, obj);
      }
      if (obj !== dragging) obj.target = toLocal(charm.x, charm.y);
      obj.rotation = (-(charm.r || 0) * Math.PI) / 180;
    }
    objects.forEach((o, uid) => {
      if (!alive.has(uid) && !o.removing) o.removing = prefersReducedMotion() ? 1 : 0.0001;
    });
  };

  store.subscribe((state, event) => {
    if (event.type === 'filter-changed' || event.type === 'model-changed' || event.type === 'rejected')
      return;
    sync(state, event.type === 'combo-loaded' || event.type === 'cleared');
  });

  /* ---------- Interacción ---------- */
  const rotation: { x: number; y: number; vx: number; vy: number } = {
    x: DEFAULT_ROTATION.x,
    y: DEFAULT_ROTATION.y,
    vx: 0,
    vy: 0,
  };
  let spinning = false;
  let resetting = false;
  let lastInteraction = performance.now();
  let bumpT = 0;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const backPlane = new THREE.Plane();
  const tmpV = new THREE.Vector3();
  const tmpN = new THREE.Vector3();
  let pointer: {
    id: number;
    sx: number;
    sy: number;
    lx: number;
    ly: number;
    moved: boolean;
    onCase: boolean;
  } | null = null;
  const setRay = (e: PointerEvent): void => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
  };

  const pick = (e: PointerEvent): CharmObject | 'case' | null => {
    setRay(e);
    const charms = [...objects.values()].filter((o) => !o.removing).map((o) => o.root);
    const hits = raycaster.intersectObjects([...charms, ...(phone?.hitTargets ?? [])], true);
    const first = hits[0];
    if (!first) return null;
    const uid = first.object.userData.uid as number | undefined;
    return uid ? (objects.get(uid) ?? null) : 'case';
  };

  const backFacesCamera = (): boolean => {
    tmpN.set(0, 0, 1).applyQuaternion(root.quaternion);
    return tmpN.dot(tmpV.copy(camera.position).normalize()) > 0.25;
  };

  const pointOnBack = (e: PointerEvent): THREE.Vector3 | null => {
    setRay(e);
    root.updateMatrixWorld();
    tmpN.set(0, 0, 1).applyQuaternion(root.quaternion).normalize();
    backPlane.setFromNormalAndCoplanarPoint(tmpN, root.localToWorld(tmpV.set(0, 0, dims.backTop)));
    const hit = raycaster.ray.intersectPlane(backPlane, new THREE.Vector3());
    return hit ? root.worldToLocal(hit) : null;
  };

  const updateSpinButton = (): void => controls.spin?.setAttribute('aria-pressed', String(spinning));

  canvas.addEventListener('pointerdown', (e) => {
    if (e.button > 0) return;
    canvas.setPointerCapture(e.pointerId);
    const target = pick(e);
    pointer = {
      id: e.pointerId,
      sx: e.clientX,
      sy: e.clientY,
      lx: e.clientX,
      ly: e.clientY,
      moved: false,
      onCase: target === 'case',
    };
    rotation.vx = rotation.vy = 0;
    resetting = false;
    lastInteraction = performance.now();
    if (target && target !== 'case' && backFacesCamera()) dragging = target;
    canvas.classList.add('grabbing');
  });

  canvas.addEventListener('pointermove', (e) => {
    if (!pointer) {
      const target = pick(e);
      const next = target && target !== 'case' && backFacesCamera() ? target : null;
      hovered = next;
      canvas.classList.toggle('over-charm', !!next);
      return;
    }
    if (e.pointerId !== pointer.id) return;
    const dx = e.clientX - pointer.lx;
    const dy = e.clientY - pointer.ly;
    pointer.lx = e.clientX;
    pointer.ly = e.clientY;
    if (!pointer.moved && Math.hypot(e.clientX - pointer.sx, e.clientY - pointer.sy) > TAP_THRESHOLD_PX)
      pointer.moved = true;
    if (!pointer.moved) return;
    lastInteraction = performance.now();
    if (dragging) {
      const p = pointOnBack(e);
      if (!p) return;
      const [px, py] = toPercent(p.x, p.y);
      const clamped = clampToCase({ x: px, y: py }, cameraZoneFor(shownRender));
      dragging.target = toLocal(clamped.x, clamped.y);
    } else {
      spinning = false;
      updateSpinButton();
      rotation.y += dx * 0.0065;
      rotation.x = Math.max(-0.9, Math.min(0.9, rotation.x + dy * 0.005));
      rotation.vy = dx * 0.0065;
      rotation.vx = dy * 0.005;
    }
  });

  const endPointer = (e: PointerEvent): void => {
    if (!pointer || e.pointerId !== pointer.id) return;
    const wasTap = !pointer.moved;
    if (dragging) {
      if (wasTap) store.removeCharm(dragging.uid);
      else {
        const [px, py] = toPercent(dragging.target[0], dragging.target[1]);
        dragging.landing = 1;
        store.moveCharm(dragging.uid, px, py);
      }
    } else if (wasTap && pointer.onCase) {
      rotation.vy = 0.09; // tocar el forro le da un giro juguetón
    }
    dragging = null;
    pointer = null;
    canvas.classList.remove('grabbing');
    lastInteraction = performance.now();
  };
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('pointerleave', () => {
    hovered = null;
    canvas.classList.remove('over-charm');
  });
  const reset = (): void => {
    resetting = true;
    spinning = false;
    updateSpinButton();
    lastInteraction = performance.now();
  };
  canvas.addEventListener('dblclick', reset);
  controls.reset?.addEventListener('click', reset);
  controls.spin?.addEventListener('click', () => {
    spinning = !spinning;
    resetting = false;
    updateSpinButton();
    lastInteraction = performance.now();
  });

  /* ---------- Tamaño ---------- */
  const resize = (): void => {
    const r = stage.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const tanHalf = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    camera.position.z = Math.max(1.95 / (2 * tanHalf), 1.15 / (2 * tanHalf * camera.aspect));
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(stage);

  /* ---------- Animación ---------- */
  let last = performance.now();
  const onScreen = (): boolean => {
    const r = stage.getBoundingClientRect();
    return r.bottom > 0 && r.top < window.innerHeight && r.width > 0;
  };

  const frame = (now: number): void => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const t = now / 1000;
    const k60 = dt * 60;
    const lerpK = (f: number): number => 1 - Math.pow(1 - f, k60); // suavizado independiente de los FPS
    const reduce = prefersReducedMotion();
    const idle = !pointer && now - lastInteraction > IDLE_AFTER_MS && !reduce;

    if (resetting) {
      rotation.vx = rotation.vy = 0;
      rotation.x += (DEFAULT_ROTATION.x - rotation.x) * lerpK(0.14);
      const target =
        DEFAULT_ROTATION.y + Math.round((rotation.y - DEFAULT_ROTATION.y) / (Math.PI * 2)) * Math.PI * 2;
      rotation.y += (target - rotation.y) * lerpK(0.14);
      if (Math.abs(target - rotation.y) < 0.002 && Math.abs(DEFAULT_ROTATION.x - rotation.x) < 0.002)
        resetting = false;
    } else if (spinning) {
      rotation.y += dt * 1.1;
    } else if (!pointer) {
      rotation.y += rotation.vy * k60;
      rotation.x = Math.max(-0.9, Math.min(0.9, rotation.x + rotation.vx * k60));
      rotation.vy *= Math.pow(0.9, k60);
      rotation.vx *= Math.pow(0.86, k60);
    }
    const sway = idle && !spinning ? Math.sin(t * 0.7) * 0.06 : 0;
    root.rotation.set(rotation.x + (idle ? Math.sin(t * 0.9) * 0.025 : 0), rotation.y + sway, 0);
    root.position.y = idle ? Math.sin(t * 1.3) * 0.015 : root.position.y * Math.pow(0.9, k60);
    if (bumpT > 0) {
      bumpT = Math.max(0, bumpT - dt * 2.8);
      root.scale.setScalar(1 + Math.sin(bumpT * Math.PI) * 0.035);
    }

    objects.forEach((o, uid) => {
      const r = o.root;
      if (o.appear < 1) {
        if (o.delay > 0) {
          o.delay -= dt;
          r.scale.setScalar(0.0001);
          return;
        }
        o.appear = Math.min(1, o.appear + dt / 0.55);
      }
      const follow = lerpK(o === dragging ? 0.45 : 0.2);
      r.position.x += (o.target[0] - r.position.x) * follow;
      r.position.y += (o.target[1] - r.position.y) * follow;
      o.lift += ((o === dragging ? 0.09 : o === hovered ? 0.025 : 0) - o.lift) * lerpK(0.25);
      if (o.landing) o.landing = Math.max(0, o.landing - dt * 3);
      r.position.z = dims.backTop + (1 - ease.outCubic(o.appear)) * 0.55 + o.lift;
      const grow = o === dragging ? 1.12 : o === hovered ? 1.05 : 1;
      let scale =
        o.size * Math.max(0.0001, ease.outBack(o.appear)) * grow * (1 + Math.sin(o.landing * Math.PI) * 0.08);
      r.rotation.z =
        o.rotation + (1 - ease.outCubic(o.appear)) * 2.4 + (o === dragging ? Math.sin(t * 9) * 0.05 : 0);
      r.rotation.x = o === dragging ? -0.12 : 0;
      if (o.removing) {
        o.removing = Math.min(1, o.removing + dt / 0.32);
        scale *= 1 - ease.outCubic(o.removing);
        r.position.z += o.removing * 0.25;
        r.rotation.z += o.removing * 3;
        if (o.removing >= 1) {
          charmGroup.remove(r);
          objects.delete(uid);
          if (hovered === o) hovered = null;
          return;
        }
      }
      r.scale.setScalar(Math.max(0.0001, scale));
    });

    renderer.render(scene, camera);
  };

  // Se dibuja sólo con la pestaña visible y el armador en pantalla
  const tick = (now: number): void => {
    if (document.hidden) return;
    if (stage.classList.contains('is-3d') && onScreen()) frame(now);
    else last = now;
    requestAnimationFrame(tick);
  };
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      last = performance.now();
      requestAnimationFrame(tick);
    }
  });

  /* ---------- Arranque ---------- */
  setPhone(firstPhone, firstRender);
  resize();
  sync(store.getState(), false);
  frame(performance.now());
  requestAnimationFrame(tick);

  return {
    project(uid) {
      const o = objects.get(uid);
      if (!o) return null;
      const v = o.root.getWorldPosition(new THREE.Vector3()).project(camera);
      const r = canvas.getBoundingClientRect();
      return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
    },
    bump() {
      bumpT = 1;
    },
  };
}
