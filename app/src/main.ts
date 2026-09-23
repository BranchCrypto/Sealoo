import {
  AmbientLight,
  AnimationMixer,
  Box3,
  Clock,
  Color,
  DirectionalLight,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PerspectiveCamera,
  Raycaster,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { emit } from "@tauri-apps/api/event";
import { LogicalPosition } from "@tauri-apps/api/dpi";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { cursorPosition, getCurrentWindow } from "@tauri-apps/api/window";
import { bindDragBones, resetDragCamera } from "./movement/drag";
import { setClips, update as updateMotion } from "./movement/router";
import { invoke } from "@tauri-apps/api/core";
import { isSetupComplete } from "./prefs";
import { mountQuickbar, type AgentEvent } from "./quickbar";
import { runUiPrepaidTask } from "./agentBridge";
import { pushHistory } from "./web3";

const MODEL_URL = "/models/pet.glb";
const TURN_SENSITIVITY = 0.01;
/** Blender→glTF faces −Z; yaw π so the head looks at the camera (+Z). */
const PET_YAW = Math.PI;

const rootEl = document.querySelector<HTMLDivElement>("#pet");
if (!rootEl) throw new Error("#pet missing");
const root = rootEl;
const appWindow = getCurrentWindow();

const scene = new Scene();
const camera = new PerspectiveCamera(35, 1, 0.1, 100);
const renderer = new WebGLRenderer({ antialias: true, alpha: true });
renderer.outputColorSpace = SRGBColorSpace;
renderer.setClearColor(0x000000, 0);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
root.appendChild(renderer.domElement);

scene.add(new AmbientLight(0xffffff, 0.6));
const key = new DirectionalLight(0xffffff, 1.4);
key.position.set(2, 4, 3);
scene.add(key);
const fill = new DirectionalLight(0xffffff, 0.45);
fill.position.set(-3, 1, -2);
scene.add(fill);

const clock = new Clock();
let pet: Object3D | null = null;
const camRest = new Vector3();

let turning = false;
let lastPointerX = 0;

/** Press past threshold, then move the window via setPosition. */
const DRAG_THRESHOLD_PX = 12;
let pressPending = false;
let pressStartX = 0;
let pressStartY = 0;
let dragging = false;
let grabReady = false;
let grabOffsetX = 0;
let grabOffsetY = 0;
let lastScreenX = 0;
let lastScreenY = 0;
const dragVel = { x: 0, y: 0 };
let lastDragT = 0;
/** Coalesce setPosition to one IPC per frame. */
let posRaf = 0;
let posX = 0;
let posY = 0;

/** Transparent areas click through; only the pet mesh receives input. */
const raycaster = new Raycaster();
const pointerNdc = new Vector2();
let ignoringCursor = true;
let hitPollBusy = false;
let menuOpen = false;

const menuEl = document.querySelector<HTMLElement>("#ctx-menu");
if (!menuEl) throw new Error("#ctx-menu missing");
const menu = menuEl;

const quickbar = mountQuickbar({
  openDetails: (view) => {
    void openHome(view ?? "chat");
  },
  onChromeChange: (active) => {
    if (!active) return;
    root.classList.add("hit");
    ignoringCursor = false;
    void appWindow.setIgnoreCursorEvents(false).catch(() => {});
  },
  run(prompt, onEvent) {
    return runUiPrepaidTask(prompt, (ev) => {
      if (ev.type === "credit_settled" && ev.credit) {
        const c = ev.credit;
        pushHistory({
          taskId: c.taskId,
          prompt,
          estimateCredit: c.estimate,
          actualCredit: c.actual,
          refund: c.refund,
          explorerUrl: c.explorerUrl,
          at: Date.now(),
        });
      }
      onEvent(ev as AgentEvent);
    });
  },
});

function hitPetAtClient(clientX: number, clientY: number): boolean {
  if (!pet) return false;
  const rect = renderer.domElement.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  pointerNdc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointerNdc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointerNdc, camera);
  return raycaster.intersectObject(pet, true).length > 0;
}

