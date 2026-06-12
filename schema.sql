-- NeuroCode Database Schema Specification
-- Used to initialize the MariaDB tables for user accounts, saved algorithm projects, and gamification metrics.

CREATE DATABASE IF NOT EXISTS neurocode;
USE neurocode;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) DEFAULT NULL,
    avatar LONGTEXT DEFAULT NULL,
    visualizer_runs INT DEFAULT 0,
    time_spent INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Saved Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    code TEXT NOT NULL,
    input_data TEXT,
    visualization_type VARCHAR(50) DEFAULT 'bars',
    steps_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. User Activity Log (GitHub-Style Tracker)
CREATE TABLE IF NOT EXISTS user_activity_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    activity_type ENUM('save_project', 'run_visualizer', 'share_project', 'upvote_project') NOT NULL,
    activity_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, activity_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 4. Badges / Achievements Specifications
CREATE TABLE IF NOT EXISTS badges (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description VARCHAR(255) NOT NULL,
    icon VARCHAR(50) NOT NULL,
    color_theme VARCHAR(50) NOT NULL,
    rule_type ENUM('total_runs', 'total_projects', 'total_shares', 'total_time') NOT NULL,
    rule_threshold INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 5. User Badges Unlocks (M-to-M Map)
CREATE TABLE IF NOT EXISTS user_badges (
    user_id INT NOT NULL,
    badge_id INT NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 6. User Streak Tracker
CREATE TABLE IF NOT EXISTS user_streaks (
    user_id INT PRIMARY KEY,
    current_streak INT DEFAULT 1,
    longest_streak INT DEFAULT 1,
    last_activity_date DATE NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
