# 6D Analytical Engine — Release Notes v4.2.0.7.5

**Patch release on top of [v4.2.0.7.1](RELEASE-NOTES-v4.2.0.7.1.md)** (previous tag `v4.2.0.7.4`)
Format: Markdown · organized per Docker image

> Adds the ability to serve the whole application under a configurable sub-path
> (`CONTEXT_PATH`, e.g. `/ae` or `/seahorse`). The setting is **empty by default**, so an existing
> root-path deployment behaves exactly as before. Images changed in this release are published
> under tag `4.2.0.7.5`.

---

## 1. Overview

The application can now be mounted under a URL prefix so it can live alongside other apps on a
single host — a requirement for embedding it in the 6D portal under one hostname and certificate.

- **Proxy** takes `CONTEXT_PATH` and mounts everything under it, stripping the prefix before
  forwarding so no backend service needs to know about it.
- **Frontend** derives its own mount point at runtime, so one built image serves any prefix with
  nothing to configure and nothing to keep in sync with the proxy.
- **Notebooks** follow the prefix, including the forwarding kernels' calls back into the Jupyter
  REST API.

Backend services (workflowmanager, sessionmanager, datasourcemanager, schedulingmanager,
libraryservice) are **unchanged** — they continue to receive root-relative paths.

---

## 2. Changes per image

### `ae-proxy:4.2.0.7.5`
- **New `CONTEXT_PATH`** (default empty = serve at the root, unchanged behaviour). A single
  middleware strips the prefix from the incoming URL, so routes, `express.static` and the auth
  strategies are unchanged, and re-anchors anything that leaves as a URL:
  - `res.redirect` is wrapped, which also covers passport's internal redirects and the
    stub/sixdee logout paths;
  - a `proxyRes` hook rewrites root-absolute `Location` headers returned by upstreams;
  - cookies are scoped to the mount point (`Path=/<prefix>/`) so a sibling app on the same host
    neither receives them nor bloats the jar sent back; logout also expires them at `/` for
    deployments moving off the root.
- **WebSocket upgrades** are handled separately — `server.on('upgrade')` bypasses the express
  chain — so `/stomp` and the Jupyter kernel channels are routed correctly under a prefix.
- **Jupyter is forwarded with the prefix intact** (`preservePrefix`). Jupyter rewrites every URL in
  its own HTML from `base_url`, so stripping would make it emit links that escape the mount point.
- A bare `/<prefix>` redirects to `/<prefix>/`, preserving the query string, so `index.html`'s
  relative `docker-config.js` resolves inside the context path. Requests outside the prefix return
  404.
- Also in this image (previously unreleased): 6D portal auth mode
  (`ENABLE_AUTHORIZATION: sixdee`, `/embed/session` token handoff), `ALLOWED_DOMAINS`
  embed-only framing with a no-permission page, native TLS termination from `SSL_CERT_DIR`
  (replacing the `FORCE_HTTPS` redirect), a stable `SESSION_SECRET` so sessions survive restarts,
  and the launch page rebranded to Analytical Engine.

### `ae-frontend:4.2.0.7.5`
- **Self-deriving mount point** — the router is hash-based, so `location.pathname` is always the
  path the document was served at. The frontend reads the context path from there instead of being
  configured, and applies it to the API, library, datasource, scheduling, notebook and STOMP URLs.
  **The same image serves `/`, `/ae` or any other prefix with no rebuild and no env var.**
- webpack `output.publicPath` moves from `/` to `auto`, so lazy chunks and assets resolve against
  the script's own URL rather than the server root.
- Identity is read from the `seahorse_user` cookie the proxy sets per request, instead of a
  hardcoded user id, so a real signed-in user reaches the editor.

### `ae-notebooks:4.2.0.7.5`
- **`ServerApp.base_url` is now configurable** via `JUPYTER_BASE_URL` (or derived from
  `CONTEXT_PATH`), defaulting to `/jupyter/` as before.
- **Forwarding-kernel fix** — the PySpark/SparkR kernels call the notebook server's own REST API to
  resolve their session and to restart, and both URLs were pinned to `/jupyter/api/...`. Under a
  context path those calls 404'd, so a kernel could not resolve its session and restart failed with
  `RuntimeError: Restart failed`, leaving it unable to connect. The base is now resolved the same
  way the server config resolves it.

### Unchanged images
`ae-workflowmanager`, `ae-sessionmanager`, `ae-schedulingmanager`, `ae-datasourcemanager`,
`ae-libraryservice`, `ae-spark`, `ae-rabbitmq`, `ae-h2`, `ae-mail` — keep their existing tags.

---

## 3. Configuration

| Service | Variable | Root (default) | Example prefix |
|---|---|---|---|
| proxy | `CONTEXT_PATH` | *(unset)* | `/ae` |
| notebooks | `JUPYTER_BASE_URL` | *(unset →* `/jupyter/`*)* | `/ae/jupyter/` |
| schedulingmanager | `SEAHORSE_EXTERNAL_URL` | `https://<host>:<port>/` | `https://<host>:<port>/ae/` |

`JUPYTER_BASE_URL` **must** match the proxy's `CONTEXT_PATH` — it is the one value that has to be
kept in step, because Jupyter rewrites its own HTML from it. The `docker-compose` generator derives
both from a single `CONTEXT_PATH` environment variable, so they cannot drift.

Changing the prefix afterwards is a configuration change only: edit those three values and recreate
`proxy`, `notebooks` and `schedulingmanager`. No image rebuild, and the frontend needs no change.

---

## 4. Upgrade notes

- No schema or config migrations. Pull the `4.2.0.7.5` images and recreate `proxy`, `frontend` and
  `notebooks`.
- **Leaving `CONTEXT_PATH` unset reproduces the previous behaviour exactly** — verified: identical
  paths, redirects and `Path=/` cookie scoping.
- When a prefix *is* configured, the unprefixed paths stop responding (404) — update any bookmarks
  and the portal's embed URL. Sessions scoped to a previous prefix are not sent to the new one, so
  users are signed out once on the switch.
- `CONTEXT_PATH` is enforced at the proxy only. Any directly published container port still serves
  at the root.