async function syncClickThrough() {
  if (hitPollBusy || dragging || pressPending || turning || menuOpen) return;
  hitPollBusy = true;
  try {
    const [cur, pos, size, factor] = await Promise.all([
      cursorPosition(),
      appWindow.outerPosition(),
      appWindow.outerSize(),
      appWindow.scaleFactor(),
    ]);
    const localX = (cur.x - pos.x) / factor;
    const localY = (cur.y - pos.y) / factor;
    const w = size.width / factor;
    const h = size.height / factor;
    const inside = localX >= 0 && localY >= 0 && localX < w && localY < h;
    const overUi = inside && quickbar.hitTest(localX, localY);
    const over = inside && (overUi || hitPetAtClient(localX, localY));
    root.classList.toggle("hit", over);
    if (over === !ignoringCursor) return;
    ignoringCursor = !over;
    await appWindow.setIgnoreCursorEvents(ignoringCursor);
  } catch {
    /* permissions / early startup */
  } finally {
    hitPollBusy = false;
  }
}

function closeMenu() {
  if (!menuOpen) return;
  menuOpen = false;
  menu.hidden = true;
}

function openMenu(clientX: number, clientY: number) {
  menuOpen = true;
  menu.hidden = false;
  root.classList.add("hit");
  ignoringCursor = false;
  void appWindow.setIgnoreCursorEvents(false).catch(() => {});

  const pad = 8;
  const mw = menu.offsetWidth;
  const mh = menu.offsetHeight;
  const x = Math.min(Math.max(pad, clientX), window.innerWidth - mw - pad);
  const y = Math.min(Math.max(pad, clientY), window.innerHeight - mh - pad);
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
}

async function openHome(view: "home" | "wallet" | "chat" | "history" | "settings" = "home") {
  const home = await WebviewWindow.getByLabel("home");
  if (!home) return;
  await home.unminimize();
  await home.show();
  await home.setFocus();
  await emit("sealoo-home-view", view);
}

async function maybeOpenFirstRun() {
  if (await isSetupComplete()) return;
  await openHome();
}

function fitCameraToObject(object: Object3D) {
  const box = new Box3().setFromObject(object);
  const size = box.getSize(new Vector3());
  const center = box.getCenter(new Vector3());
  object.position.sub(center);

  const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
  // Distance leaves room for flop / cam inertia inside the window.
  camRest.set(0, radius * 0.22, radius * 4.8);
  resetDragCamera();
  camera.position.copy(camRest);
  camera.near = radius / 100;
  camera.far = radius * 100;
  camera.lookAt(0, 0, 0);
  camera.updateProjectionMatrix();
}

function resize() {
  const { clientWidth: w, clientHeight: h } = root;
  camera.aspect = w / Math.max(h, 1);
  camera.updateProjectionMatrix();
  renderer.setSize(w, h, false);
}

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 30);
  updateMotion(dt, { dragging, dragVel, camera, camRest });
  renderer.render(scene, camera);
  void syncClickThrough();
  requestAnimationFrame(frame);
}

async function loadPet() {
  try {
    const gltf = await new GLTFLoader().loadAsync(MODEL_URL);
    pet = gltf.scene;
    pet.rotation.y = PET_YAW;
    scene.add(pet);
    fitCameraToObject(pet);
    bindDragBones(pet);
    setClips(new AnimationMixer(pet), gltf.animations);
  } catch (err) {
    console.warn(
      `Missing ${MODEL_URL} — export from Blender into public/models/pet.glb`,
      err,
    );
    pet = new Mesh(
      new SphereGeometry(0.6, 32, 16),
      new MeshStandardMaterial({ color: new Color("#5a6b76") }),
    );
    scene.add(pet);
    fitCameraToObject(pet);
  }
}

function queueWindowPos(x: number, y: number) {
  posX = x;
  posY = y;
  if (posRaf) return;
  posRaf = requestAnimationFrame(() => {
    posRaf = 0;
    void appWindow.setPosition(new LogicalPosition(posX, posY));
  });
}

