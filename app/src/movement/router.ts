import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  LoopOnce,
  PerspectiveCamera,
  Vector3,
} from "three";
import { updateDragMotion } from "./drag";

export type ActionDef = {
  id: string;
  /** Relative chance when auto-picking. 0 = never ambient-picked. */
  weight: number;
  /** Inclusive hold time in seconds before the next pick. */
  duration: [number, number];
  /** glTF clip name; omit / null = rest (no clip). */
  clip?: string | null;
};

export type RouterCtx = {
  dragging: boolean;
  dragVel: { x: number; y: number };
  camera: PerspectiveCamera;
  camRest: Vector3;
};

const FADE = 0.25;

const actions: ActionDef[] = [];
let mixer: AnimationMixer | null = null;
const clips = new Map<string, AnimationClip>();
let current: ActionDef | null = null;
let remaining = 0;
let playing: AnimationAction | null = null;

function randRange([lo, hi]: [number, number]) {
  return lo + Math.random() * (hi - lo);
}

function pickWeighted(pool: ActionDef[]): ActionDef {
  const total = pool.reduce((s, a) => s + a.weight, 0);
  let r = Math.random() * total;
  for (const a of pool) {
    r -= a.weight;
    if (r <= 0) return a;
  }
  return pool[pool.length - 1]!;
}

function enter(action: ActionDef) {
  if (playing) {
    playing.fadeOut(FADE);
    playing = null;
  }

  if (action.clip && mixer) {
    const clip = clips.get(action.clip);
    if (clip) {
      const next = mixer.clipAction(clip);
      next.reset();
      next.setLoop(LoopOnce, 1);
      next.clampWhenFinished = true;
      next.fadeIn(FADE).play();
      playing = next;
    }
  }

  current = action;
  remaining = randRange(action.duration);
}

function pickNext() {
  const pool = actions.filter((a) => a.weight > 0);
  if (pool.length === 0) return;

  let next = pickWeighted(pool);
  if (pool.length > 1 && current) {
    let guard = 8;
    while (next.id === current.id && guard--) next = pickWeighted(pool);
  }
  enter(next);
}

/** Replace ambient table. Always seeds a `rest` entry. */
export function setActions(defs: ActionDef[]) {
  actions.length = 0;
  actions.push({ id: "rest", weight: 3, duration: [4, 10], clip: null });
  for (const d of defs) {
    if (d.id === "rest") continue;
    actions.push(d);
  }
  pickNext();
}

/** Bind glTF clips; each clip becomes a weight-1 ambient action. */
export function setClips(m: AnimationMixer, list: AnimationClip[]) {
  mixer = m;
  clips.clear();
  const defs: ActionDef[] = [];
  for (const clip of list) {
    clips.set(clip.name, clip);
    const hold = Math.max(clip.duration, 0.5);
    defs.push({
      id: clip.name,
      weight: 1,
      duration: [hold, hold * 1.15],
      clip: clip.name,
    });
  }
  setActions(defs);
}

export function currentAction() {
  return current?.id ?? "rest";
}

/** Sole per-frame entry: drag physics + mixer + ambient schedule. */
export function update(dt: number, ctx: RouterCtx) {
  const dragBusy =
    ctx.dragging || Math.hypot(ctx.dragVel.x, ctx.dragVel.y) > 40;

  // Drag / settle owns bones — stop clips so mixer cannot overwrite flop.
  if (dragBusy) {
    if (playing) {
      playing.stop();
      playing = null;
    }
  } else {
    mixer?.update(dt);
  }

  updateDragMotion(dt, ctx.dragging, ctx.dragVel, ctx.camera, ctx.camRest);

  // Freeze ambient until drag + settle bleed finish.
  if (dragBusy || !current) return;

  remaining -= dt;
  if (remaining <= 0) pickNext();
}
