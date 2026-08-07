# Pathways.io — Workflow Diagramming & Test Suite Management

A workflow diagram designer with an integrated test management dashboard: role-based access, node templates and custom types, global formatting and themes, per-step execution mapping with in-diagram popups, bug tracking pinned to the diagram, plan runs with downloadable execution summary reports, and multi-format exports.

## Run in development

```bash
npm install
npm run dev        # opens on http://localhost:5173
```

## Build for production

```bash
npm run build      # produces a single self-contained dist/index.html
```

## Deployment

Pushing to `main` triggers the GitHub Actions workflow in `.github/workflows/deploy.yml`, which builds the app and publishes it to GitHub Pages. To serve it on a custom domain, add a `CNAME` file under `public/` containing the domain (e.g. `pathways.example.com`) and point DNS at GitHub Pages.

## Access & roles (prototype)

The landing page gates the app behind sign-in or an access request (routed to admin@colecarter.io). Roles: **Administrator** (full control, account management), **User** (edit rights on projects they own or were shared with editor permissions), **Viewer** (read-only; also reachable without sign-in through view-only share links scoped to selected suites). Authentication is currently simulated client-side; real enforcement arrives with the Phase 2 backend.

## Stack

- React 18 + Vite (single-file production build via `vite-plugin-singlefile`)
- @xyflow/react (React Flow 12) for the diagram canvas
- Zustand for state
- dagre for auto-layout; jsPDF & XLSX for exports

## Project structure

```
src/
  App.jsx                 shell, landing/launcher, profile & admin panels
  store.js                Zustand store: diagrams, suites, cases, plans, bugs, auth, themes
  components/             canvas, nodes, edges, test dashboard, runner, bugs, landing
  utils/                  theme system, exporters, diagram export
public/favicon.svg        Pathways.io icon
```
