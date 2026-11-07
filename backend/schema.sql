CREATE DATABASE IF NOT EXISTS mini_wallet CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE mini_wallet;

CREATE TABLE IF NOT EXISTS users (
  id            INT UNSIGNED    NOT NULL AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(30)     NOT NULL,
  email         VARCHAR(255)    NOT NULL,
  phone         VARCHAR(20)     NULL,
  password_hash VARCHAR(255)    NOT NULL,
  balance       BIGINT UNSIGNED NOT NULL DEFAULT 0,
  created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS transactions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  type        ENUM('topup','transfer') NOT NULL,
  sender_id   INT UNSIGNED    NULL,
  receiver_id INT UNSIGNED    NOT NULL,
  amount      BIGINT UNSIGNED NOT NULL,
  created_at  TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tx_sender   FOREIGN KEY (sender_id)   REFERENCES users (id),
  CONSTRAINT fk_tx_receiver FOREIGN KEY (receiver_id) REFERENCES users (id),
  INDEX idx_tx_sender   (sender_id, id),
  INDEX idx_tx_receiver (receiver_id, id)
) ENGINE=InnoDB;
