const express = require('express');
const router = express.Router();
const axios = require('axios');

// Test Wcart API connection
router.post('/test-connection', async (req, res) => {
  try {
    const { apiUrl, apiKey } = req.body;
    
    // Test connection to Wcart API
    const response = await axios.get(
      `${apiUrl}/health`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );
    
    res.json({
      success: true,
      message: 'Connection successful',
      data: response.data
    });
  } catch (error) {
    console.error('Wcart connection test error:', error);
    res.status(500).json({
      success: false,
      error: 'Connection failed',
      message: error.message
    });
  }
});

// Upload products to Wcart
router.post('/upload/products', async (req, res) => {
  try {
    const { products } = req.body;
    
    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ error: 'Invalid products data' });
    }
    
    const results = [];
    
    for (const product of products) {
      try {
        const response = await axios.post(
          `${process.env.WCART_API_URL}/products`,
          product,
          {
            headers: {
              'Authorization': `Bearer ${process.env.WCART_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        results.push({
          success: true,
          productName: product.product_name,
          wcartId: response.data.id || response.data.product_id
        });
      } catch (error) {
        results.push({
          success: false,
          productName: product.product_name,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    });
  } catch (error) {
    console.error('Upload products error:', error);
    res.status(500).json({ error: 'Failed to upload products' });
  }
});

// Upload customers to Wcart
router.post('/upload/customers', async (req, res) => {
  try {
    const { customers } = req.body;
    
    if (!customers || !Array.isArray(customers)) {
      return res.status(400).json({ error: 'Invalid customers data' });
    }
    
    const results = [];
    
    for (const customer of customers) {
      try {
        const response = await axios.post(
          `${process.env.WCART_API_URL}/customers`,
          customer,
          {
            headers: {
              'Authorization': `Bearer ${process.env.WCART_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        results.push({
          success: true,
          customerEmail: customer.email,
          wcartId: response.data.id || response.data.customer_id
        });
      } catch (error) {
        results.push({
          success: false,
          customerEmail: customer.email,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    });
  } catch (error) {
    console.error('Upload customers error:', error);
    res.status(500).json({ error: 'Failed to upload customers' });
  }
});

// Upload orders to Wcart
router.post('/upload/orders', async (req, res) => {
  try {
    const { orders } = req.body;
    
    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({ error: 'Invalid orders data' });
    }
    
    const results = [];
    
    for (const order of orders) {
      try {
        const response = await axios.post(
          `${process.env.WCART_API_URL}/orders`,
          order,
          {
            headers: {
              'Authorization': `Bearer ${process.env.WCART_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        results.push({
          success: true,
          orderNumber: order.order_number,
          wcartId: response.data.id || response.data.order_id
        });
      } catch (error) {
        results.push({
          success: false,
          orderNumber: order.order_number,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      totalProcessed: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results: results
    });
  } catch (error) {
    console.error('Upload orders error:', error);
    res.status(500).json({ error: 'Failed to upload orders' });
  }
});

// Batch upload data to Wcart
router.post('/upload/batch', async (req, res) => {
  try {
    const { dataType, items, batchSize } = req.body;
    
    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Invalid items data' });
    }
    
    const size = batchSize || 50;
    const results = [];
    
    // Process in batches
    for (let i = 0; i < items.length; i += size) {
      const batch = items.slice(i, i + size);
      
      try {
        const response = await axios.post(
          `${process.env.WCART_API_URL}/${dataType}/batch`,
          { items: batch },
          {
            headers: {
              'Authorization': `Bearer ${process.env.WCART_API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        results.push({
          success: true,
          batchNumber: Math.floor(i / size) + 1,
          itemsProcessed: batch.length,
          data: response.data
        });
      } catch (error) {
        results.push({
          success: false,
          batchNumber: Math.floor(i / size) + 1,
          itemsProcessed: batch.length,
          error: error.message
        });
      }
    }
    
    res.json({
      success: true,
      totalBatches: results.length,
      successfulBatches: results.filter(r => r.success).length,
      failedBatches: results.filter(r => !r.success).length,
      results: results
    });
  } catch (error) {
    console.error('Batch upload error:', error);
    res.status(500).json({ error: 'Failed to batch upload' });
  }
});

// Get Wcart API info
router.get('/info', async (req, res) => {
  try {
    const response = await axios.get(
      `${process.env.WCART_API_URL}/info`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WCART_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      success: true,
      apiUrl: process.env.WCART_API_URL,
      info: response.data
    });
  } catch (error) {
    console.error('Get Wcart info error:', error);
    res.status(500).json({ error: 'Failed to get Wcart API info' });
  }
});

// Validate data before upload
router.post('/validate', async (req, res) => {
  try {
    const { dataType, data } = req.body;
    
    const response = await axios.post(
      `${process.env.WCART_API_URL}/${dataType}/validate`,
      data,
      {
        headers: {
          'Authorization': `Bearer ${process.env.WCART_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    res.json({
      success: true,
      valid: response.data.valid,
      errors: response.data.errors || [],
      warnings: response.data.warnings || []
    });
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ error: 'Failed to validate data' });
  }
});

module.exports = router;
