// Pure beam-tracing and color-composition logic (spec §4-§8, RF04/RF05).
// Framework-agnostic (no Three.js, no DOM) so it's unit-testable in
// isolation — this is the highest-risk system in the project. Validated
// first in prototypes/mirror-reflection/engine.mjs; this is the
// production rewrite of that validated model (2D in the XZ plane, since
// mirrors/emitters only rotate around the vertical axis).

export const MAX_REFLECTIONS = 8; // NFR "Desempenho": bounds cost per beam per frame
const EPS = 1e-4;
const ESCAPE_DISTANCE = 30;

function vec(x, z) { return { x, z }; }
function sub(a, b) { return vec(a.x - b.x, a.z - b.z); }
function add(a, b) { return vec(a.x + b.x, a.z + b.z); }
function scale(a, s) { return vec(a.x * s, a.z * s); }
function dot(a, b) { return a.x * b.x + a.z * b.z; }
function normalize(a) {
  const len = Math.hypot(a.x, a.z) || 1;
  return vec(a.x / len, a.z / len);
}
function perpendicular(a) { return vec(-a.z, a.x); }

// Invariant to which side of the mirror the normal points to — confirmed
// in the prototype across arbitrary angles, no per-orientation special case.
export function reflect(dir, normal) {
  const n = normalize(normal);
  const d2 = 2 * dot(dir, n);
  return normalize(sub(dir, scale(n, d2)));
}

// Ray (origin + dir) vs. segment (a-b). Returns {t, s, point} or null.
// t = distance along the ray, s = position along the segment in [0,1].
export function intersectRaySegment(origin, dir, a, b) {
  const v1 = sub(origin, a);
  const v2 = sub(b, a);
  const v3 = vec(-dir.z, dir.x);
  const denom = dot(v2, v3);
  if (Math.abs(denom) < 1e-9) return null; // parallel
  const t = (v2.x * v1.z - v2.z * v1.x) / denom;
  const s = dot(v1, v3) / denom;
  if (t > EPS && s >= 0 && s <= 1) {
    return { t, s, point: add(origin, scale(dir, t)) };
  }
  return null;
}

// segment: { type: 'wall'|'mirror'|'blocker'|'filter'|'receiver', a, b, id?, primary? }
// emitter: { pos: {x,z}, dir: {x,z}, color: {r,g,b} } (r/g/b are 0|1 booleans)
export function traceBeam(segments, emitter, maxReflections = MAX_REFLECTIONS) {
  let pos = emitter.pos;
  let dir = normalize(emitter.dir);
  let color = { ...emitter.color };
  const path = [pos];
  let reflections = 0;

  const stepLimit = maxReflections + segments.length + 1;
  for (let step = 0; step < stepLimit; step++) {
    let closest = null;
    for (const seg of segments) {
      const hit = intersectRaySegment(pos, dir, seg.a, seg.b);
      if (hit && (!closest || hit.t < closest.hit.t)) closest = { hit, seg };
    }

    if (!closest) {
      path.push(add(pos, scale(dir, ESCAPE_DISTANCE)));
      return { path, status: 'escaped', color };
    }

    path.push(closest.hit.point);
    const seg = closest.seg;

    if (seg.type === 'wall') return { path, status: 'absorbed-wall', segment: seg, color };
    if (seg.type === 'blocker') return { path, status: 'blocked', segment: seg, color };
    if (seg.type === 'receiver') return { path, status: 'hit-receiver', segment: seg, color };

    if (seg.type === 'filter') {
      const filtered = {
        r: color.r && seg.primary.r ? 1 : 0,
        g: color.g && seg.primary.g ? 1 : 0,
        b: color.b && seg.primary.b ? 1 : 0,
      };
      if (!filtered.r && !filtered.g && !filtered.b) {
        return { path, status: 'absorbed-filter', segment: seg, color };
      }
      color = filtered;
      pos = add(closest.hit.point, scale(dir, EPS));
      continue; // filter does not change direction
    }

    if (seg.type === 'mirror') {
      if (reflections >= maxReflections) {
        return { path, status: 'max-reflections', segment: seg, color };
      }
      const normal = perpendicular(sub(seg.b, seg.a));
      dir = reflect(dir, normal);
      pos = add(closest.hit.point, scale(dir, EPS));
      reflections++;
      continue;
    }
  }
  return { path, status: 'max-reflections', color };
}

// Additive composition (spec §7): OR together every beam that currently
// lands on the same receiver id. Whether that composed color "satisfies"
// the receiver's target is the receiver/door system's decision, not this
// module's.
export function composeReceiverColor(traces, receiverId) {
  const composed = { r: 0, g: 0, b: 0 };
  let hitCount = 0;
  for (const trace of traces) {
    if (trace.status === 'hit-receiver' && trace.segment.id === receiverId) {
      composed.r |= trace.color.r ? 1 : 0;
      composed.g |= trace.color.g ? 1 : 0;
      composed.b |= trace.color.b ? 1 : 0;
      hitCount++;
    }
  }
  return { composed, hitCount };
}

// Spec §8: a receiver activates only while the correct color continuously
// hits it — no hits at all is never "satisfied", even if an empty
// composition would otherwise equal a (nonsensical) black target.
export function isReceiverSatisfied(composed, target, hitCount) {
  return (
    hitCount > 0 &&
    composed.r === (target.r ? 1 : 0) &&
    composed.g === (target.g ? 1 : 0) &&
    composed.b === (target.b ? 1 : 0)
  );
}

export function colorToHex(color) {
  const r = color.r ? 0xff : 0;
  const g = color.g ? 0xff : 0;
  const b = color.b ? 0xff : 0;
  return (r << 16) | (g << 8) | b;
}
