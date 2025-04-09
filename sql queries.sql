-- Create Database
CREATE DATABASE lost_and_found_db;
USE lost_and_found_db;

-- Users Table
CREATE TABLE users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NULL,
    email VARCHAR(100) UNIQUE NULL,
    phone VARCHAR(15) NULL,
    registered_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lost Items Table
CREATE TABLE lost_items (
    item_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    item_name VARCHAR(100) NOT NULL,
    category ENUM('Electronics', 'Clothing', 'Accessories', 'Documents', 'Other') NOT NULL,
    description TEXT NULL,
    lost_date DATE NOT NULL,
    lost_location VARCHAR(255) NOT NULL,
    status ENUM('Reported', 'Matched', 'Returned') DEFAULT 'Reported',
    reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Found Items Table (Renamed for consistency)
CREATE TABLE found_items (
    found_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    item_name VARCHAR(100) NOT NULL,
    category ENUM('Electronics', 'Clothing', 'Accessories', 'Documents', 'Other') NOT NULL,
    description TEXT NULL,
    found_date DATE NOT NULL,
    found_location VARCHAR(255) NOT NULL,
    status ENUM('Available', 'Claim Pending', 'Claimed', 'Matched', 'Returned') DEFAULT 'Available',
    reported_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
DROP TABLE claim_requests;
-- Claim Requests Table
CREATE TABLE claim_requests (
    claim_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    found_id INT NOT NULL,
    status ENUM('Pending', 'Approved', 'Rejected') DEFAULT 'Pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (found_id) REFERENCES found_items(found_id) ON DELETE CASCADE, -- Fixed table name
    UNIQUE KEY unique_user_claim (user_id, found_id)
);


-- Item Matching Table
CREATE TABLE item_matching (
    match_id INT AUTO_INCREMENT PRIMARY KEY,
    lost_item_id INT NOT NULL,
    found_item_id INT NOT NULL,
    status ENUM('Suggested', 'Confirmed', 'Rejected') DEFAULT 'Suggested',
    matched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lost_item_id) REFERENCES lost_items(item_id) ON DELETE CASCADE,
    FOREIGN KEY (found_item_id) REFERENCES found_items(found_id) ON DELETE CASCADE,
    UNIQUE KEY unique_match (lost_item_id, found_item_id)
);

-- Escrow Table (For holding matched/claimed items)
CREATE TABLE escrow (
    escrow_id INT AUTO_INCREMENT PRIMARY KEY,
    found_id INT NOT NULL,
    lost_item_id INT NULL,
    status ENUM('Holding', 'Released', 'Disposed') DEFAULT 'Holding',
    claimed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    released_at DATETIME NULL,
    FOREIGN KEY (found_id) REFERENCES found_items(found_id) ON DELETE CASCADE,
    FOREIGN KEY (lost_item_id) REFERENCES lost_items(item_id) ON DELETE SET NULL,
    UNIQUE KEY unique_escrow (found_id, lost_item_id)
);

-- Indexes for Faster Queries
CREATE INDEX idx_lost_user ON lost_items(user_id);
CREATE INDEX idx_found_user ON found_items(user_id);
CREATE INDEX idx_claim_found ON claim_requests(found_id);
CREATE INDEX idx_match_lost ON item_matching(lost_item_id);

-- ==============================
-- ✅ TRIGGERS FOR AUTOMATION ✅
-- ==============================

DELIMITER //

-- Trigger: Update Found Item Status on Claim Approval
CREATE TRIGGER trg_after_claim_update
AFTER UPDATE ON claim_requests
FOR EACH ROW
BEGIN
    -- If claim is approved, mark the found item as 'Claimed' and add it to escrow
    IF NEW.status = 'Approved' AND OLD.status != 'Approved' THEN
        UPDATE found_items
        SET status = 'Claimed'
        WHERE found_id = NEW.found_id;

        INSERT INTO escrow (found_id, status, claimed_at)
        VALUES (NEW.found_id, 'Holding', NOW());
    END IF;

    -- If claim is rejected and no other claims exist, revert found item to 'Available'
    IF NEW.status = 'Rejected' THEN
        IF NOT EXISTS (SELECT 1 FROM claim_requests WHERE found_id = NEW.found_id AND status = 'Approved') THEN
            UPDATE found_items
            SET status = 'Available'
            WHERE found_id = NEW.found_id;
        END IF;
    END IF;
END;
//

-- Trigger: Update Item Status on Match Confirmation
CREATE TRIGGER trg_after_match_confirmed
AFTER UPDATE ON item_matching
FOR EACH ROW
BEGIN
    IF NEW.status = 'Confirmed' AND OLD.status != 'Confirmed' THEN
        UPDATE lost_items
        SET status = 'Matched'
        WHERE item_id = NEW.lost_item_id;

        UPDATE found_items
        SET status = 'Matched'
        WHERE found_id = NEW.found_item_id;

        -- Insert into escrow
        INSERT INTO escrow (found_id, lost_item_id, status, claimed_at)
        VALUES (NEW.found_item_id, NEW.lost_item_id, 'Holding', NOW());
    END IF;
END;
//

DELIMITER ;

-- ==============================
-- ✅ STORED PROCEDURES ✅
-- ==============================

-- Automatically Find Matches Based on Category & Location
DELIMITER //

CREATE PROCEDURE auto_match_items()
BEGIN
    INSERT INTO item_matching (lost_item_id, found_item_id, status, matched_at)
    SELECT l.item_id, f.found_id, 'Suggested', NOW()
    FROM lost_items l
    JOIN found_items f
    ON l.category = f.category AND l.lost_location = f.found_location
    WHERE l.status = 'Reported' AND f.status = 'Available';
END;
//

DELIMITER ;

-- ==============================
-- ✅ SAMPLE DATA ✅
-- ==============================

INSERT INTO users (name, email, phone) VALUES
('Alice Smith', 'alice@example.com', '111-222-3333'),
('Bob Johnson', 'bob@example.com', '444-555-6666');

INSERT INTO lost_items (user_id, item_name, category, description, lost_date, lost_location)
VALUES (1, 'Laptop', 'Electronics', 'Dell XPS 13, silver', '2025-04-01', 'Library');

INSERT INTO found_items (user_id, item_name, category, description, found_date, found_location)
VALUES (2, 'Laptop', 'Electronics', 'Dell laptop found near library', '2025-04-02', 'Library');

-- Call Stored Procedure
CALL auto_match_items();

ALTER TABLE lost_items MODIFY category VARCHAR(50);
ALTER TABLE found_items MODIFY category VARCHAR(50);

SHOW TABLES;

ALTER TABLE users ADD COLUMN password VARCHAR(255) NOT NULL;

ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NOT NULL;

ALTER TABLE users DROP COLUMN password_hash;


ALTER TABLE users CHANGE COLUMN name username VARCHAR(100);