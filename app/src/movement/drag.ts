import { Euler, Object3D, PerspectiveCamera, Vector3 } from "three";

/** px/s window velocity → spring force. ~800px/s → visible lean. */
const VEL_TO_FORCE = 0.008;
const GRAVITY = 18;
const MAX_ANGLE = 0.85;

/** Window velocity → camera offset (world). Lift → cam rises → pet reads as sagging. */
const CAM_VEL = 0.00028;
const CAM_HANG = 0.07;
const CAM_MAX = 0.2;
const CAM_STIFF = 22;
const CAM_DAMP = 7;

type FlopBone = {
  obj: Object3D;
  rest: Euler;
  vx: number;
  vz: number;
  stiff: number;
  damp: number;
  response: number;
  hang: number;
  side: number;
};

const FLOP_SPEC: Array<
  Omit<FlopBone, "obj" | "rest" | "vx" | "vz"> & { name: string }
> = [
  // Soft body; stiff head/neck. Vertical sag comes from camera offset.
  { name: "spine_01", stiff: 16, damp: 5, response: 1.1, hang: 0.28, side: 0 },
  { name: "spine_02", stiff: 13, damp: 4.5, response: 1.2, hang: 0.32, side: 0 },
  { name: "neck", stiff: 42, damp: 10, response: 0.12, hang: 0.03, side: 0 },
  { name: "head", stiff: 55, damp: 12, response: 0.04, hang: 0.01, side: 0 },
  { name: "flipper_L", stiff: 7, damp: 3, response: 1.8, hang: 0.35, side: -1 },
  { name: "flipper_R", stiff: 7, damp: 3, response: 1.8, hang: 0.35, side: 1 },
  { name: "tail_base", stiff: 9, damp: 3.5, response: 1.3, hang: 0.2, side: 0 },
  { name: "tail_L", stiff: 6, damp: 2.5, response: 1.9, hang: 0.4, side: -1 },
  { name: "tail_R", stiff: 6, damp: 2.5, response: 1.9, hang: 0.4, side: 1 },
];

let flopBones: FlopBone[] = [];
let camOx = 0;
let camOy = 0;
let camVx = 0;
let camVy = 0;

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

function stepFlop(
  angle: number,
  vel: number,
  rest: number,
  force: number,
  stiff: number,
  damp: number,
  dt: number,
  maxAngle: number,
): { angle: number; vel: number } {
  const a = stiff * (rest - angle) - damp * vel + force;
  const nextVel = vel + a * dt;
  const nextAngle = clamp(angle + nextVel * dt, rest - maxAngle, rest + maxAngle);
  return { angle: nextAngle, vel: nextVel };
}

export function bindDragBones(rootObj: Object3D) {
  const byName = new Map<string, Object3D>();
  rootObj.traverse((o) => {
    if (o.name) byName.set(o.name, o);
  });

  flopBones = [];
  for (const spec of FLOP_SPEC) {
    const obj = byName.get(spec.name);
    if (!obj) continue;
    flopBones.push({
      obj,
      rest: obj.rotation.clone(),
      vx: 0,
      vz: 0,
      stiff: spec.stiff,
      damp: spec.damp,
      response: spec.response,
      hang: spec.hang,
      side: spec.side,
    });
  }
  console.info(`[flop] bound ${flopBones.length}/${FLOP_SPEC.length} bones`);
}

export function resetDragCamera() {
  camOx = camOy = camVx = camVy = 0;
}

function updateCameraInertia(
  dt: number,
  dragging: boolean,
  dragVelX: number,
  dragVelY: number,
  camera: PerspectiveCamera,
  camRest: Vector3,
) {
  if (camRest.lengthSq() === 0) return;

  const active = dragging || Math.hypot(dragVelX, dragVelY) > 40;
  const forceX = -dragVelX * CAM_VEL;
  const forceY = -dragVelY * CAM_VEL + (active ? CAM_HANG : 0);

  const x = stepFlop(camOx, camVx, 0, forceX, CAM_STIFF, CAM_DAMP, dt, CAM_MAX);
  const y = stepFlop(camOy, camVy, 0, forceY, CAM_STIFF, CAM_DAMP, dt, CAM_MAX);
  camOx = x.angle;
  camVx = x.vel;
  camOy = y.angle;
  camVy = y.vel;

  camera.position.set(camRest.x + camOx, camRest.y + camOy, camRest.z);
  // Partial look-follow: shift reads as weight.
  camera.lookAt(camOx * 0.25, camOy * 0.4, 0);
}

/** Drive soft-body lean from window drag velocity. Mutates `vel` (bleed after release). */
export function updateDragMotion(
  dt: number,
  dragging: boolean,
  vel: { x: number; y: number },
  camera: PerspectiveCamera,
  camRest: Vector3,
) {
  // Bleed velocity after release so bones overshoot then settle.
  if (!dragging) {
    const bleed = Math.exp(-6 * dt);
    vel.x *= bleed;
    vel.y *= bleed;
  }

  updateCameraInertia(dt, dragging, vel.x, vel.y, camera, camRest);

  if (flopBones.length === 0) return;

  const g = dragging || Math.hypot(vel.x, vel.y) > 40 ? GRAVITY : 0;
  // Inertia lags behind window motion (opposite of velocity).
  const fxWorld = -vel.x * VEL_TO_FORCE;
  const fyWorld = -vel.y * VEL_TO_FORCE;

  for (const b of flopBones) {
    const forceX = fyWorld * b.response + g * b.hang;
    const forceZ = fxWorld * b.response * (1 + Math.abs(b.side) * 0.5);

    const x = stepFlop(
      b.obj.rotation.x,
      b.vx,
      b.rest.x,
      forceX,
      b.stiff,
      b.damp,
      dt,
      MAX_ANGLE,
    );
    const z = stepFlop(
      b.obj.rotation.z,
      b.vz,
      b.rest.z,
      forceZ,
      b.stiff,
      b.damp,
      dt,
      MAX_ANGLE,
    );
    b.obj.rotation.x = x.angle;
    b.vx = x.vel;
  b.obj.rotation.z = z.angle;
  b.vz = z.vel;
  }
}
