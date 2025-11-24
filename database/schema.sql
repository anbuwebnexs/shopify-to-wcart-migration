-- Shopify to Wcart Migration Database Schema
-- MySQL Database

CREATE DATABASE IF NOT EXISTS shopify_wcart_migration;
USE shopify_wcart_migration;

-- Table: migrations
CREATE TABLE IF NOT EXISTS migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shopify_store VARCHAR(255) NOT NULL,
  data_type ENUM('products', 'customers', 'orders', 'categories') NOT NULL,
  status ENUM('pending', 'in_progress', 'completed', 'failed') DEFAULT 'pending',
  total_items INT DEFAULT 0,
  processed_items INT DEFAULT 0,
  failed_items INT DEFAULT 0,
  started_at TIMESTAMP NULL,
  completed_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_status (status),
  INDEX idx_data_type (data_type),
  INDEX idx_created_at (created_at)
);

-- Table: field_mappings
CREATE TABLE IF NOT EXISTS field_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_type VARCHAR(50) NOT NULL,
  shopify_field VARCHAR(255) NOT NULL,
  wcart_field VARCHAR(255) NOT NULL,
  transformation VARCHAR(255),
  is_required BOOLEAN DEFAULT FALSE,
  default_value TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_mapping (data_type, shopify_field, wcart_field),
  INDEX idx_data_type (data_type)
);

-- Table: migration_logs
CREATE TABLE IF NOT EXISTS migration_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_id INT NOT NULL,
  item_id VARCHAR(255),
  item_type VARCHAR(50),
  status ENUM('success', 'failed', 'skipped') NOT NULL,
  error_message TEXT,
  shopify_data JSON,
  wcart_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (migration_id) REFERENCES migrations(id) ON DELETE CASCADE,
  INDEX idx_migration_id (migration_id),
  INDEX idx_status (status),
  INDEX idx_item_id (item_id)
);

-- Table: shopify_data_cache
CREATE TABLE IF NOT EXISTS shopify_data_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_type VARCHAR(50) NOT NULL,
  shopify_id VARCHAR(255) NOT NULL,
  data JSON NOT NULL,
  fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NULL,
  UNIQUE KEY unique_shopify_item (data_type, shopify_id),
  INDEX idx_data_type (data_type),
  INDEX idx_expires_at (expires_at)
);

-- Table: wcart_mapping_templates
CREATE TABLE IF NOT EXISTS wcart_mapping_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(255) NOT NULL,
  description TEXT,
  data_type VARCHAR(50) NOT NULL,
  mapping_config JSON NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_data_type (data_type),
  INDEX idx_is_default (is_default)
);

-- Table: api_credentials
CREATE TABLE IF NOT EXISTS api_credentials (
  id INT AUTO_INCREMENT PRIMARY KEY,
  service VARCHAR(50) NOT NULL,
  store_name VARCHAR(255),
  api_key VARCHAR(255),
  api_secret VARCHAR(255),
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_service (service),
  INDEX idx_is_active (is_active)
);

-- Table: migration_stats
CREATE TABLE IF NOT EXISTS migration_stats (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_id INT NOT NULL,
  stat_key VARCHAR(100) NOT NULL,
  stat_value VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (migration_id) REFERENCES migrations(id) ON DELETE CASCADE,
  INDEX idx_migration_id (migration_id),
  INDEX idx_stat_key (stat_key)
);

-- Insert default field mappings for products
INSERT INTO field_mappings (data_type, shopify_field, wcart_field, is_required) VALUES
('products', 'title', 'product_name', TRUE),
('products', 'body_html', 'description', TRUE),
('products', 'vendor', 'brand', FALSE),
('products', 'product_type', 'category', FALSE),
('products', 'tags', 'tags', FALSE),
('products', 'variants[0].price', 'price', TRUE),
('products', 'variants[0].sku', 'sku', FALSE),
('products', 'variants[0].inventory_quantity', 'stock', TRUE),
('products', 'images', 'images', FALSE);

-- Insert default field mappings for customers
INSERT INTO field_mappings (data_type, shopify_field, wcart_field, is_required) VALUES
('customers', 'first_name', 'first_name', TRUE),
('customers', 'last_name', 'last_name', TRUE),
('customers', 'email', 'email', TRUE),
('customers', 'phone', 'phone', FALSE),
('customers', 'default_address.address1', 'address', FALSE),
('customers', 'default_address.city', 'city', FALSE),
('customers', 'default_address.country', 'country', FALSE),
('customers', 'default_address.zip', 'postal_code', FALSE);

-- Insert default field mappings for orders
INSERT INTO field_mappings (data_type, shopify_field, wcart_field, is_required) VALUES
('orders', 'order_number', 'order_number', TRUE),
('orders', 'email', 'customer_email', TRUE),
('orders', 'total_price', 'total_amount', TRUE),
('orders', 'subtotal_price', 'subtotal', TRUE),
('orders', 'total_tax', 'tax_amount', FALSE),
('orders', 'shipping_lines[0].price', 'shipping_cost', FALSE),
('orders', 'financial_status', 'payment_status', TRUE),
('orders', 'fulfillment_status', 'fulfillment_status', FALSE),
('orders', 'created_at', 'order_date', TRUE);
