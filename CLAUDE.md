# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Summary

Interactive family-tree visualizer. Vite + React 19 + TypeScript SPA. Renders a focused-person-centric kinship graph using D3 (for zoom/pan only — layout is custom) inside an SVG canvas. i18n between English and Traditional Chinese (`zh-TW`). No backend — data is loaded from uploaded JSON or a bundled `public/demo-data.json`, then auto-saved to `localStorage`. Deployed to GitHub Pages under the `/family-tree/` base path.

## Commands

```bash
npm run dev            # Vite dev server
npm run build          # tsc -b && vite build (type-check then bundle)
npm run lint           # eslint .
npm test               # vitest (watch mode)
npm run test:run       # vitest run (single pass)
npm run test:coverage  # vitest run --coverage
```

Run a single test file: `npx vitest run tests/engine/relationships.test.ts`
Run a single test by name: `npx vitest run -t "aunt via maternal uncle's wife"`

Vite `base` is `/family-tree/` — dev server URLs and in-code `import.meta.env.BASE_URL` reflect this. When fetching bundled data files (e.g. `demo-data.json`), always prefix with `import.meta.env.BASE_URL`, not a bare `/`.

## Architecture

Three layers; the boundary is deliberate. Do not import React types into `src/engine/**` — the engine is pure TS so it is trivially unit-testable from `tests/engine/`.

### 1. Pure engine (`src/engine/`)
Framework-agnostic computations over `Person[]`. Every React render recomputes these from scratch — they must stay cheap (current scale is small household trees, ~hundreds of persons).

- `kinship.ts` — 0-1 BFS from the focused person. Spouse edges cost 0, blood edges (parent/child/sibling) cost 1. Returns `Map<personId, degree>`. This degree is what drives the **degree filter** in the UI.
- `layout.ts` — `computeLayout(persons, focusedId, degrees, maxDegree, hiddenIds)` → `LayoutNode[]`. Drops anyone in `hiddenIds` outright, keeps only `degree ≤ maxDegree` (tree ends cleanly at the boundary — no dashed placeholder layer), BFS-assigns a generation number (spouse = same gen, parent = gen−1, child = gen+1), then orders within each generation by sibling-group + birthOrder with spouses kept adjacent, then shifts x so the focused person lands at `x=0`. Node geometry constants (`NODE_WIDTH=160`, `GENERATION_HEIGHT`, `SPOUSE_GAP`) live here.
- `hiddenReachability.ts` — `computeHiddenIds(persons, focusedId, hiddenToggles)` does a walled BFS from focused: a person in `hiddenToggles` (other than focused) is visited but their neighbors are not traversed, so anyone reachable only through them ends up in the returned hidden set. `computeArticulationPoints(...)` (iterative Tarjan DFS on the same edge set) returns the cut vertices — the UI uses it to decide whether a hide-branch button on a given card would actually prune anyone.
- `relationships.ts` — `getRelationshipLabel(focusedId, targetId, persons)` returns bilingual labels (`{en, zhTW}`) using a BFS path of edge tokens (`father|mother|spouse|child|sibling`) plus a gender/elder resolver. Handles up to 3-edge paths: grandparents, grandchildren, in-laws, uncles/aunts, cousins (堂/表 distinction), nephew/niece, 妯娌/連襟, great-grandparents, great-grandchildren. Extending kinship terms means adding a new `edges.length === N` case here — do NOT add a separate table elsewhere.
- `validation.ts` — `validateFamilyData(jsonString)` → `ValidationResult`. Returns `errors` (blocking: bad JSON, missing required fields, duplicate ids, circular parent chains) and `warnings` (non-blocking: broken references, non-mutual spouse links, duplicate birthOrder among siblings). `normalizePerson` coerces raw JSON to the `Person` shape — all string fields default to `""`, numeric fields to `0`.

### 2. State (`src/context/FamilyTreeContext.tsx`)
Single `useReducer` store for the whole app. Actions: `LOAD_DATA | SET_FOCUSED | SET_SELECTED | SET_DEGREE | ADD_PERSON | UPDATE_PERSON | DELETE_PERSON | SET_VIEW | REPLACE_ALL | TOGGLE_PERSON_HIDDEN`. `view: "landing" | "tree"` is the top-level router — `App.tsx` branches on it. Auto-save writes `persons`, `focusedPersonId`, `degreeFilter`, `hiddenPersonIds` to `localStorage` under key `family-tree-data` every 30s (skips when `persons.length === 0`).

`selectedPersonId` is **ephemeral** per-session UI state that drives the `InfoPanel` inspection target, separate from `focusedPersonId` (which drives the tree layout). It is not persisted; `LOAD_DATA` seeds it from `focusedPersonId`. Single-click on a node dispatches `SET_SELECTED`; double-click dispatches `SET_FOCUSED` (which also resets `selectedPersonId = newFocused`).

`hiddenPersonIds: string[]` is the set of persons whose subtree the user has collapsed via the per-node hide button. `TOGGLE_PERSON_HIDDEN { id }` flips membership. Articulation semantics are resolved at render time by `computeHiddenIds` — see the engine section. The collapsed anchor itself stays visible.

