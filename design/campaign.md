# Campaign design (redesign of 2026-11-05)

The design record for the ten levels: why each exists, what it should
teach, how that was checked, and what is still a guess. The levels
themselves are `src/levels/data/level-N.js` (each file's header repeats
its idea). Sources: `docs/research/level-design-research.md`. Rules
adopted: `docs/decisions/0009`.

**Status of the claims below.** *Verified* = `npm test` (solution opens
the exit, scenarios hold), `npm run analyze` (only the intended route
families open the exit; tolerance windows), `npm run e2e` (every level
played in Chromium), spawn screenshots reviewed. *Hypothesis* = anything
about what players notice, understand or enjoy. No naive player has
played this campaign.

## 1. Audit of the previous campaign

The owner played it to the end and enjoyed it. The audit is about what
it left on the table, not about failure. Numbers come from the analyzer
run on the old levels (tag `pre-redesign`).

| Lvl | Finding | Evidence |
|---|---|---|
| all | Rotations needed precision of ±0.3°–4.7° (free rotation). Keyboard Q/E steps of 15° happen to land exactly, which likely hid this; with a mouse (~0.57°/px) it is pixel-precise (spec §3). | tolerance windows: L9 one-sided 0.3°, L10 ±1.1° on four mirrors, L7 ±1.6°, L6 ±1.9° |
| 1 | Switch in plain view; never taught the floor conduit, which is how every later level says "this causes that". | design review |
| 2–3 | One binary action each (slide onto the line; turn to 45°). The angle relationship of L3 was never actually visible. | design review |
| 4 | Two isolated lanes: "colors don't interfere" (spec §11) was never shown, since the beams never crossed. | geometry |
| 5 | Same room as L4 with the mirrors flipped. | design review |
| 6 | **One-mirror shortcut**: the junction mirror alone can aim diagonally onto either receiver. And spec §11's "decide which path is viable given the obstacles" was not met: both paths were symmetric and open. | random search: `e1:m-junction>r-right` (1958/200k) |
| 7 | Two new rules at once (filter + trap), unavoidable per spec; no staging. | design review |
| 8 | Strongest idea of the campaign (edge-on + door order + portal). Edge-on worked only within ±2.4°. | tolerance window |
| 9 | Solvable but almost unfindable without bookkeeping (0 of 200k random configurations open it); difficulty came from four simultaneous exact angles, not from an idea. | random search |
| 10 | Strong idea (two beams merged by the portal) under six mirrors and clutter (STATUS proposal). | screenshots, STATUS |

## 2. What the player learns, and where

Each rule gets a harmless first exposure before a level depends on it.

| Concept | First seen | First needed | Combined | Twisted |
|---|---|---|---|---|
| Conduit = "this feeds that door" | L1 (switch) | L3 (finds the receiver behind) | every level | L9 (one receiver, two conduits) |
| Moving a mirror moves the beam | L2 | L2 | L6 | — |
| Beam turns 2× the mirror's turn | L3 | L3 | L4, L5 | — |
| Solid things stop beams | L2 (short wall) | L6 | L9, L10 | — |
| Edge-on mirror lets the beam pass | L3 (passing 90°) | L8 | — | — |
| Color decides; beams cross freely | L4 | L4 | L5, L9, L10 | — |
| Colors add where they land (AND) | L5 (flicker at start) | L5 | L10 (yellow) | L10 (merge in the portal) |
| Either input opens it (OR) | L6 | L6 | L9 (gate), L10 (blue) | L9 (the quick OR starves the exit) |
| Count corners vs. rails | L6 | L6 | L9 (M2 near miss) | L9 (one mirror covers two corners) |
| Trap = must stay dark (NOT) | L7 (lit at start) | L7 | L9, L10 | — |
| Filter keeps one color | L7 | L7 | L9 | L10 (a filter is a wall for other colors) |
| Order of actions / doors in series | L8 | L8 | — | — |
| Portal relocates a beam | L8 | L8 | L10 | L10 (re-emits from its center → merges) |
| A mirror has two faces | L9 | L9 | L10 (blue south route) | — |

## 3. Pacing

Dominant problem-solving mode per level (not every level is an "aha";
see H3 in the plan) and the number of moves in the intended solution.
New rules arrive in low-move levels (Linehan et al. 2014).

| Lvl | Mode | New rule | Solution size | Shape |
|---|---|---|---|---|
| 1 | exploration | look/move/activate, conduits | 1 | trough |
| 2 | causal mapping | slide | 1 | trough |
| 3 | prediction | rotate | 1 | trough |
| 4 | discrimination | two colors | 2 | low |
| 5 | combination | additive (AND) | 1 | trough |
| 6 | planning | OR | 3 mirrors (5 adjustments) | **peak** |
| 7 | elimination | filter, trap (NOT) | 2 | trough |
| 8 | sequencing + insight | order, portal | 2 + walking | medium |
| 9 | insight (resource reuse) | — | 3 objects | **peak** |
| 10 | synthesis + insight | — | 5 objects | **peak** |

