# T80 — Frontend dependency security upgrade

**Branch:** `feature/frontend-security-upgrade` (on top of `feature/spark4-support`)
**Status:** plan (no code changes yet)
**Owner area:** `frontend/package.json`, `frontend/package-lock.json`, `frontend/config/**`, `frontend/client/**`

## 1. Why

The frontend is a 2016-era **AngularJS 1.5.7** single-page app built with **webpack 2.7 /
babel 6 / eslint 3 / PhantomJS**. Every layer is end-of-life. A fresh `npm audit` on the
committed `package-lock.json` (Node 22 / npm 10) reports:

```
223 vulnerabilities  (10 low · 58 moderate · 74 high · 81 critical)
41 vulnerable DIRECT dependencies
```

The vulnerabilities split into two very different risk classes, and the plan treats them
separately because their blast radius differs:

- **Runtime libraries** — code that is bundled and shipped to the user's browser. These are
  the real, externally-reachable attack surface (XSS, prototype pollution, ReDoS):
  `angular`, `angular-sanitize`, `angular-ui-router`, `jquery`, `lodash`, `moment`,
  `bootstrap`, `sockjs-client`, `jsen`, `ace-webapp`, `d3`/`nvd3`.
- **Build toolchain** — webpack, babel, the `*-loader`s, karma, phantomjs, eslint,
  html-webpack-plugin. These produce most of the *critical* count, but they never reach a
  browser; their risk is supply-chain / developer-machine, not end-user. They still matter
  (and block maintainability), but they are second priority.

> **Standing caveat — AngularJS is permanently EOL** (last release 1.8.3, support ended
> Jan 2022). No amount of dependency bumping makes AngularJS itself "supported" again;
> 1.8.3 is simply the last version with the known XSS fixes. A true fix is a framework
> migration (Phase C), which is a separate multi-month initiative and is explicitly **out
> of scope** for this security-patch task.

## 2. Strategy — three phases, security-first

Do the **runtime** hardening first (Phase A): highest security ROI, bounded risk, ships the
CVE fixes to users fastest. Then the **toolchain** (Phase B). Framework migration (Phase C)
is flagged only.

### Phase A — Runtime library hardening (keep AngularJS 1.x)

Bump only the browser-shipped libraries to their safe versions. Stay within the current
major where a major jump would force an app rewrite (Bootstrap, AngularJS), so risk stays
bounded and each bump is independently testable.

| Package | Current | Target | Fixes / rationale | Risk |
|---|---|---|---|---|
| `angular` (+ `-cookies`,`-sanitize`,`-mocks`; keep all in lockstep) | 1.5.7 | **1.8.3** | Last AngularJS release; fixes multiple `$sce`/`ngSanitize` XSS & prototype-pollution CVEs | Med — 1.6/1.7/1.8 behavior changes (`$http` promise `.success` removed in 1.6, `$onInit`, `preAssignBindingsEnabled`, comprehension XSS) |
| `angular-ui-router` | 0.2.18 | **0.2.20** (last 0.2.x) | Patch-level; avoids the disruptive 0.2→1.0 rewrite | Low |
| `jquery` | 2.1.4 | **3.7.1** | 2.x is EOL; fixes CVE-2020-11022 / -11023 (`.html()`/`.append()` XSS) and older CVE-2019-11358 prototype pollution | Med — jQuery 3 removed `.andSelf()`, changed `.width()`/`:visible`, deprecated events; touch DOM-heavy directives |
| `lodash` | 4.5.0 | **4.17.21** | Same major; fixes CVE-2019-10744 / -2020-8203 prototype pollution, ReDoS | Low |
| `moment` | 2.11.2 | **2.30.1** | Fixes ReDoS (CVE-2016-4055) & path traversal (CVE-2022-24785 / -31129) | Low — API stable (plan a later swap to `day.js`; moment is maintenance-only) |
| `bootstrap` | 3.3.4 | **3.4.1** | Stays on v3 (keeps `angular-ui-bootstrap` compat); fixes XSS CVE-2018-14041/-14042/-20676 | Low |
| `sockjs-client` | 1.0.3 | **1.6.1** | Fixes ReDoS / URL-parsing CVEs | Low |
| `angular-sanitize` | (with angular) | **1.8.3** | Must match the `angular` version exactly | Med (see angular) |
| `jsen` | 0.6.1 | **replace → `ajv`** | Unmaintained, NO upstream fix; used for JSON-schema validation of operation params | Med — API differs; wrap behind a small adapter |
| `ace-webapp` | 0.2.0 | **replace → `ace-builds`** | Unmaintained wrapper, NO fix; it's the notebook/code editor | Med |
| `d3` / `nvd3` | 3.5.16 / 1.8.2 | evaluate | v3→v7 is a full API rewrite; keep unless a concrete CVE forces it — used by report charts | Defer |

