CREATE TABLE IF NOT EXISTS `WORKFLOWS` (
  `id` CHAR(36) NOT NULL,
  `workflow` LONGTEXT,
  `deleted` BOOLEAN,
  `created` BIGINT,
  `updated` BIGINT,
  `owner_id` VARCHAR(255),
  `owner_name` VARCHAR(255),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `NOTEBOOKS` (
  `workflow_id` CHAR(36) NOT NULL,
  `node_id` CHAR(36) NOT NULL,
  `notebook` LONGTEXT,
  PRIMARY KEY (`workflow_id`, `node_id`)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS `WORKFLOW_STATES` (
  `workflow_id` CHAR(36) NOT NULL,
  `node_id` CHAR(36) NOT NULL,
  `update_time` BIGINT,
  `results` LONGTEXT,
  `reports` LONGTEXT,
  PRIMARY KEY (`workflow_id`, `node_id`)
) ENGINE=InnoDB;
