CREATE TABLE `schedulingmanager`.`workflow_schedule` (
  `id` BINARY(16) NOT NULL PRIMARY KEY,
  `cron` VARCHAR(255) NOT NULL,
  `workflow_id` BINARY(16) NOT NULL,
  `email_for_reports` VARCHAR(255) NOT NULL,
  `preset_id` BIGINT NOT NULL
) ENGINE=InnoDB;
