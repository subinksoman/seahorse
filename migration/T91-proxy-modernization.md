# T91 — Modernize the proxy image (Node 6 → latest LTS) + fix all vulnerabilities

**Status:** `pending` (assessment complete — implementation NOT started)
**Type:** gateway modernization + security (highest-exposure component)
**Goal:** update `seahorse-proxy` to the latest Node LTS base and remove all fixable vulnerabilities
(`npm audit` → 0, Trivy CRITICAL/HIGH → 0).

## Why this matters most
The proxy is the **front-door API gateway**: it listens on **PORT 9093** (the single port the whole
product is served through) and reverse-proxies + auth-gates every backend — frontend, workflowmanager,
sessionmanager, datasourcemanager, schedulingmanager, library, jupyter, rabbitmq, documentation,
authorization (`ENABLE_AUTHORIZATION: custom`). It is the most exposed component **and** the most
dangerous to break (a regression takes the entire product offline). Treat as high-value, high-risk.

## Assessment (Trivy scan, 2026-08-05)

| Layer | CRITICAL | HIGH | Notes |
|---|---|---|---|
| OS packages (`node:6.11-alpine`) | 0 | 2 | Node 6 is EOL since 2019; ancient Alpine. |
| **npm packages** | **22** | **145** | The bulk. Worst: brace-expansion, minimatch, tar, lodash, qs, form-data, path-to-regexp, tough-cookie, braces, http-proxy-agent — mostly the transitive tree of `request`, `webpack@1`, `passport`. |

There is **no safe partial win** here (unlike the h2 base-image fix): the base is only 2 OS HIGH, so a
base bump alone barely moves the needle and would likely break the build. This is an all-or-nothing
modernization.

### Specific bad dependencies (`proxy/package.json`)
- **`crypto: 0.0.3`** — a placeholder/typosquat of the built-in Node `crypto`. **Remove entirely.**
- **`request: 2.69.0`** — deprecated/EOL; drags in most of the vulnerable transitive tree.
- **`passport-cloudfoundry: rajaraodv/passport-cloudfoundry`** — an unmaintained GitHub dependency.
- **`webpack: ^1.14.0` (+ global `webpack@3.12.0`) / babel 6** — ancient build tooling. The runtime is
  a plain Node server (`node app/server/server.js` in `startDev`); the webpack bundling (`npm start` →
  `dist/bundle.js`) is unnecessary and can be dropped to eliminate the entire build-dep vuln surface.
- `express 4.13.4`, `express-session 1.13.0`, `passport 0.3.2`, `http-proxy 1.13.2`,
  `http-proxy-agent`/`https-proxy-agent 1.0.0`, `lodash 4.13.1`, `moment 2.17.1`, `cookie-parser`,
  `morgan`, `compression`, `serve-favicon` — all 2016-era, superseded by patched releases.

## Task list

1. **Branch + baseline.** Record current Trivy/`npm audit` counts; note the current image sha for rollback.
2. **Base image** — `FROM node:6.11-alpine` → **`node:22-alpine`** (current LTS) + `apk --no-cache upgrade`.
3. **Drop the webpack/babel build** — run the server directly (`CMD ["node","app/server/server.js"]`),
   removing `webpack`, `webpack-node-externals`, `babel-*`, `copy-webpack-plugin`, `json-loader` and the
   global webpack install. (Removes the largest slice of the CVE surface.)
4. **Dependency overhaul** (`package.json` + regenerate lockfile):
   | Current | Action |
   |---|---|
   | `crypto 0.0.3` | **remove** (use Node built-in `crypto`) |
   | `request 2.69.0` | replace with native `fetch` (Node 18+) or `undici`/`axios` |
   | `http-proxy 1.13.2` | `http-proxy@1.18.1` (or migrate to `http-proxy-middleware`) |
   | `http-proxy-agent`/`https-proxy-agent 1.0.0` | latest (7.x) or drop |
   | `passport 0.3.2` | `passport@0.7.x` |
   | `passport-cloudfoundry` (github) | replace with a maintained OAuth2 strategy / custom middleware |
   | `express 4.13.4` | `express@4.21.x` |
   | `express-session 1.13.0` | `express-session@1.18.x` |
   | `lodash 4.13.1` | `lodash@4.17.21` (or drop for native) |
   | `moment 2.17.1` | keep `2.30.1` or replace with `dayjs`/`date-fns` |
   | `cookie-parser`/`compression`/`morgan`/`serve-favicon` | latest patched |
5. **Code migration** — adapt to API changes: Express 4.21 middleware, `passport@0.7` strategy/session
   API, the `request`→`fetch` call sites in `app/server/**` (esp. `auth/oauth2.js`), and any `http-proxy`
   event/option changes. Verify `ENABLE_AUTHORIZATION: custom` + `WM_AUTH_USER/PASS` basic-auth still work.
6. **Rebuild + verify clean** — `npm audit` → 0, rebuild the image, Trivy CRITICAL/HIGH → 0/0.
7. **End-to-end test** (this is the gateway — test every route): frontend loads, `/v1/workflows`,
   sessions, datasources, schedules, jupyter, library, documentation, auth login/logout — all through
   `:9093`, 0 errors. Use the deploy-after-test discipline (hold live on the last-good image until green).
8. **Promote + tag**; update `seahorse-deploy/docker-compose.yml` image ref; remove old proxy images.

## Rollback
Keep the current `seahorse-proxy:<sha>` image; revert the compose image ref to roll back in one step.
The proxy is stateless (no volumes), so rollback is clean.

## Effort / risk
Large. It rewrites the gateway's dependency + build stack and touches auth + routing code. Highest
blast radius in the stack (front door), so budget a thorough end-to-end pass per backend route.
Recommended as its own focused, browser-verified run.