## 4. Level cards

Short form: what it's for, what the player probably thinks first, the
idea that solves it, the likely wrong turn and how the room corrects it.
Risk = my estimate of comprehension risk, for the playtest to check.

**L1 Primeiros passos.** *For:* controls, and reading the floor conduit
from door back to cause. *Start:* facing a locked door; its conduit runs
past the player's feet and turns east. *Wrong turn:* wandering. *Recovery:*
the conduit ends at the only object in the room you can press. *Hook:* an
unpowered mirror and receiver behind frosted glass. Risk: low.

**L2 Reflexo.** *For:* a mirror bends light where it stands. *Start:* the
reflection already crosses the room. *Idea:* slide and watch the beam
sweep the east wall; a short wall swallows it mid-slide, then it comes
back; the receiver sits past it. Risk: low.

**L3 Ângulo.** *For:* the beam turns twice as far as the mirror. *Start:*
mirror face-on; beam comes straight back. *Idea:* each 15° step swings the
beam 30° along the south wall, *behind* the player. *Wrong turn:* not
noticing where the beam lands. *Recovery:* the door's conduit leads
backward to the receiver (L1). Risk: medium (needs turning around).

**L4 Duas cores.** *For:* color decides, not distance; beams cross
without effect. *Start:* each emitter's nearest receiver is the other
color. *Wrong turn:* aiming at the nearest receiver. *Recovery:*
color symbols; the beams visibly cross mid-room. Risk: low.

**L5 Convergência.** *For:* colors add where they land. *Start:* blue
already lands on the magenta receiver and it flickers (rejected).
*Idea:* bring red onto the same receiver. *Wrong turn:* reading the
flicker as "blue is wrong here" and turning blue away. *Recovery:* the
face shows circle + diamond (red + blue); L4 established both beams.
Risk: **medium-high**. The receiver shows a partial composite exactly
like a wrong color (`receiver.js` rejected state). If the playtest
confirms this, the smallest fix is presentation: light the matched
component symbols. Not implemented.

**L6 Bifurcação.** *For:* plan by matching the corners a route needs to
the rails that can reach them; OR = either one. *Start:* receiver A is
near and obvious; the beam already crosses the room. *Idea:* A needs a
mirror at x = −3.5, and M2's rail stops 0.9 m short (the try lands the
beam beside A). B, in the side chamber, needs all three mirrors.
*Payoff:* the door opens with one of its two pips lit. Verified: A is
unreachable (no route family to A in grid or random search). Risk:
medium.

