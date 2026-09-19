# 0003 — One dynamic point light per beam, not one per segment

## Context

Spec §6 says a laser beam "também funciona como fonte de luz pontual/spot
ao longo de seu trajeto, iluminando dinamicamente as superfícies próximas"
— it should read as a light source along its whole path, not just a
self-lit line. A beam's path can have up to `MAX_REFLECTIONS` (8) segments
after bouncing off several mirrors, and a level can have multiple emitters
(spec §11, level 10: three emitters) — so a literal "one light per segment"
implementation could mean 20+ real-time point lights active at once.

## Decision

`src/gameplay/laser-beam.js` attaches exactly **one** `THREE.PointLight`
per beam, positioned at the beam's first bounce point (`path[1]`, i.e. just
past the emitter, before any reflection), colored to match the beam's
current composed color. It moves with the beam every frame; it does not
place additional lights at each subsequent reflection point.

## Alternatives considered

- **One light per path segment**: closer to a literal reading of "ao longo
  de seu trajeto," but multiplies live light count by path length across
  every emitter in the scene — a real risk for the NFR "Desempenho" budget
  (60fps on modest hardware) once levels 6-10 have multiple emitters and
  several reflections each. Rejected for this project's scale.
- **No dynamic light at all, just the emissive line**: cheapest, but skips
  the illuminating-surfaces-nearby part of the requirement entirely, and
  the rastreabilidade table (spec §13) explicitly credits the beam as a
  dynamic light source for the "Iluminação" axis of the discipline.

## Consequences

The beam looks like it emits light near where it leaves the emitter, but a
reflection deep into a level (e.g. the third bounce) won't cast its own
local glow — only the beam's own emissive line is visible past the first
segment. Acceptable given the minimalist, low-light aesthetic (dark rooms,
high-contrast beams per spec §3) where the line itself is already the
primary visual read. Revisit only if playtesting on levels 6-10 shows the
single light isn't enough to sell "the beam lights the room."