async function armWindowDrag(e: PointerEvent) {
  pressPending = true;
  dragging = false;
  grabReady = false;
  pressStartX = e.screenX;
  pressStartY = e.screenY;
  lastScreenX = e.screenX;
  lastScreenY = e.screenY;
  lastDragT = performance.now();
  dragVel.x = 0;
  dragVel.y = 0;
  root.setPointerCapture(e.pointerId);
  try {
    const [pos, factor] = await Promise.all([
      appWindow.outerPosition(),
      appWindow.scaleFactor(),
    ]);
    if (!pressPending && !dragging) return;
    grabOffsetX = pressStartX - pos.x / factor;
    grabOffsetY = pressStartY - pos.y / factor;
    grabReady = true;
    if (dragging) {
      queueWindowPos(lastScreenX - grabOffsetX, lastScreenY - grabOffsetY);
    }
  } catch {
    grabOffsetX = 0;
    grabOffsetY = 0;
    grabReady = true;
  }
}

function moveWindowDrag(e: PointerEvent) {
  if (pressPending) {
    if (
      Math.hypot(e.screenX - pressStartX, e.screenY - pressStartY) <
      DRAG_THRESHOLD_PX
    ) {
      return;
    }
    pressPending = false;
    dragging = true;
    lastScreenX = e.screenX;
    lastScreenY = e.screenY;
    lastDragT = performance.now();
  }
  if (!dragging) return;

  const now = performance.now();
  const dt = Math.max((now - lastDragT) / 1000, 1 / 240);
  dragVel.x = (e.screenX - lastScreenX) / dt;
  dragVel.y = (e.screenY - lastScreenY) / dt;
  lastScreenX = e.screenX;
  lastScreenY = e.screenY;
  lastDragT = now;

  if (!grabReady) return;
  queueWindowPos(e.screenX - grabOffsetX, e.screenY - grabOffsetY);
}

function endWindowDrag(e: PointerEvent) {
  if (!pressPending && !dragging) return;
  const wasClick = pressPending && !dragging;
  pressPending = false;
  dragging = false;
  grabReady = false;
  if (root.hasPointerCapture(e.pointerId)) {
    root.releasePointerCapture(e.pointerId);
  }
  if (wasClick) {
    if (quickbar.isBusy()) quickbar.focusStrip();
    else quickbar.openPrompt();
  }
}

root.addEventListener("pointerdown", (e) => {
  if (e.button !== 0) return;
  if ((e.target as HTMLElement | null)?.closest("#quickbar, #ctx-menu")) return;
  if (menuOpen) {
    closeMenu();
    return;
  }
  if (!hitPetAtClient(e.clientX, e.clientY)) {
    if (quickbar.isChromeOpen() && !quickbar.isBusy()) quickbar.closePrompt();
    return;
  }

  if (e.altKey && pet) {
    turning = true;
    lastPointerX = e.clientX;
    root.setPointerCapture(e.pointerId);
    return;
  }

  void armWindowDrag(e);
});

root.addEventListener("pointermove", (e) => {
  if (turning && pet) {
    pet.rotation.y += (e.clientX - lastPointerX) * TURN_SENSITIVITY;
    lastPointerX = e.clientX;
    return;
  }
  moveWindowDrag(e);
});

root.addEventListener("pointerup", (e) => {
  if (turning) {
    turning = false;
    if (root.hasPointerCapture(e.pointerId)) {
      root.releasePointerCapture(e.pointerId);
    }
    return;
  }
  endWindowDrag(e);
});

root.addEventListener("pointercancel", (e) => {
  turning = false;
  endWindowDrag(e);
});

root.addEventListener("contextmenu", (e) => {
  e.preventDefault();
  if (!hitPetAtClient(e.clientX, e.clientY)) return;
  openMenu(e.clientX, e.clientY);
});

menu.addEventListener("click", (e) => {
  const btn = (e.target as HTMLElement | null)?.closest("button[data-action]");
  if (!btn) return;
  const action = btn.getAttribute("data-action");
  closeMenu();
  if (action === "home") void openHome("home");
  else if (action === "wallet") void openHome("wallet");
  else if (action === "settings") void openHome("settings");
  else if (action === "quit") void invoke("quit_app");
});

window.addEventListener("pointerdown", (e) => {
  if (!menuOpen) return;
  if (menu.contains(e.target as Node)) return;
  closeMenu();
});

window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeMenu();
  }
});

window.addEventListener("resize", resize);
resize();
void appWindow.setIgnoreCursorEvents(true).catch(() => {});
void loadPet();
void maybeOpenFirstRun();
frame();