`DELETE_PERSON` scrubs dangling `father`/`mother`/`spouse`/`siblings` references AND removes the id from `hiddenPersonIds` in the same action — never delete a person without running this cleanup.

### 3. UI (`src/components/`)
- `App.tsx` — routes between `LandingPage` and `TreeView` by `state.view`.
- `LandingPage.tsx` — demo-load + upload + restore-session flow.
- `TreeView.tsx` → `TreeCanvas.tsx` — the canvas is the only place `computeKinshipDegrees`, `computeHiddenIds`, `computeArticulationPoints`, and `computeLayout` are called in the UI path. All four are wrapped in `useMemo` — don't add new UI consumers that recompute these independently. Dispatches three handlers: `handleSelect` → `SET_SELECTED` (single click), `handleFocus` → `SET_FOCUSED` (double click), `handleToggleHidden` → `TOGGLE_PERSON_HIDDEN` (hide-branch button click). Passes `isSelected` derived from `node.id === selectedPersonId` to each `PersonNode`; also computes per-node `canHide` (non-focused AND either already-hidden OR an articulation point) and `isHidden`.
- `ConnectionLines.tsx` — SVG connectors. Spouse bars use a dedup rule (`person.id < person.spouse`). Parent→child lines are drawn with the **couple hub pattern**: one trunk from the couple midpoint down to a branch Y, one horizontal branch bar spanning all children, and per-child drops. Key by `fatherId|motherId` (sorted) so single-parent groups share a hub with their full-couple counterpart only when the ids match. Uses a per-couple palette (`COUPLE_PALETTE`, 4 colors cycled by sorted-index-in-generation) so adjacent couples render in distinct colors, and staggers the branch Y by `SIBLING_STAGGER = 8` px per couple within a generation to disambiguate overlapping sibling bars.
- `PersonNode.tsx` — styles per `NodeType` (`focused | blood | spouse`). A selection ring is rendered when `isSelected && nodeType !== "focused"` (the focused node already has its own distinctive style). When `canHide` is true, a small eye/eye-off button renders at the top-right of the card; its click stops propagation, dispatches `TOGGLE_PERSON_HIDDEN`, and flips icon state based on `isHidden`. The button is keyboard-activatable (Enter/Space) and labeled via `<title>` using the `tree.hideBranch` / `tree.showBranch` i18n keys.
- `useD3Zoom.ts` — attaches a `d3-zoom` behavior with `scaleExtent([0.2, 3])` to the SVG and transforms the `g.zoom-group`. `fitToView` does a 500ms transition to center layout nodes with 80px padding. D3 is **only** used for zoom/pan/transition — layout is hand-rolled in `engine/layout.ts`.

### Data model (`src/types/person.ts`)
```ts
Person { id, name, gender?, father, mother, spouse, birthOrder, birthDate, photo }
```
All parent/spouse fields are **id strings, empty string if unset** (never `null` / `undefined`). `birthDate` is a string with two accepted formats: `""` (unknown), `YYYY` (year only — for ancestors whose exact month/day isn't known), or `YYYYMMDD` (full date). The intermediate `YYYYMM` form is intentionally not supported. Helpers live in `src/engine/birthDate.ts` — `isValidBirthDate`, `birthYearOf` (extracts year as number), `formatBirthDate` (renders as `YYYY/MM/DD` for the full form, year-only as-is). Legacy data using `birthYear` (number) is auto-migrated by `validation.normalizePerson` when `birthDate` is absent — callers do not need to pre-process old JSON files. `gender` is optional and `"male" | "female"`; code that needs a gender should go through `resolveGender` in `relationships.ts`, which chains: explicit field → structural inference (is referenced as someone's father/mother) → spouse symmetry. Leaf persons with no children, no explicit gender, and no gendered spouse resolve to `"unknown"` — consumers must handle that case with gender-neutral labels.

## Conventions

- **Engine purity**: nothing in `src/engine/` may import from `react`, `d3-*`, or `react-i18next`. Labels returned as `{en, zhTW}` pairs; the UI picks one via `i18n.language`.
- **i18n keys**: all user-visible strings go through `t()` and are mirrored in both `src/i18n/en.json` and `src/i18n/zh-TW.json`. The language is persisted in `localStorage` under `family-tree-lang`.
- **Layout geometry**: constants (`NODE_WIDTH`, `NODE_HEIGHT`, `HORIZONTAL_GAP`, `VERTICAL_GAP`, `SPOUSE_GAP`) live in `engine/layout.ts`; `PersonNode.tsx` has its own visual-only `NODE_W`/`NODE_H` (currently 140/72) that are smaller than the layout's 160/100 slot so cards have breathing room inside their slot. If you change one, check the other.
- **Tests**: engine functions have colocated `tests/engine/*.test.ts` with vitest + jsdom setup (`tests/setup.ts` pulls in `@testing-library/jest-dom/vitest`). `relationships.test.ts` is the largest — expand it when adding new kinship terms.
- **TS strictness**: `tsconfig.app.json` sets `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `verbatimModuleSyntax`. Import types with `import type { ... }`.