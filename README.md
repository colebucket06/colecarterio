# colecarter.io

Monorepo for the applications hosted on **colecarter.io**. Each application lives under `apps/` and deploys to its own subpath; `site/` is the domain's portal landing page.

| Path | What it is | Deployed at |
|---|---|---|
| `site/` | Domain portal (app launcher tiles) | `/` |
| `apps/pathways/` | **Pathways.io** — workflow diagramming & test suite management | `/pathways/` |

## Deployment

Pushing to `main` runs `.github/workflows/deploy.yml`: it builds every app, assembles the site (`site/` at the root, each app's build in its subpath), and publishes to GitHub Pages. Enable once in **Settings → Pages → Source: GitHub Actions**.

For the custom domain, add a `CNAME` file to `site/` containing the domain and configure DNS per the hosting plan (A records for the apex → GitHub Pages, `www` CNAME → `colebucket06.github.io`).

## Developing an app

```bash
cd apps/pathways
npm install
npm run dev      # http://localhost:5173
npm run build    # single-file production build in dist/
```

See `apps/pathways/README.md` for application details.
