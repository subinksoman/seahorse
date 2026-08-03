# T82 — AngularJS → Angular framework migration assessment

**Branch:** `feature/frontend-security-upgrade`
**Status:** assessment (no code changes)
**Prereq context:** T80/T81 upgraded the app to **AngularJS 1.8.3** — the *final* AngularJS
release. There is no higher `angular` (1.x) version; the "next version" is **modern Angular**
(`@angular/core`, latest **v22.1.0**), a different framework. This doc scopes that migration
(the T80 Phase C epic) so a go/no-go and approach can be chosen.

## 1. What we're actually migrating (inventory)

Measured on the current `frontend/client` tree (excludes `node_modules`, `dist`, specs):

| Metric | Count |
|---|---|
| JS source files | **305** (~**20,367** LOC) · 15 spec files |
| HTML templates | **106** |
| LESS stylesheets | **100** |
| `.directive()` | **74** |
| `.component()` | **25** |
| `.controller()` | **32** |
| `.service()` / `.factory()` | **43** / **21** |
| `.filter()` | **33** |
| `ui-router` states | 6 |
| Files touching `$scope` | 38 |
| Files using **jsPlumb** (graph canvas) | 9 |
| Existing TypeScript | **0** |

In-repo AngularJS component library (`client/app/common/deepsense-components/`): 
`deepsense-attributes-panel`, `deepsense-catalogue-panel`, `deepsense-cycle-analyser`,
`deepsense-graph-model`, `deepsense-loading-spinner`, `deepsense-node-parameters`.

Build: **webpack 2.7 + babel 6** (ES6, no TS), not the Angular CLI.

**This is a rewrite of ~250 building blocks and 106 templates, not a dependency bump.**

## 2. Why it's a migration, not an upgrade

AngularJS (1.x) and Angular (2+) share almost nothing at the code level:

| Concern | AngularJS 1.8.3 (now) | Angular 2+ (target) |
|---|---|---|
| Language | ES6/JS | **TypeScript** |
| Unit | directive + `$scope` + controller | `@Component` class + template |
| DI | string tokens, `$inject`/ngAnnotate | typed providers, `@Injectable` |
| Async | `$q`, `$http`, `$scope.$watch` digest | **RxJS** Observables, `HttpClient`, change detection |
| Routing | `ui-router` 0.2.18 | `@angular/router` |
| Templating | `ng-*` directives, `{{ }}` | Angular template syntax `[..]`/`(..)`/`*ngIf` |
| Build | webpack 2 + babel 6 | **Angular CLI** (esbuild/webpack) |
| Forms | `ng-model` | Reactive/Template forms |

## 3. Target Angular version

Recommendation: migrate to an **Angular LTS**, not necessarily the bleeding edge (v22). Trade-off:

- **v22 (latest)** — newest, standalone components, longest runway; but strictest, and some
  migration tooling assumes an intermediate hop.
- **A recent LTS (e.g. v18/v20)** — mature docs, `@angular/upgrade` (ngUpgrade) is well
  supported, more third-party components target it. **Recommended target for a first landing**,
  then bump to latest once parity is reached.

Note: `@angular/upgrade` (hybrid) is supported through recent majors, but the smoothest hybrid
experience is on the LTS lines — pin the target at the start of the project.

## 4. Two strategies

### Option A — Hybrid via `@angular/upgrade` (ngUpgrade), strangler-fig  ✅ recommended
Run AngularJS 1.8.3 and Angular **side-by-side in one app**; migrate leaf-first, one
component/service at a time; downgrade Angular components to use inside AngularJS and upgrade
AngularJS services to inject into Angular, until AngularJS is empty and removed.

- **Pros:** app keeps shipping throughout; incremental, reviewable, reversible per unit; risk
  spread over many small steps.
- **Cons:** two frameworks + two change-detection systems loaded at once (bundle size, some
  digest/zone bridging complexity); the build must serve both (Angular CLI custom builder or a
  webpack hybrid); jsPlumb canvas and `deepsense-graph-model` are awkward to bridge and should
  migrate late/as a unit.

