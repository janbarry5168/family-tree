# family-tree

Interactive family-tree visualizer. Focus on any person and the view re-centers around them, showing kin out to a configurable degree with proper Chinese/English kinship labels (堂兄 vs. 表兄, 伯父 vs. 叔叔, 妯娌, 連襟, and so on).

Live demo: https://janbarry5168.github.io/family-tree/

## Features

- Focused-person-centric layout — click any node to re-center the tree around them
- Bilingual kinship labels (English + Traditional Chinese) resolved from structural relationships, gender inference, and birth order
- Degree filter to expand or collapse the visible tree
- Per-person hide-branch toggle that collapses everyone reachable only through that person (in-laws, distant relatives) so you can focus on the part of the tree you care about
- Load your own data via JSON upload, or try the bundled demo
- Auto-save to `localStorage` every 30 seconds; landing page offers to restore on return
- Pan / zoom / fit-to-view (powered by d3-zoom)
- In-app editor panel to add, edit, and delete persons
- No backend — everything runs in the browser

## Data format

Upload a JSON file containing an array of `Person` objects:

```json
[
  { "id": "1", "name": "王大明", "gender": "male",   "father": "",  "mother": "",  "spouse": "2", "birthOrder": 1, "birthYear": 1930, "photo": "" },
  { "id": "2", "name": "林美玉", "gender": "female", "father": "",  "mother": "",  "spouse": "1", "birthOrder": 1, "birthYear": 1932, "photo": "" },
  { "id": "3", "name": "王建國", "gender": "male",   "father": "1", "mother": "2", "spouse": "",  "birthOrder": 1, "birthYear": 1955, "photo": "" }
]
```

| Field        | Type                    | Notes                                                             |
|--------------|-------------------------|-------------------------------------------------------------------|
| `id`         | string, required        | Unique within the file                                            |
| `name`       | string, required        | Display name                                                      |
| `gender`     | `"male" \| "female"`    | Optional — inferred from structure/spouse when absent             |
| `father`     | id string               | Empty string `""` if unknown                                      |
| `mother`     | id string               | Empty string `""` if unknown                                      |
| `spouse`     | id string               | Should be reciprocal; one-way links produce a warning             |
| `birthOrder` | number, required        | Used to order siblings and resolve elder/younger terms            |
| `birthYear`  | number                  | Used as an elder/younger fallback across unrelated families       |
| `photo`      | string (URL / data URI) | Empty string renders the person's initial                         |

Validation rules: duplicate ids, missing required fields, and circular parent chains are blocking errors. Broken references, non-mutual spouse links, and duplicate birth orders within a sibling group are shown as warnings.

See `public/demo-data.json` for a complete example.

## Getting started

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev      # start Vite dev server
```

Open the URL printed by Vite (the dev server is served under the `/family-tree/` base path).

### Scripts

| Command                 | Purpose                                 |
|-------------------------|-----------------------------------------|
| `npm run dev`           | Vite dev server with HMR                |
| `npm run build`         | Type-check (`tsc -b`) and bundle        |
| `npm run preview`       | Preview the production build locally    |
| `npm run lint`          | ESLint on all `.ts` / `.tsx` files      |
| `npm test`              | Vitest in watch mode                    |
| `npm run test:run`      | Vitest single pass (CI-friendly)        |
| `npm run test:coverage` | Vitest with V8 coverage report          |

## Project structure

```
src/
  engine/       Pure TypeScript — kinship, layout, relationship labels, validation
  context/      React reducer store (FamilyTreeContext)
  components/   UI — canvas, nodes, connectors, editor, landing
  hooks/        D3 zoom/pan/fit-to-view
  i18n/         i18next config + en / zh-TW resource files
  types/        Shared TypeScript types
tests/engine/   Vitest unit tests for the engine
public/         Static assets and demo data
```

`src/engine/` is framework-agnostic — it does not import from React, D3, or i18next, which makes it straightforward to unit-test. The UI layer calls the engine from `TreeCanvas.tsx` via `useMemo`.

For architectural details (layout algorithm, kinship BFS, couple-hub connector pattern, state management), see `CLAUDE.md`.

## Tech stack

React 19 · TypeScript · Vite 8 · Tailwind CSS 4 · D3 (zoom/selection/transition only) · i18next · Vitest + Testing Library

## Deployment

Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`. The site is served under `/family-tree/`, which is configured as `base` in `vite.config.ts`; in-code URL construction uses `import.meta.env.BASE_URL` so the app works both in dev and when hosted on Pages.
