# ──────────────────────────────────────────────────────────────
# seahorse-proxy — the API gateway. Node current LTS on Alpine.
# Modernized from node:6.11-alpine (EOL 2019): the runtime is a plain Node/Express server, so the
# webpack/babel build was dropped — the server is run directly (node app/server/server.js). Combined
# with the dependency overhaul (see package.json), this takes the image to 0 CRITICAL/HIGH.
# ──────────────────────────────────────────────────────────────
FROM node:22-alpine

# Patch any remaining Alpine packages to their latest security releases.
RUN apk --no-cache upgrade

ENV NODE_ENV=production
WORKDIR /opt/docker

# Install production dependencies only, reproducibly from the lockfile, then remove the npm/corepack
# CLIs: the app's own deps are clean (npm audit 0), and the only remaining CVEs are in npm's own
# bundled transitive deps (tar/sigstore/brace-expansion/…). npm is a build-time tool — the container
# runs `node` directly — so deleting it eliminates those from the runtime image entirely.
COPY package*.json ./
RUN npm ci --omit=dev \
 && npm cache clean --force \
 && rm -rf /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack \
           /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack /root/.npm

# App source (no build step — server runs directly). --chown so the non-root `node` user can read it
# (the repo files carry restrictive 640/750 perms with no world-read).
COPY --chown=node:node . .

# Drop root — the base image ships a non-privileged `node` user.
USER node

CMD ["node", "app/server/server.js"]
