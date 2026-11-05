# Level design research (campaign redesign, 2026-11-05)

What was read for the ten-level redesign, what each source actually
supports, and which design decision it changed. Kept short on purpose:
only sources that changed something are listed. Decisions themselves are
in `design/campaign.md` and `docs/decisions/0009`.

**Evidence labels:** *empirical* = measured with people or data;
*analysis* = systematic study of existing games; *practice* = developer
or designer heuristic; *own* = this project's reasoning or measurement.
"Verified" means the claim was checked against the source (or a
reliable abstract of it) during this session.

| Source | Claim used | Evidence | Status | Changed |
|---|---|---|---|---|
| Linehan, Bellord, Kirman, Morford, Roche (2014). *Learning curves: analysing pace and challenge in four successful puzzle games.* CHI PLAY '14, 181–190. doi:10.1145/2658537.2658695 · https://hdl.handle.net/10468/3461 | In Portal, Portal 2 co-op, Braid and Lemmings, each main skill is introduced on its own, in a puzzle needing few other actions (a "trough"), then practised and combined, with complexity rising until the next new skill. | analysis (play-through videos, action counts) | verified (full text) | New-rule levels are kept easy: L7 (filter + trap) is two moves, L8 one mirror; complexity peaks at L6, L9, L10. Rules out a monotonic ramp. |
| Knoblich, Ohlsson, Haider, Rhenius (1999). *Constraint relaxation and chunk decomposition in insight problem solving.* JEP:LMC 25(6), 1534–1555 · https://www.kognition.uni-koeln.de/literature/Knoblich_etal_1999.pdf | Insight arises when an implicit constraint is relaxed; narrow-scope constraints relax more easily; relaxation follows impasse and isn't deliberate. Tested on matchstick arithmetic. | empirical (lab) | verified (abstract + summaries) | The three insight levels (L8, L9, L10) each target one narrow assumption ("a mirror must reflect", "one mirror, one job", "beams merge only where they meet") and each lets the player reach an impasse first (L9's M2 near-miss). Matchsticks ≠ 3D puzzles: used as a design lens, not as proof. |
| Metcalfe & Wiebe (1987). *Intuition in insight and noninsight problem solving.* Memory & Cognition 15(3), 238–246 | Insight problems show sudden solution; multi-step problems show gradually rising "warmth". Later work (Hedne et al. 2016; Laukkonen & Tangen 2018) questions how cleanly warmth separates the two. | empirical (lab), contested | partially verified (abstract + later reviews) | Owner's H3: not every level should be an "aha". Each level now has a dominant problem-solving mode; most are incremental (planning, prediction, elimination). |
| Sweller (1988). *Cognitive load during problem solving.* Cognitive Science 12(2), 257–285. doi:10.1207/s15516709cog1202_4 | Novices have limited working memory; many interacting new elements overload them. | empirical | not re-fetched (standard reference) | L1–L3 get "hooks" (curiosity, a near miss, a target behind the player), not extra elements. One new rule per tutorial level. |
| Norman (2013). *The Design of Everyday Things*, rev. ed. Basic Books | Signifiers show where to act; feedback must be immediate and informative. | practice | not re-fetched | L2's rail runs along the beam so sliding gives continuous feedback; L5/L7/L9 start in a state that already shows the problem (flicker, lit trap). |
| Valve, Portal developer commentary; Swift & Wolpaw GDC 2008 postmortem · https://theportalwiki.com/wiki/Portal_developer_commentary · https://www.gamedeveloper.com/pc/best-of-gdc-the-secrets-of-i-portal-i-s-huge-success | Weekly playtests from the first week; players grasped portals faster after seeing themselves through one; distracting objects were removed from training rooms; extra chambers were added where players struggled. | practice (secondary sources: wiki transcript, press) | verified (secondary) | Clean early rooms; a harmless first exposure before each twist (L3 edge-on, L8 off-center portal); playtest protocol below. |
| Blow, talks and interviews on *The Witness* / *Braid* (IndieCade 2011; GDC "Truth in Game Design"); Game Maker's Toolkit, "How Jonathan Blow Designs a Puzzle" | Puzzles should express a real property of the system; showing why something fails is part of the lesson. | practice (mostly secondary) | partially verified (secondary) | Near misses are designed, not accidental: L6 and L9 land the beam visibly *beside* the receiver to show which rail can't reach. |
| Wharton, Rieman, Lewis, Polson (1994). *The cognitive walkthrough method: a practitioner's guide.* In Nielsen & Mack, *Usability Inspection Methods*, 105–140 | Expert inspection of learnability by stepping through each action and asking whether the user will form the right goal, notice the action, link it to the goal, and read the feedback. | practice (method) | verified (citation; exact question wording not checked) | Used as the substitute for naive playtesters (`design/campaign.md`, walkthrough). Known limit: experts miss many real problems. |
| The Level Design Book (online) · https://book.leveldesignbook.com | Spatial composition, sightlines, layout. "Teach → test → twist" is a common industry phrase; no primary source was found for it. | practice | partially verified | Spawn views were chosen so the goal and mechanism are visible in the first frame (screenshots, `design/campaign.md`). Teach-test-twist is treated as folklore. |
| Lynch (1960). *The Image of the City* | Paths, edges, landmarks, districts. | theory | not re-fetched | Low relevance for single 10×10 m rooms; used only for L10's two readable zones. |

## Own measurements (this session)

- Tracer cost ≈ 1.9 µs per beam (24 segments): exhaustive search at 15°
  on six mirrors ≈ 70 min, at 45° classes ≈ 6 s. That shaped the
  analyzer (`tests/support/analyze-level.js`).
- Edge-on pass-through only works within **±1°** for a target 8 m away,
  and the old campaign needed rotations within 0.3–2.4° (tolerance
  windows, baseline analysis). With a mouse at ~0.57°/px that is
  pixel-precise, against spec §3. Hence snapping.
- With 15° snaps, beams run on a 30° grid and the analyzer found diagonal
  shortcuts in most L6 sketches. With 45° snaps (spec §5's own option)
  routes are right-angled and readable from the floor rails.

## Not done

- No naive playtest. Every claim about comprehension or enjoyment is a
  hypothesis (`design/campaign.md`).
- Iacovides/Linehan mixed-method puzzle-learning study, Schell, Adams &
  Dormans, Fullerton, Fernández-Vara, Menzel: not consulted in this pass.
  No decision depends on them.
