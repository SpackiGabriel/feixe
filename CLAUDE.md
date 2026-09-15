# Feixe — Computação Gráfica UTFPR (Projeto Final)

3D first-person laser/mirror puzzle game built to satisfy the four required
axes of the Computação Gráfica final project (geometry/transforms,
camera/navigation, lighting/shading/materials/textures, animation). See
`feixe-especificacao.pdf` for the full spec (RF01-RF10, NFRs, level design,
traceability to the course's four axes).

## Technology Stack

- **Engine**: Three.js r186 (WebGLRenderer only — no WebGPU)
- **Language**: JavaScript (ES modules, no build step)
- **Version Control**: Git with trunk-based development
- **Build System**: None — native ES modules loaded directly by the browser
- **Asset Pipeline**: None — geometry is procedural (BufferGeometry), no external 3D model imports

> **Note**: This imported framework's engine-specialist agents (Godot/Unity/Unreal)
> do not cover Three.js. Route code review and implementation to the generic
> `engine-programmer` agent (renderer, scene graph, raycasting) and
> `gameplay-programmer` agent (puzzle/interaction logic, level state machine).

## Project Structure

@.claude/docs/directory-structure.md

## Engine Version Reference

@docs/engine-reference/threejs/VERSION.md

## Technical Preferences

@.claude/docs/technical-preferences.md

## Coordination Rules

@.claude/docs/coordination-rules.md

## Collaboration Protocol

**User-driven collaboration, not autonomous execution.**
Every task follows: **Question -> Options -> Decision -> Draft -> Approval**

- Agents MUST ask "May I write this to [filepath]?" before using Write/Edit tools
- Agents MUST show drafts or summaries before requesting approval
- Multi-file changes require explicit approval for the full changeset
- No commits without user instruction

## Coding Standards

@.claude/docs/coding-standards.md

## Context Management

@.claude/docs/context-management.md