**L7 Filtro.** *For:* NOT (trap) then filter. *Start:* the beam is on the
trap; its diamond pip flashes on the door and its conduit flares.
*Stage 1:* turn the beam away. *Stage 2:* white on the red receiver
flickers (white contains red but isn't red); slide the filter in.
Risk: low.

**L8 Sequência.** Kept (strongest old idea). *For:* a solution can be a
sequence; edge-on lets light through. *Changes:* 45° snap (edge-on was
±1–2°), beam 0.45 m off the portal's center, so it visibly leaves the far
portal from the middle (seed for L10). Risk: medium (unchanged design;
the owner solved it).

**L9 Circuito.** *For:* one mirror can do two jobs. *Start:* trap lit;
blue runs up the middle onto the red receiver (flicker). *Wrong turns:*
(1) turn red north with M2: its rail stops at x = −0.6, so red lands beside
the receiver; (2) open the gate quickly with M4 onto the decoy: the gate
opens, but blue no longer reaches the receiver the exit needs (it has
two conduits, one per door). *Idea:* S, the mirror on blue's column, also
sits on red's row: red hits one face, blue the other. Both doors open
together. Verified: exactly one route family opens the exit. Risk:
**high** (the hardest idea). *Softlock:* opening the gate with the decoy,
walking north, then changing a mirror through the open gate can close it
behind the player. `R` restarts.

**L10 Prisma.** *For:* synthesis; the portal merges two beams into one.
*Start:* the filter sits on green's column; blue hits the wall.
*Idea:* green's column already enters the portal; red needs M1 + M2 to
enter beside it; both leave the far portal from its center as yellow.
Blue chooses: north through the east gap (M5 + M6; forget M6 and blue
hits the trap) or south off the back of M2 (L9's idea). Verified: exactly
these two route families. 4 mirrors instead of 6 (ADR 0009). Risk:
medium-high (depends on the L8 seed being noticed).

## 5. Traceability

| Source / observation | Hypothesis | Implementation | Validation | Result |
|---|---|---|---|---|
| Analyzer baseline: rotations needed 0.3–4.7° | Free rotation makes execution, not reasoning, the difficulty | 15°/45° snaps (ADR 0009) | analyzer: all rotations snapped, rails ≥ 0.3 m | verified |
| Measured: edge-on works within ±1° | Edge-on is fair only when snapped | L8 mirror 45° | e2e L8 on foot | verified |
| 15° snaps → diagonal shortcuts in L6 sketches | Right-angle routes make rails readable as a plan | 45° in L6–L10 | analyzer: one family per level (two in L10, both intended) | verified |
| Baseline: L6 one-mirror shortcut; spec §11 L6 text | Make one route impossible, visibly | L6 rail stops short of A | analyzer: no family reaches A | verified (logic) / hypothesis (readability) |
| Linehan et al. 2014 | New rules in easy levels | L5, L7, L8 low move counts | — | hypothesis |
| Knoblich et al. 1999; Metcalfe & Wiebe 1987 | Few, narrow insight beats; the rest incremental | Modes table, §3 | owner replay | hypothesis |
| Sweller 1988; Portal commentary | Tutorials hook with curiosity, not extra elements | L1 display rig, L2 wall, L3 target behind | screenshots | hypothesis |
| Norman 2013 | Start states that show the problem | L5 flicker, L7/L9 trap lit, L10 filter on green | screenshots | hypothesis |
| `portal.js` exits from the far center | Merge is fair if seen harmlessly first | L8 off-center beam; L10 merge | analyzer L10 | verified (logic) / hypothesis (noticed?) |

## 6. Cognitive walkthrough (expert, not a substitute for players)

Done per level against the four questions (right goal? action visible?
action linked to goal? feedback readable?). Problems found and handled
before playtesting:

- L6's first spawn showed no beam (M1 face-on). Fixed: M1 starts sending
  the beam across the room; spawn faces A, the rails and the chamber.
- L9's spawn put M4 in the player's face. Moved back.
- L5's partial-composite feedback (above): open, needs observation.
- L9's possible softlock (above): accepted, `R` is instant.

## 7. Playtest protocol (owner, ~30 min)

The owner knows the mechanics but not these puzzles, so this measures
whether the *ideas* land (L5, L6, L8–L10). It cannot measure whether a
first-time player learns the controls (L1–L4).

1. Fresh profile (`Novo jogo`), mouse, sound on. Think aloud; a second
   person (or a phone recording the screen) notes, without helping:
   - time to first meaningful action (first grab that changes a beam);
   - each wrong hypothesis said out loud ("I think the red has to…");
   - repeated failed actions (same mirror, same wrong state ≥ 3 times);
   - restarts (`R`), and the moment of insight if one is voiced.
2. After each level, one line each: *What was this level about?* · *Hard
   because of thinking, or because of controls/seeing?* (1–5) · *Did the
   solution feel fair once found?* (y/n).
3. Stop helping rules: if stuck > 5 min on one level, note the state, then
   give the smallest hint (point at an object, never a solution).
4. Classify each difficulty: productive uncertainty · missing knowledge ·
   misleading presentation · control friction · navigation · accidental
   complexity. Only the last four are fixed by default.

Questions this playtest must answer:
- L5: is the blue flicker read as "half of it" or as "wrong"?
- L6: does the player notice that M2's rail can't reach A, or keep trying?
- L8: is the beam leaving the far portal from its center noticed?
- L9: how long until the "S does both" moment? Does the decoy get used?
- L10: is the merge understood, or found by accident?
- All: are 15°/45° snaps comfortable with the mouse?

## 8. Playtest results (owner, 2026-11-16)

One player who knows the mechanics. Answers to §7's questions:

| Lvl | Observation | Classification | Action |
|---|---|---|---|
| 5 | Flicker read as "something missing"; brought red, solved | productive | none (the feared misread didn't happen) |
| 6 | Noticed A is unreachable; asked what it's for, then accepted once the motivation was explained | productive (borderline) | none, kept as designed |
| 8 | Solved in the intended order, but leaving the open state from inside the strip shut door 1 and the mirror couldn't be aimed through the glass: `R` was the only way out. Off-center beam leaving the portal's center noticed, "a detail" | control friction (softlock) | aiming passes through glass doors/walls |
| 9 | Fast and "intuitive", liked it; M4 (the decoy) read as oversized/ugly next to the spawn | presentation | M4 rail shortened to x ∈ [−0.6, 1] |
| 10 | Merge understood; the portal-center exit "helps" | productive | none |
| all | 45° snaps fine ("doesn't allow too many options", said positively) | — | none |

Fallback if aiming through glass reads as odd: cut a square hole in
L8's glass door (owner's suggestion). Not needed so far.
