# Shopify to Wcart Migration Tool

A comprehensive Node.js/Express.js migration tool to seamlessly transfer data from Shopify stores to Wcart multivendor ecommerce platform with intelligent field mapping and API integration.

## Features

- **Shopify OAuth Integration**: Secure authentication with Shopify stores
- **Data Extraction**: Fetch products, categories, customers, orders, and variants
- **Smart Field Mapping**: Interactive UI to map Shopify fields to Wcart fields
- **Batch Processing**: Efficient migration with configurable batch sizes
- **Progress Tracking**: Real-time migration progress and logs
- **Error Handling**: Retry mechanism for failed migrations
- **Data Preview**: Review mapped data before final migration
- **MySQL Database**: Temporary storage for migration data

## Tech Stack

- **Backend**: Node.js, Express.js
- **View Engine**: EJS
- **Database**: MySQL
- **APIs**: Shopify Admin API, Wcart API
- **Dependencies**: axios, dotenv, mysql2, @shopify/shopify-api

## Installation

```bash
# Clone the repository
git clone https://github.com/anbuwebnexs/shopify-to-wcart-migration.git
cd shopify-to-wcart-migration

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Set up MySQL database
mysql -u root -p < database/schema.sql

# Start the server
npm start
```

## Configuration

Edit `.env` file:

```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=shopify_wcart_migration

SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_SCOPES=read_products,read_customers,read_orders

WCART_API_URL=https://your-wcart-instance.com/api
WCART_API_KEY=your_wcart_api_key
```

## Project Structure

```
shopify-to-wcart-migration/
├── config/
│   └── database.js          # MySQL connection
├── routes/
│   ├── dashboard.js         # Main dashboard
│   ├── shopify.js          # Shopify OAuth & data fetch
│   ├── migration.js        # Field mapping & migration
│   └── wcart.js            # Wcart API integration
├── services/
│   ├── shopifyService.js   # Shopify API calls
│   ├── wcartService.js     # Wcart API calls
│   └── mappingService.js   # Field mapping logic
├── controllers/
│   ├── migrationController.js
│   └── mappingController.js
├── views/
│   ├── dashboard.ejs       # Main dashboard
│   ├── mapping.ejs         # Field mapping UI
│   ├── preview.ejs         # Data preview
│   └── progress.ejs        # Migration progress
├── public/
│   ├── css/
│   └── js/
├── database/
│   └── schema.sql          # Database schema
├── .env.example
├── package.json
└── server.js
```

## Usage

### Step 1: Connect Shopify Store
1. Navigate to `http://localhost:3000`
2. Click "Connect Shopify Store"
3. Authorize the app

### Step 2: Fetch Data
1. Select data types to migrate (Products, Customers, Orders)
2. Click "Fetch Data from Shopify"
3. Review fetched data

### Step 3: Field Mapping
1. Map Shopify fields to Wcart fields
2. Set transformation rules if needed
3. Save mapping template

### Step 4: Preview & Confirm
1. Review mapped data
2. Check for any errors
3. Confirm migration

### Step 5: Migrate
1. Start migration process
2. Monitor progress in real-time
3. View migration logs

## API Endpoints

### Shopify
- `GET /shopify/auth` - Initiate Shopify OAuth
- `GET /shopify/callback` - OAuth callback
- `POST /shopify/fetch` - Fetch data from Shopify

### Migration
- `GET /migration/mapping` - Field mapping UI
- `POST /migration/save-mapping` - Save field mappings
- `POST /migration/start` - Start migration
- `GET /migration/status` - Get migration status

### Wcart
- `POST /wcart/test-connection` - Test Wcart API
- `POST /wcart/upload` - Upload data to Wcart

## Database Schema

```sql
CREATE TABLE migrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  shopify_store VARCHAR(255),
  data_type ENUM('products', 'customers', 'orders'),
  status ENUM('pending', 'in_progress', 'completed', 'failed'),
  total_items INT,
  processed_items INT,
  failed_items INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE field_mappings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  data_type VARCHAR(50),
  shopify_field VARCHAR(255),
  wcart_field VARCHAR(255),
  transformation VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE migration_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  migration_id INT,
  item_id VARCHAR(255),
  status ENUM('success', 'failed'),
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Development

```bash
# Run in development mode with auto-reload
npm run dev
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions, please open an issue on GitHub.

## Author

Created by anbuwebnexs
