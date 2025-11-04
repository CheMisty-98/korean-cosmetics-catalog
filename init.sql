CREATE DATABASE IF NOT EXISTS Online_catalog;
USE Online_catalog;


-- Таблица продуктов
CREATE TABLE IF NOT EXISTS products(
                                       id INT PRIMARY KEY AUTO_INCREMENT,
                                       name VARCHAR(100) UNIQUE NOT NULL,
                                       alt_name VARCHAR(100) NOT NULL,
                                       description VARCHAR(1000) NOT NULL,
                                       brand VARCHAR(100) NOT NULL,
                                       image_url VARCHAR(100) NOT NULL,
                                       category VARCHAR(100) NOT NULL,
                                       in_stock BOOLEAN DEFAULT FALSE,
                                       tags JSON,
                                       created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
                                     id INT PRIMARY KEY AUTO_INCREMENT,
                                     nickname VARCHAR(50) UNIQUE NOT NULL,
                                     password_hash VARCHAR(255) NOT NULL,
                                     role ENUM('admin', 'user') DEFAULT 'user',
                                     created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Добавьте администратора
INSERT INTO users (nickname, password_hash, role)
VALUES ('admin', '$2a$10$hashedpassword', 'admin');
