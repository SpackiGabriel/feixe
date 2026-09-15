// PROTOTYPE — throwaway. Pure logic module: reflection + color composition.
//
// Question being answered: does the "reflect a ray off a rotatable mirror
// segment, pass it through filters, block it, and additively combine colors
// at a receiver" model (feixe-especificacao.pdf §4-§8, RF04/RF05) actually
// produce correct, predictable beam paths — and does the plane-segment
// reflection formula generalize cleanly to any mirror angle without special
// cases? This module is 2D top-down (mirrors/emitters rotate only around
// the vertical axis per the spec), which is the real geometry that matters
// for correctness; the 3D scene is just this plane extruded upward.

const EPS = 1e-4;

export function vec(x, y) {
  return { x, y };
}

export function sub(a, b) {
  return vec(a.x - b.x, a.y - b.y);
}

export function add(a, b) {
  return vec(a.x + b.x, a.y + b.y);
}

export function scale(a, s) {
  return vec(a.x * s, a.y * s);
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function normalize(a) {
  const len = Math.hypot(a.x, a.y) || 1;
  return vec(a.x / len, a.y / len);
}

export function perpendicular(a) {
  return vec(-a.y, a.x);
}

export function reflect(dir, normal) {
  const n = normalize(normal);
  const d2 = 2 * dot(dir, n);
  return normalize(sub(dir, scale(n, d2)));
}

export function fromAngle(deg) {
  const r = (deg * Math.PI) / 180;
  return vec(Math.cos(r), Math.sin(r));
}

// Ray (origin + dir) vs segment (a-b). Returns {t, s, point} or null.
// t = distance along ray, s = param along segment [0,1].
export function intersectRaySegment(origin, dir, a, b) {
  const v1 = sub(origin, a);
  const v2 = sub(b, a);
  const v3 = vec(-dir.y, dir.x);
  const denom = dot(v2, v3);
  if (Math.abs(denom) < 1e-9) return null; // parallel
  const t = (v2.x * v1.y - v2.y * v1.x) / denom;
  const s = dot(v1, v3) / denom;
  if (t > EPS && s >= 0 && s <= 1) {
    return { t, s, point: add(origin, scale(dir, t)) };
  }
  return null;
}

// segment: { id, type: 'wall'|'mirror'|'blocker'|'filter'|'receiver', a, b, primary?, target? }
// emitter: { pos, dir (unit vec), color: {r,g,b} booleans }
export function traceBeam(segments, emitter, maxReflections = 8) {
  let pos = emitter.pos;
  let dir = normalize(emitter.dir);
  let color = { ...emitter.color };
  const path = [pos];
  let reflections = 0;

  for (let step = 0; step < maxReflections + segments.length + 1; step++) {
    let closest = null;
    for (const seg of segments) {
      const hit = intersectRaySegment(pos, dir, seg.a, seg.b);
      if (hit && (!closest || hit.t < closest.hit.t)) {
        closest = { hit, seg };
      }
    }

    if (!closest) {
      path.push(add(pos, scale(dir, 30)));
      return { path, status: "escaped", color };
    }

    path.push(closest.hit.point);
    const seg = closest.seg;

    if (seg.type === "wall") {
      return { path, status: "absorbed-wall", segment: seg, color };
    }
    if (seg.type === "blocker") {
      return { path, status: "blocked", segment: seg, color };
    }
    if (seg.type === "receiver") {
      return { path, status: "hit-receiver", segment: seg, color };
    }
    if (seg.type === "filter") {
      const filtered = {
        r: color.r && seg.primary.r ? 1 : 0,
        g: color.g && seg.primary.g ? 1 : 0,
        b: color.b && seg.primary.b ? 1 : 0,
      };
      if (!filtered.r && !filtered.g && !filtered.b) {
        return { path, status: "absorbed-filter", segment: seg, color };
      }
      color = filtered;
      pos = add(closest.hit.point, scale(dir, EPS));
      continue; // filter does not change direction
    }
    if (seg.type === "mirror") {
      if (reflections >= maxReflections) {
        return { path, status: "max-reflections", segment: seg, color };
      }
      const normal = perpendicular(sub(seg.b, seg.a));
      dir = reflect(dir, normal);
      pos = add(closest.hit.point, scale(dir, EPS));
      reflections++;
      continue;
    }
  }
  return { path, status: "max-reflections", color };
}

// Additive color composition: OR together every beam that lands on the same
// receiver id, then compare against the receiver's required target color.
export function evaluateReceiver(traces, receiverId, target) {
  const hits = traces.filter(
    (t) => t.status === "hit-receiver" && t.segment.id === receiverId
  );
  const composed = { r: 0, g: 0, b: 0 };
  for (const h of hits) {
    composed.r |= h.color.r ? 1 : 0;
    composed.g |= h.color.g ? 1 : 0;
    composed.b |= h.color.b ? 1 : 0;
  }
  const satisfied =
    composed.r === (target.r ? 1 : 0) &&
    composed.g === (target.g ? 1 : 0) &&
    composed.b === (target.b ? 1 : 0) &&
    hits.length > 0;
  return { composed, satisfied, hitCount: hits.length };
}
