CREATE DATABASE IF NOT EXISTS `bookreader_db`;
USE `bookreader_db`;

CREATE TABLE IF NOT EXISTS `user_progress` (
  `book_id` INT PRIMARY KEY,
  `current_page` INT NOT NULL DEFAULT 1,
  `updated_at` DATETIME NOT NULL
);