### Option B — Full rewrite in Angular CLI
Stand up a fresh Angular CLI app and re-implement to parity; keep the AngularJS app shipping
until cutover.

- **Pros:** clean idiomatic Angular; no hybrid bridging; drop webpack2/babel6 immediately.
- **Cons:** big-bang cutover risk; long period maintaining two apps; parity gaps surface late.

**Recommendation: Option A (hybrid).** For a 20k-LOC app with a complex canvas and an active
release cadence, incremental migration with continuous shipping beats a big-bang rewrite.

## 5. Hard parts (schedule these deliberately)

1. **jsPlumb graph canvas + `deepsense-graph-model`** (9 files) — imperative DOM/drag/edge
   rendering wired to AngularJS digest. Highest-risk; migrate as one late unit, likely wrapped
   in a single Angular component managing jsPlumb directly (or evaluate a modern graph lib).
2. **`deepsense-*` component library** (6 packages) — attributes panel, node-parameters,
   catalogue — deeply AngularJS. Rewrite as Angular component libs.
3. **STOMP/RabbitMQ live updates** (`ServerCommunication`) — move `$scope`-driven updates to
   RxJS + change detection.
4. **33 filters** — become Angular pipes.
5. **AngularJS-only third-party libs — all need replacement (no Angular build):**

   | Current (AngularJS) | Angular replacement |
   |---|---|
   | `angular-ui-bootstrap` | `@ng-bootstrap/ng-bootstrap` |
   | `angular-ui-router` | `@angular/router` |
   | `angular-toastr` | `ngx-toastr` |
   | `angular-ui-ace` | `ngx-ace` / monaco wrapper |
   | `angular-xeditable` | inline-edit component (custom / library) |
   | `ng-file-upload` | `HttpClient` upload / `ngx-*` uploader |
   | `angucomplete-alt` | Angular Material autocomplete / custom |
   | `ng-switchery` | native styled checkbox / Material |

## 6. Phased plan (Option A)

| Phase | Work | Gate |
|---|---|---|
| 0 | Pin target Angular LTS; stand up hybrid build (Angular CLI custom builder or webpack hybrid) serving both frameworks; bootstrap `UpgradeModule`; migrate ONE leaf component + ONE service as proof | Hybrid boots; proof unit works live |
| 1 | Convert JS→TS incrementally; migrate leaf **filters→pipes** and pure **services** (RxJS/`HttpClient`) | Suite green; app ships |
| 2 | Migrate leaf **components/directives** (status bar, modals, catalogue, attributes panel) bottom-up | Each view smoke-passes |
| 3 | Routing: `ui-router`→`@angular/router` (6 states); replace 3rd-party libs (§5.5) | Nav + views parity |
| 4 | The canvas: jsPlumb + `deepsense-graph-model` as one unit | Editor parity (nodes/edges/drag/STOMP) |
| 5 | Remove `@angular/upgrade` + AngularJS + webpack2/babel6; switch to pure Angular CLI build | AngularJS fully gone; audit clean |

## 7. Effort & risk

- **Rough effort:** **~3–6 engineer-months** for a single engineer familiar with the codebase
  (hybrid). The canvas/graph-model unit (Phase 4) and the `deepsense-*` libraries are the
  dominant cost and risk.
- **Prerequisite:** T80 **Phase B** (webpack 2→5 / babel 6→7 / drop PhantomJS) is a natural
  stepping stone — a modern build makes the hybrid build far easier. Consider doing Phase B
  first.
- **Risks:** two-framework bundle bloat during migration; jsPlumb↔Angular bridging; parity
  drift in the editor; third-party replacements changing UX. All mitigated by leaf-first order,
  per-unit live smokes (the T81 headless-Chrome method), and keeping AngularJS shippable until
  the last phase.

## 8. Recommendation

Do **not** bump `@angular/core` in place (it breaks 100% of the app). Adopt **Option A (hybrid
ngUpgrade)** targeting a recent Angular **LTS**, after (or alongside) T80 **Phase B**. Treat it
as its own multi-month epic with the phase gates above; keep shipping AngularJS 1.8.3 (now
security-patched) until Phase 5 retires it.
