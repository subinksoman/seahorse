CREATE TABLE IF NOT EXISTS `PRESETS` (
  `id` BIGINT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `clusterType` VARCHAR(255) NOT NULL,
  `uri` VARCHAR(2048) NOT NULL,
  `userIP` VARCHAR(255) NOT NULL,
  `hadoopUser` VARCHAR(255),
  `isEditable` BOOLEAN DEFAULT TRUE,
  `isDefault` BOOLEAN DEFAULT FALSE,
  `driverMemory` VARCHAR(255),
  `executorMemory` VARCHAR(255),
  `totalExecutorCores` INTEGER,
  `executorCores` INTEGER,
  `numExecutors` INTEGER,
  `params` LONGTEXT,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB;

INSERT INTO `PRESETS`(name, clusterType, uri, userIP, hadoopUser, isEditable, isDefault, driverMemory, executorMemory,
totalExecutorCores, executorCores, numExecutors, params)
VALUES ('default', 'local', 'local[*]', '', NULL, FALSE, TRUE, '1G', '2G', 2, 2, 2, '');
