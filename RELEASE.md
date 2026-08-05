# Seahorse Release 4.2.0.6

| | |
|---|---|
| **Tag** | `v4.2.0.6` |
| **Release date** | 2026-08-05 |
| **Previous tag** | `v4.2.0.5` |
| **Type** | Frontend security upgrade — Phase C **complete**: AngularJS fully removed (patch) |
| **Stack** | Unchanged — Spark **4.2.0** / Scala 2.13.18 / JDK 17 / Python 3.12 |
| **Images** | `seahorse-frontend` changes only; all others identical to 4.2.0.5 |

## Summary
A frontend-only patch over 4.2.0.5 that **completes Phase C**: the **entire AngularJS 1.8.3
runtime is removed** and the application is now a **pure Angular 21** app. This clears the last
and highest-severity dependency advisory (`angular` EOL, **HIGH**) — the frontend `npm audit` is
now **0 vulnerabilities**. The `seahorse-frontend` container image is moved to an **Alpine** nginx
base, taking its OS-package CVEs from **5 CRITICAL + 48 HIGH → 0/0**. No backend, Spark, or API
changes. 127 commits over 4.2.0.5.

## The flip — from ngUpgrade hybrid to pure Angular
Through 4.2.0.5 the frontend ran as an `@angular/upgrade` (ngUpgrade) hybrid: Angular hosted the
legacy `ds.lab` AngularJS app. This release removes AngularJS entirely.

- **Native `$rootScope`** (`core/root-scope.service.ts`) — a framework-agnostic emulator of the
  exact, now ng2-internal, `$rootScope` contract the ~30 migrated services still use (event bus
  `$on`/`$broadcast`/`$emit`, observation `$watch`/`$watchGroup`/`$watchCollection`, the
  `$$listeners` registry, and shared editor state). Provided under the `'$rootScope'` token, so no
  consumer changed.
- **Angular root** (`core/app-root.component.ts`) bootstrapped in place of `upgrade.bootstrap(ds.lab)`;
  `index.html` is now just `<app-root>`. The last common-behaviour (`droppable`) was ported to a
  native directive; `angular.copy`/`merge`/`extend` replaced by native helpers (`core/ng-compat.ts`).
- **Change detection** — with AngularJS's digest gone, `RootScopeService` drives Angular CD on a
  60 ms tick via `changeDetectorRef.detectChanges()` on the root view (Angular 21 coalesces
  `ApplicationRef.tick()` and the NgZone scheduler, so the imperative primitive is required).
  `enableProdMode()` is enabled (production bundle).
- **Removal** — uninstalled `angular`, `angular-mocks`, `@angular/upgrade`, `ng-file-upload`; deleted
  **317 dead AngularJS source files** (`.module.js` / controllers / directives / `.html` templates /
  specs). Frontend `npm audit`: **223 (project start) → 0**.

## Production project structure
The migration-staging `app/ng2/` folder is removed; the Angular application now **is** `client/app/`:

```
client/app/
  bootstrap.ts  app-routes.ts              entry + routes
  core/      root-scope emulator, http, providers, app-root, resolver, compat
  api/       REST clients
  services/  @Injectable services
  directives/  components/  modals/        directives, view components, CDK dialogs
  common/    framework-agnostic deepsense graph-model + node-parameters libraries
```

## Container image — Alpine nginx
- Base `nginx:1.31.3` (Debian) -> **`nginx:1.31.3-alpine`** + `apk upgrade`. Alpine drops the
  perl / ncurses / util-linux packages (irrelevant to serving static files, many with no Debian
  fix). Trivy CRITICAL/HIGH: **5 + 48 -> 0 + 0**. `run.sh` is pure POSIX `sh` (no `envsubst`), so it
  runs unchanged on busybox; deploy-time `docker-config.js` rendering verified.

## UI polish
- Full-screen **centered** loading spinner (was a bottom-right cog cluster).
- Home and editor logos are now **pixel-identical** (top-left, 140x25); the editor header logo rail
  trimmed 270 -> 200 px so the status bar reclaims the space.
- Brand text corrected to **6D Analytical Engine**.

## Verification
Every change was built (webpack + `tsc --noEmit`) and **deploy-after-test** verified on a local
image via headless Chrome before promotion (live held on the last-good image until each build was
green): home workflow list, editor jsPlumb canvas (nodes + connectors + endpoints), CDK modals,
autosave, and document-title sync — **0 console errors**. Docker image re-scanned with Trivy
(**0 CRITICAL / 0 HIGH**). No images are pushed to any registry (git + local builds only).
