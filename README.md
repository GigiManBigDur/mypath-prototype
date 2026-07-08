# MyPath — Prototype

A client-side prototype of MyPath: an academic and career planning app that takes a
student from "I don't have a plan" to a visual, personalized roadmap — survey →
admissions overview → career/major/program discovery → opportunity finder → academic plan.

This is a click-through prototype to validate the concept, not the production app:
no backend, no database, no accounts, no AI calls. Everything is hardcoded data and
conditional logic, and state lives in React (optionally persisted to `localStorage`).

The **Business**, **STEM**, **Healthcare**, **Creative/Arts**, and **Academic/Humanities**
interest tracks have full career/major/program/opportunity data; selecting multiple built
tracks merges their career options, and every other interest falls back to real (but simpler)
opportunities or, as a last resort, a small set of generic ones instead of a dead end.


## Commands

```bash
npm install
npm run dev      # start dev server (http://localhost:5173)
npm run build    # production build to dist/
npm run preview  # preview the production build locally
npm run lint     # oxlint
```

## Structure

- `src/data/` — all hardcoded content (interests, careers, majors, programs, opportunities, admissions text, trunk steps)
- `src/context/AppContext.jsx` — single source of truth for survey answers and selections across screens, persisted to `localStorage`
- `src/screens/` — one component per screen in the flow (`SurveyScreen` → `AdmissionsOverviewScreen` → `DiscoveryScreen` → `OpportunityFinderScreen` → `AcademicPlanScreen`)
- `src/utils/roadmapGenerator.js` + `roadmapLayout.js` — turns the collected state into a unified, date-positioned spine with isolated diagonal branches for multi-step opportunities, and SVG coordinates
- `src/components/Roadmap.jsx` — the zoomable/pannable spine-and-branch SVG roadmap, adapted from the reference prototype (`~/Downloads/mypath_roadmap_prototype.jsx`)

## Deploying

Neither target auto-deploys on push — both are manual.

```bash
npm run deploy:pages          # GitHub Pages (https://gigimanbigdur.github.io/mypath-prototype/) — reliable fallback
npx vercel deploy --prod --yes  # Vercel (https://mypath-prototype-seven.vercel.app) — currently blocked account-side
```
