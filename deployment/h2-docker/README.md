# seahorse-h2

The **H2 database** image for Seahorse / the 6D Analytical Engine. It runs an
[H2](https://www.h2database.com/) database as a standalone **TCP server**; the Play/Scala backend
services connect to it over JDBC. In `docker-compose.yml` this is the **`database`** service.

## What it serves

One H2 TCP server (port **1521**) hosts a file database per backend service, all under the
`/opt/h2-data` base directory (mounted from `seahorse-deploy/h2-data`):

| Database | Service | JDBC URL (from the service container) |
|---|---|---|
| `uaa` | authorization | `jdbc:h2:tcp://database:1521/uaa;DATABASE_TO_UPPER=false;DB_CLOSE_DELAY=-1` |
| `datasourcemanager` | datasourcemanager | `jdbc:h2:tcp://database:1521/datasourcemanager;…` |
| `workflowmanager` | workflowmanager | `jdbc:h2:tcp://database:1521/workflowmanager;…` |
| `schedulingmanager` | schedulingmanager | `jdbc:h2:tcp://database:1521/schedulingmanager;…` |
| `sessionmanager` | sessionmanager | `jdbc:h2:tcp://…:1521/sessionmanager;…` |

Each database is a `*.mv.db` (H2 MVStore) file in the mounted data directory.

## Image

| | |
|---|---|
| **Base** | `eclipse-temurin:17-jre-alpine` (maintained JRE 17 on current Alpine) + `apk upgrade` |
| **H2 version** | `1.4.192` (vendored `h2-1.4.192.jar`) |
| **Entrypoint** | `org.h2.tools.Server -tcp -tcpAllowOthers -tcpPort 1521 -baseDir /opt/h2-data` |
| **Port** | `1521` (H2 TCP) |
| **Data** | `/opt/h2-data` — mount a host volume here (`seahorse-deploy/h2-data`) |

The H2 jar is vendored into the build context and `COPY`ed in (the build does not download it).

## Build

```bash
# from deployment/h2-docker/
docker build -t seahorse-h2:<tag> .

# run standalone (data in a named volume)
docker run -d -p 1521:1521 -v h2data:/opt/h2-data seahorse-h2:<tag>
```

`docker-compose.yml`'s `database` service pins `image: seahorse-h2:<git-sha>`; update that reference
after building a new tag.

## Security

- **Base image** — modernized from the abandoned `anapsix/alpine-java:jre8` (a 2016-era Alpine 3.4
  carrying **14 CRITICAL + 36 HIGH** OS CVEs) to `eclipse-temurin:17-jre-alpine`, taking the OS
  package CVEs to **0 CRITICAL / 0 HIGH**. Scan with Trivy:

  ```bash
  docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
    aquasec/trivy:latest image --severity CRITICAL,HIGH seahorse-h2:<tag>
  ```

- **H2 1.4.192 is kept on purpose.** Its MVStore on-disk format and TCP wire protocol must match the
  backend services' bundled `h2-1.4.191` JDBC client and the existing `h2-data` files, so the jar is
  unchanged (no data migration). H2 1.4.192 runs on JDK 17 (verified: TCP server + a full
  CREATE/INSERT/SELECT round-trip).

- **Two H2-jar criticals remain** — `CVE-2021-42392` and `CVE-2022-23221` — and are fixable only in
  **H2 2.x**. Upgrading is a breaking change: it would require migrating every service's JDBC driver
  and every `.mv.db` file — a coordinated backend-wide effort, not an image change. They are also
  **not reachable in this deployment**: the server runs `-tcp` only (no `-web` H2 Console, which is
  the JNDI/RCE vector), and every JDBC URL is fixed in `docker-compose.yml` (no attacker-controlled
  URL or `INIT`). Keep port 1521 on the internal Docker network only (do not publish it to the host).

## Data / backups

The databases live in the mounted `/opt/h2-data` directory. Back it up before changing the image or
the H2 version:

```bash
cp -r seahorse-deploy/h2-data seahorse-deploy/h2-data.bak-$(date +%Y%m%d)
```
