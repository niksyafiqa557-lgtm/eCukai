-- =====================================================================
-- e-Cukai Lot: Location / Address-Based Property Tax Payment Status
-- Database schema for Majlis Daerah Pasir Puteh
-- Target: MySQL 5.7+ / MariaDB (XAMPP default)
-- =====================================================================

CREATE DATABASE IF NOT EXISTS ecukai_lot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE ecukai_lot;

-- ---------------------------------------------------------------------
-- Officer: authorized system users
-- ---------------------------------------------------------------------
CREATE TABLE officer (
    id            INT AUTO_INCREMENT PRIMARY KEY,
    staff_no      VARCHAR(20)  NOT NULL UNIQUE,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('officer','admin') DEFAULT 'officer',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------
-- Property: property and location information
-- ---------------------------------------------------------------------
CREATE TABLE property (
    property_id   INT AUTO_INCREMENT PRIMARY KEY,
    account_no    VARCHAR(20)  NOT NULL UNIQUE,
    address       VARCHAR(255) NOT NULL,
    area          VARCHAR(100) NOT NULL,
    property_type ENUM('Residential','Commercial','Agricultural','Industrial') NOT NULL,
    latitude      DECIMAL(10,7) NOT NULL,
    longitude     DECIMAL(10,7) NOT NULL,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_address (address),
    INDEX idx_area (area)
);

-- ---------------------------------------------------------------------
-- Tax: tax records and current status per year
-- ---------------------------------------------------------------------
CREATE TABLE tax (
    tax_id      INT AUTO_INCREMENT PRIMARY KEY,
    property_id INT NOT NULL,
    year        YEAR NOT NULL,
    amount      DECIMAL(10,2) NOT NULL,
    status      ENUM('PAID','UNPAID') NOT NULL DEFAULT 'UNPAID',
    FOREIGN KEY (property_id) REFERENCES property(property_id) ON DELETE CASCADE,
    UNIQUE KEY unique_property_year (property_id, year)
);

-- ---------------------------------------------------------------------
-- Payment: payment records tied to a tax record
-- ---------------------------------------------------------------------
CREATE TABLE payment (
    payment_id     INT AUTO_INCREMENT PRIMARY KEY,
    tax_id         INT NOT NULL,
    payment_amount DECIMAL(10,2) NOT NULL,
    payment_date   DATE NOT NULL,
    FOREIGN KEY (tax_id) REFERENCES tax(tax_id) ON DELETE CASCADE
);

-- =====================================================================
-- SAMPLE DATA (mirrors the prototype so the two stay in sync)
-- =====================================================================

INSERT INTO officer (staff_no, name, email, password_hash, role) VALUES
('mdpp0234', 'Nik Syafiqa Afiera', 'syafiqa@mdpp.gov.my', '$2y$10$replace_with_real_hash', 'officer');

INSERT INTO property (account_no, address, area, property_type, latitude, longitude) VALUES
('100245', 'Jalan Kota Bharu, Pasir Puteh',   'Bandar Pasir Puteh',   'Residential',   5.8322000, 102.4058000),
('100312', 'Jalan Pasir Puteh Bahru',          'Bandar Pasir Puteh',   'Commercial',    5.8341000, 102.4079000),
('100467', 'Kampung Baru Pasir Puteh',         'Kampung Baru',         'Residential',   5.8296000, 102.4033000),
('100589', 'Jalan Beris Lalang',               'Beris Lalang',         'Residential',   5.8380000, 102.4104000),
('100612', 'Taman Bunga Raya',                 'Taman Bunga Raya',     'Residential',   5.8267000, 102.4092000),
('100734', 'Jalan Hospital Pasir Puteh',       'Bandar Pasir Puteh',   'Commercial',    5.8355000, 102.4021000),
('100845', 'Kampung Padang Pak Amat',          'Padang Pak Amat',      'Agricultural',  5.8215000, 102.4067000),
('100901', 'Jalan Kubang Kerian Lama',         'Kubang Kerian Lama',   'Residential',   5.8398000, 102.4048000),
('101022', 'Taman Seri Intan',                 'Taman Bunga Raya',     'Residential',   5.8283000, 102.4115000),
('101138', 'Jalan Machang',                    'Bandar Pasir Puteh',   'Commercial',    5.8309000, 102.4142000);

INSERT INTO tax (property_id, year, amount, status) VALUES
(1, 2026, 150.00, 'PAID'),
(2, 2026, 420.00, 'UNPAID'),
(3, 2026, 130.00, 'PAID'),
(4, 2026, 145.00, 'UNPAID'),
(5, 2026, 160.00, 'PAID'),
(6, 2026, 510.00, 'UNPAID'),
(7, 2026, 95.00,  'PAID'),
(8, 2026, 140.00, 'UNPAID'),
(9, 2026, 155.00, 'PAID'),
(10,2026, 380.00, 'PAID');

INSERT INTO payment (tax_id, payment_amount, payment_date) VALUES
(1, 150.00, '2026-03-15'),
(3, 130.00, '2026-02-02'),
(5, 160.00, '2026-01-20'),
(7, 95.00,  '2026-03-11'),
(9, 155.00, '2026-03-05'),
(10,380.00, '2026-02-28');
