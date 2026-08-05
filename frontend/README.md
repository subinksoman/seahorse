# Seahorse Frontend (6D Analytical Engine)

The web UI for the 6D Analytical Engine / Seahorse workflow editor.

As of **v4.2.0.6** this is a **pure Angular 21** application. The legacy AngularJS 1.8.3 code and
the `@angular/upgrade` (ngUpgrade) hybrid have been fully removed — `npm audit` is **0
vulnerabilities**. See [../RELEASE.md](../RELEASE.md) for the migration details.

## Prerequisites
- Node.js + npm

## Build & run

```bash
npm install          # install dependencies

npm start            # dev server with live reload (alias: npm run serve)
                     # -> http://localhost:3000, proxies /v1,/library,/jupyter,/docs,/mail,/stomp
                     #    to the backend (see config/webpack/development.js)

npm run dist         # production build (webpack) -> dist/
```

The production bundle is emitted to `dist/`. The build uses webpack 5 + `ts-loader`
(`transpileOnly`); run `npx tsc -p tsconfig.json --noEmit` for a full type check.

## Project structure

The Angular application lives under `client/app/`:

```
client/
  app/
    bootstrap.ts  app-routes.ts       Angular bootstrap (AppModule) + route table
    core/         infrastructure: the native $rootScope emulator, HttpService, providers,
                  the bootstrapped <app-root>, the route resolver, the angular.* compat shim
    api/          REST clients (base + workflows / operations / sessions / library / …)
    services/     @Injectable business services (WorkflowService hub, session, report, …)
    directives/   attribute + canvas directives
    components/    view components (editor canvas, panels, graph-node, home, …)
    modals/       @angular/cdk dialog components + ModalService
    common/       framework-agnostic deepsense libraries (graph-model + node-parameters)
    app.js  libs.js  browser.validator.js   webpack entry + vendor bundle
  css/  less/  assets/                CSS entry (LESS @import chain) + static assets
config/webpack/                       global / development / production webpack config
```

There is no `ng2/` folder anymore — it was migration-staging and its contents are now the app
itself. There are no `.spec.js` unit tests (the AngularJS/karma specs were removed with AngularJS);
add Angular tests under a modern runner if needed.

## Docker image

```bash
# from frontend/ after `npm run dist`
cp -r dist docker/dist
docker build -f docker/Dockerfile -t seahorse-frontend:<tag> docker/
```

The image is **Alpine** nginx (`nginx:1.31.3-alpine` + `apk upgrade`) — 0 CRITICAL/HIGH OS CVEs.
`docker/src/run.sh` renders `docker-config.js` from `docker/src/config.js.tmpl` using the container's
environment (`API_HOST`, `API_PORT`, `SOCKETS_ADDRESS`, `NOTEBOOKS_HOST`, `SESSION_POLLING_INTERVAL`)
at start-up, then launches nginx. Scan with Trivy:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy:latest image --severity CRITICAL,HIGH seahorse-frontend:<tag>
```

## List all licences

```bash
npm install -g license-checker
license-checker --production --csv
```
