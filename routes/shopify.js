const express = require('express');
const router = express.Router();
const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/database');

// Shopify OAuth - Initiate authentication
router.get('/auth', (req, res) => {
  const shop = req.query.shop;
  
  if (!shop) {
    return res.status(400).send('Missing shop parameter');
  }

  const scopes = process.env.SHOPIFY_SCOPES || 'read_products,read_customers,read_orders';
  const redirectUri = `${req.protocol}://${req.get('host')}/shopify/callback`;
  const nonce = crypto.randomBytes(16).toString('hex');
  
  // Store nonce in session
  req.session.shopifyNonce = nonce;
  
  const authUrl = `https://${shop}/admin/oauth/authorize?client_id=${process.env.SHOPIFY_API_KEY}&scope=${scopes}&redirect_uri=${redirectUri}&state=${nonce}`;
  
  res.redirect(authUrl);
});

// Shopify OAuth callback
router.get('/callback', async (req, res) => {
  const { shop, code, state } = req.query;
  
  // Verify state
  if (state !== req.session.shopifyNonce) {
    return res.status(403).send('Invalid request');
  }
  
  try {
    // Exchange code for access token
    const response = await axios.post(`https://${shop}/admin/oauth/access_token`, {
      client_id: process.env.SHOPIFY_API_KEY,
      client_secret: process.env.SHOPIFY_API_SECRET,
      code: code
    });
    
    const accessToken = response.data.access_token;
    
    // Store credentials in database
    await db.query(
      `INSERT INTO api_credentials (service, store_name, api_key, access_token, is_active) 
       VALUES (?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE access_token = ?, is_active = ?`,
      ['shopify', shop, process.env.SHOPIFY_API_KEY, accessToken, true, accessToken, true]
    );
    
    req.session.shopifyStore = shop;
    req.session.shopifyToken = accessToken;
    
    res.redirect('/migration/select-data');
  } catch (error) {
    console.error('Shopify OAuth error:', error);
    res.status(500).send('Authentication failed');
  }
});

// Fetch products from Shopify
router.post('/fetch/products', async (req, res) => {
  try {
    const shop = req.session.shopifyStore;
    const token = req.session.shopifyToken;
    
    if (!shop || !token) {
      return res.status(401).json({ error: 'Not authenticated with Shopify' });
    }
    
    let allProducts = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await axios.get(
        `https://${shop}/admin/api/2024-01/products.json?limit=250&page=${page}`,
        {
          headers: {
            'X-Shopify-Access-Token': token
          }
        }
      );
      
      const products = response.data.products;
      allProducts = allProducts.concat(products);
      
      hasMore = products.length === 250;
      page++;
    }
    
    // Cache products in database
    for (const product of allProducts) {
      await db.query(
        'INSERT INTO shopify_data_cache (data_type, shopify_id, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = ?',
        ['products', product.id.toString(), JSON.stringify(product), JSON.stringify(product)]
      );
    }
    
    res.json({
      success: true,
      count: allProducts.length,
      products: allProducts
    });
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// Fetch customers from Shopify
router.post('/fetch/customers', async (req, res) => {
  try {
    const shop = req.session.shopifyStore;
    const token = req.session.shopifyToken;
    
    if (!shop || !token) {
      return res.status(401).json({ error: 'Not authenticated with Shopify' });
    }
    
    let allCustomers = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await axios.get(
        `https://${shop}/admin/api/2024-01/customers.json?limit=250&page=${page}`,
        {
          headers: {
            'X-Shopify-Access-Token': token
          }
        }
      );
      
      const customers = response.data.customers;
      allCustomers = allCustomers.concat(customers);
      
      hasMore = customers.length === 250;
      page++;
    }
    
    // Cache customers in database
    for (const customer of allCustomers) {
      await db.query(
        'INSERT INTO shopify_data_cache (data_type, shopify_id, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = ?',
        ['customers', customer.id.toString(), JSON.stringify(customer), JSON.stringify(customer)]
      );
    }
    
    res.json({
      success: true,
      count: allCustomers.length,
      customers: allCustomers
    });
  } catch (error) {
    console.error('Fetch customers error:', error);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// Fetch orders from Shopify
router.post('/fetch/orders', async (req, res) => {
  try {
    const shop = req.session.shopifyStore;
    const token = req.session.shopifyToken;
    
    if (!shop || !token) {
      return res.status(401).json({ error: 'Not authenticated with Shopify' });
    }
    
    let allOrders = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const response = await axios.get(
        `https://${shop}/admin/api/2024-01/orders.json?limit=250&page=${page}&status=any`,
        {
          headers: {
            'X-Shopify-Access-Token': token
          }
        }
      );
      
      const orders = response.data.orders;
      allOrders = allOrders.concat(orders);
      
      hasMore = orders.length === 250;
      page++;
    }
    
    // Cache orders in database
    for (const order of allOrders) {
      await db.query(
        'INSERT INTO shopify_data_cache (data_type, shopify_id, data) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = ?',
        ['orders', order.id.toString(), JSON.stringify(order), JSON.stringify(order)]
      );
    }
    
    res.json({
      success: true,
      count: allOrders.length,
      orders: allOrders
    });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get cached Shopify data
router.get('/cached/:dataType', async (req, res) => {
  try {
    const { dataType } = req.params;
    
    const [data] = await db.query(
      'SELECT * FROM shopify_data_cache WHERE data_type = ? ORDER BY fetched_at DESC',
      [dataType]
    );
    
    res.json({
      success: true,
      count: data.length,
      data: data.map(item => JSON.parse(item.data))
    });
  } catch (error) {
    console.error('Get cached data error:', error);
    res.status(500).json({ error: 'Failed to get cached data' });
  }
});

module.exports = router;
