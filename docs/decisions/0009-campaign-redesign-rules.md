# 0009 — Rules adopted for the 2026-11-05 campaign redesign

## Context

All ten levels were re-authored (`design/campaign.md`). Four questions
came up that a future level author would otherwise re-derive:

1. How binding is spec §11's per-level description (object counts)?
2. Free vs. snapped rotation.
3. The portal re-emits every beam from the far portal's center, and both
   faces of a mirror reflect: engine simplifications, or rules?
4. Level 9 goes back to a receiver shared by both doors (ADR 0008,
   which the team had set aside for a sequence design).

The course brief grades only the four CG axes, not level design; §11 is
the students' own proposal. The obligations are the RFs/NFRs: ten levels
in fixed order, AND/OR/NOT, §7 color rules, portals from L8 on, and §3's
"no pixel-perfect placement, no blind trial and error, no large object
counts".

## Decision

1. **§11 names, order and the concept each level teaches are binding.**
   Object counts are soft targets: deviate only to serve the experience,
   and say why in the level file. Current deviation: L10 has 4 mirrors,
   not 6 (§11 itself asks for an object count comparable to L8–9).
2. **Rotatable mirrors snap**: 15° where the angle is the lesson
   (L3–L5), 45° where routes are planned (L6–L10, spec §5's own "fixed
   45° steps"). Free rotation at room scale leaves ±1–2° of slack
   (measured), which is pixel-precise with a mouse, and 15° steps put
   beams on a 30° grid, which produced diagonal shortcuts in L6.
3. **"A portal re-emits from its center" and "mirrors are two-sided" are
   game rules**, not bugs to fix. L10 depends on the first (two beams
   merge), L9 and L10 on the second. L8 shows the first harmlessly
   (beam 0.45 m off-center). Changing either breaks those levels.
4. **L9: one receiver feeds both doors**, as ADR 0008 described, but the
   OR door now has its own decoy receiver, so the OR choice has a
   consequence (the decoy starves the exit). Supersedes the sequence
   design noted in 0008.

## Alternatives considered

- Keep free rotation and widen tolerances by moving targets closer:
  receivers within ~2.3 m of their mirror for ±5°, which would cramp every
  room.
- 45° everywhere: L3's lesson (the beam turns twice as far) would need
  non-right angles, which 45° can't show.
- Change the portal to keep the entry offset (physically nicer): costs
  L10's central idea; spec §9 only requires the direction remap.

## Consequences

- `npm run analyze` is exact for snapped mirrors (finite states).
- Snapping changes the feel of rotation. The owner's playtest must
  confirm it's comfortable (`design/campaign.md` §7).
- A future level that wants free rotation must check its tolerance
  windows with the analyzer (`docs/level-authoring.md`).
