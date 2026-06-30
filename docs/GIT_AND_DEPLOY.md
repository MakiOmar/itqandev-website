# Git commit, push, and Hostinger deploy

The Qwik app lives in its **own Git repository** (`itqandev-website`), not only inside the meta `itqandev` repo. Hostinger pulls from **that website repo**. Changes under `website/` must be committed and pushed there, or deployment will not see them.

## Repositories

| What | Remote | Local path |
|------|--------|------------|
| Website (Qwik) | `github.com/MakiOmar/itqandev-website` | `credocode/website/` |
| Meta (docs, CI) | `github.com/MakiOmar/itqandev` | `credocode/` |

If you use submodules, the meta repo stores a **pointer** to a specific website commit. After pushing website changes, update the meta repo if you want `git clone --recurse-submodules` to match.

---

## Commit and push (website only)

Open a terminal in the **website** folder:

```bash
cd e:/xampp/htdocs/credocode/website
```

### 1. See what changed

```bash
git status
git diff
```

Do **not** commit build artifacts or local junk:

- `dist/`, `server/`, `node_modules/`
- `dist.zip`, `package.json.bak`, `*.testbackup`

### 2. Stage the files you want

Example — adapter and config only:

```bash
git add package.json
git add adapters/node-server/vite.config.ts
git add src/entry.node-server.tsx
git add vite.config.ts
git add .npmrc
git add docs/GIT_AND_DEPLOY.md
```

Or stage everything except ignored files:

```bash
git add -A
git status
```

Review `git status` before committing.

### 3. Commit

```bash
git commit -m "Add node-server adapter for production SSR builds."
```

Use a short message that explains **why**, not a file list.

### 4. Push to GitHub

```bash
git push origin master
```

If your default branch is `main`, use `git push origin main`.

If push is rejected (remote has new commits):

```bash
git pull --rebase origin master
git push origin master
```

### 5. (Optional) Update the meta repo submodule pointer

Only if you use the meta repo with submodules and want it to reference the new website commit:

```bash
cd e:/xampp/htdocs/credocode
git add website
git commit -m "Bump website submodule for SSR deploy fix."
git push origin master
```

---

## Verify before relying on Hostinger

From `website/`:

```bash
npm ci
npm run build
```

A full build should run **four** steps:

1. `build.types`
2. `build.client`
3. `build.server` ← required for SSR
4. `lint`

You should **not** see `Missing an integration`. After build, a `server/` folder exists and you can run:

```bash
npm run serve
```

---

## Hostinger Node.js app settings

Set environment variables **before** build (`VITE_*` are baked in at build time):

```env
VITE_AUTH_PROVIDER=laravel
VITE_API_BASE_URL=https://api.example.com/api
VITE_API_PROXY_TARGET=https://api.example.com
VITE_SSR_API_BASE_URL=https://api.example.com/api
VITE_PUBLIC_SITE_URL=https://www.example.com
```

| Setting | Value |
|---------|--------|
| Build command | `npm run build` |
| Start command | `npm run serve` |
| Node version | 20.x (18 or 22 also work) |

`npm run serve` runs `node server/entry.node-server` and listens on `process.env.PORT` (set by Hostinger).

If install fails on peer dependencies, `.npmrc` in this repo sets `legacy-peer-deps=true` so `npm ci` matches Hostinger’s fallback behavior.

---

## Quick checklist

- [ ] Changes committed in `website/`, not only on your machine
- [ ] `git push` to `itqandev-website` succeeded
- [ ] `npm run build` locally includes `build.server`
- [ ] `VITE_*` env vars set on Hostinger before build
- [ ] Start command is `npm run serve` (not static-only Apache)

More context: [MULTI_REPO.md](../../docs/MULTI_REPO.md), [CONFIGURATION.md](./CONFIGURATION.md).

---

## Troubleshooting

### `ExecaError` / exit code `3221226356` on Windows during `build.server`

That code is Windows heap corruption (`0xC0000374`). It often happens during **Qwik City SSG** (`Starting Qwik City SSG...`) when `qwik build` runs `build.server` and `lint` in parallel.

This project uses **SSR-only** deploy (`ssg: null` in `adapters/node-server/vite.config.ts`), so pages render at runtime — you do not need SSG for Hostinger.

If it still fails locally:

1. Use **Node 20 LTS** (not 22): `nvm use 20` or switch version in Hostinger.
2. Run steps one at a time:
   ```bash
   npm run build.types
   npm run build.client
   npm run build.server
   npm run lint
   ```
3. Close other heavy apps to free RAM during build.

ESLint **warnings** (not errors) do not fail the build.