**Exit criterion for Phase A:** `npm audit --omit=dev` reports **0 critical / 0 high**.

### Phase B — Build toolchain modernization (supply-chain)

Doesn't ship to browsers, but clears ~150 of the critical/high advisories and unblocks all
future maintenance. The T77 webpack-1→2 migration is the stepping stone for this.

| Package | Current | Target | Notes |
|---|---|---|---|
| `webpack` | 2.7 | **5.x** | Config rewrite (`module.rules`, asset modules replace `file/url-loader`, `mini-css-extract-plugin` replaces `extract-text-webpack-plugin`); removes the `yargs-parser`/`webpack` criticals |
| `babel` `-core`/`-loader`/presets | 6 | **@babel 7** (`@babel/core`, `@babel/preset-env`, `babel-loader@9`) | `babel-preset-angular` has NO fix → replace with `babel-plugin-angularjs-annotate` + `@babel/preset-env` |
| `eslint` (+ `eslint-plugin-angular`) | 3 | **8/9 flat config** | `eslint-config-angular`/`eslint-plugin-angular` are stale → migrate to a maintained ruleset |
| `html-webpack-plugin` | 1 | **5** | webpack-5 compatible |
| css/style/file/url/less/postcss loaders | 0.x | current majors | asset modules subsume file/url-loader |
| **PhantomJS** + `karma-phantomjs-launcher` | 1.9 | **drop** → headless Chrome (`karma-chrome-launcher`) or migrate tests to Vitest/Jest | PhantomJS is abandoned |
| `karma` | 1.3 | **6.4** | with webpack-5 preprocessor |

**Exit criterion for Phase B:** `npm audit` (full, incl. dev) reports **0 critical / 0 high**;
`npm run dist` and `npm test` green on Node 22.

### Phase C — Framework migration (flagged, out of scope here)

AngularJS never receives another security fix. The durable fix is migrating off it to
**Angular (v18+)** or **React**. This is a large, separate initiative — custom directives,
the `jsPlumb` graph editor, the `deepsense-components` library, and ~hundreds of templates.
Recommended approach when it is scheduled: strangler-fig (hybrid `ngUpgrade` or route-by-route
re-implementation), tracked as its own epic. **Not attempted in T80.**

## 3. Execution guardrails

1. **One cluster per commit.** Each table row (or tightly-coupled group like the four
   `angular-*` packages) is its own commit: bump in `package.json`, regenerate
   `package-lock.json`, `npm run dist`, `npm test`, manual smoke, then commit.
2. **Regenerate the lockfile** (`npm install`), pin exact versions, commit the lockfile.
3. **Verify the bundle, not just the audit.** After each cluster: `docker build` the
   `seahorse-frontend` image, bring up the live 4.2.0.x stack, and exercise the editor
   end-to-end — drag/connect nodes, run a workflow (STOMP websocket progress), open a
   Python/R notebook (`.ipynb` route), toPandas cell, report charts (d3/nvd3), file upload
   (`ng-file-upload`). AngularJS breakages are runtime, not build-time — the audit and the
   webpack build will both pass while the UI is silently broken, so the live smoke is
   mandatory.
4. **Track residual audit** after each phase; record the count in this doc.
5. **No `npm audit fix --force`** blindly — it pulls webpack 5 / bootstrap 5 majors that
   break the build and the UI. Every bump is deliberate and tested.

## 4. Success metrics

| Milestone | Target |
|---|---|
| After Phase A | `npm audit --omit=dev`: 0 critical, 0 high (runtime clean) |
| After Phase B | `npm audit` (full): 0 critical, 0 high; `npm run dist` + `npm test` green |
| Bundle | `seahorse-frontend` image builds from source; live editor smoke passes |
| Phase C | (separate epic) off AngularJS |

## 5. Rough effort

| Phase | Engineer-days (approx) |
|---|---|
| A — Runtime hardening (incl. jsen/ace replacements) | 8–12 |
| B — Toolchain (webpack 5 / babel 7 / eslint 9 / drop PhantomJS) | 10–15 |
| C — Framework migration | separate epic (multi-month) |

Dominant risks: the **jQuery 2→3** and **AngularJS 1.5→1.8** behavior changes in Phase A,
and the **webpack 2→5 + babel 6→7** config rewrite in Phase B. Both are de-risked by the
one-cluster-per-commit cadence and the mandatory live-editor smoke.
