CREATE TABLE IF NOT EXISTS WORKFLOWS(
    "id" UUID,
    "workflow" VARCHAR,
    "deleted" BOOLEAN,
    "created" BIGINT,
    "updated" BIGINT,
    "owner_id" VARCHAR,
    "owner_name" VARCHAR,
    PRIMARY KEY ("id"));

CREATE TABLE IF NOT EXISTS NOTEBOOKS(
    "workflow_id" UUID,
    "node_id" UUID,
    "notebook" VARCHAR,
    PRIMARY KEY ("workflow_id", "node_id"));

CREATE TABLE IF NOT EXISTS WORKFLOW_STATES(
    "workflow_id" UUID,
    "node_id" UUID,
    "update_time" BIGINT,
    "results" VARCHAR,
    "reports" VARCHAR,
    PRIMARY KEY ("workflow_id", "node_id")
);
