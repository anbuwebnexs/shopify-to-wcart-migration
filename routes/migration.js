const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../config/database');

// Select data types to migrate
router.get('/select-data', (req, res) => {
  res.render('select-data', {
    title: 'Select Data to Migrate'
  });
});

// Field mapping page
router.get('/mapping', async (req, res) => {
  try {
    const dataType = req.query.type || 'products';
    
    // Get existing field mappings from database
    const [mappings] = await db.query(
      'SELECT * FROM field_mappings WHERE data_type = ?',
      [dataType]
    );
    
    // Get sample data from Shopify cache
    const [sampleData] = await db.query(
      'SELECT data FROM shopify_data_cache WHERE data_type = ? LIMIT 1',
      [dataType]
    );
    
    const sample = sampleData.length > 0 ? JSON.parse(sampleData[0].data) : null;
    
    res.render('mapping', {
      title: `Field Mapping - ${dataType}`,
      dataType: dataType,
      mappings: mappings,
      sampleData: sample
    });
  } catch (error) {
    console.error('Mapping page error:', error);
    res.status(500).send('Failed to load mapping page');
  }
});

// Save field mappings
router.post('/save-mapping', async (req, res) => {
  try {
    const { dataType, mappings } = req.body;
    
    // Clear existing mappings for this data type
    await db.query('DELETE FROM field_mappings WHERE data_type = ?', [dataType]);
    
    // Insert new mappings
    for (const mapping of mappings) {
      await db.query(
        'INSERT INTO field_mappings (data_type, shopify_field, wcart_field, transformation, is_required) VALUES (?, ?, ?, ?, ?)',
        [dataType, mapping.shopifyField, mapping.wcartField, mapping.transformation || null, mapping.isRequired || false]
      );
    }
    
    res.json({ success: true, message: 'Mappings saved successfully' });
  } catch (error) {
    console.error('Save mapping error:', error);
    res.status(500).json({ error: 'Failed to save mappings' });
  }
});

// Preview mapped data
router.get('/preview', async (req, res) => {
  try {
    const dataType = req.query.type || 'products';
    const limit = parseInt(req.query.limit) || 10;
    
    // Get field mappings
    const [mappings] = await db.query(
      'SELECT * FROM field_mappings WHERE data_type = ?',
      [dataType]
    );
    
    // Get Shopify data from cache
    const [shopifyData] = await db.query(
      'SELECT data FROM shopify_data_cache WHERE data_type = ? LIMIT ?',
      [dataType, limit]
    );
    
    // Transform data according to mappings
    const transformedData = shopifyData.map(item => {
      const shopifyItem = JSON.parse(item.data);
      const wcartItem = {};
      
      for (const mapping of mappings) {
        const shopifyValue = getNestedValue(shopifyItem, mapping.shopify_field);
        wcartItem[mapping.wcart_field] = applyTransformation(shopifyValue, mapping.transformation);
      }
      
      return {
        shopify: shopifyItem,
        wcart: wcartItem
      };
    });
    
    res.render('preview', {
      title: `Preview - ${dataType}`,
      dataType: dataType,
      data: transformedData
    });
  } catch (error) {
    console.error('Preview error:', error);
    res.status(500).send('Failed to load preview');
  }
});

// Start migration
router.post('/start', async (req, res) => {
  try {
    const { dataType } = req.body;
    const shop = req.session.shopifyStore;
    
    // Create migration record
    const [result] = await db.query(
      'INSERT INTO migrations (shopify_store, data_type, status) VALUES (?, ?, ?)',
      [shop, dataType, 'pending']
    );
    
    const migrationId = result.insertId;
    
    // Start migration process asynchronously
    processMigration(migrationId, dataType).catch(error => {
      console.error('Migration process error:', error);
    });
    
    res.json({
      success: true,
      migrationId: migrationId,
      message: 'Migration started'
    });
  } catch (error) {
    console.error('Start migration error:', error);
    res.status(500).json({ error: 'Failed to start migration' });
  }
});

// Get migration status
router.get('/status/:id', async (req, res) => {
  try {
    const [migration] = await db.query(
      'SELECT * FROM migrations WHERE id = ?',
      [req.params.id]
    );
    
    if (migration.length === 0) {
      return res.status(404).json({ error: 'Migration not found' });
    }
    
    const [logs] = await db.query(
      'SELECT * FROM migration_logs WHERE migration_id = ? ORDER BY created_at DESC LIMIT 100',
      [req.params.id]
    );
    
    res.json({
      migration: migration[0],
      logs: logs
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Helper function to get nested object values
function getNestedValue(obj, path) {
  return path.split('.').reduce((current, prop) => {
    return current && current[prop] !== undefined ? current[prop] : null;
  }, obj);
}

// Helper function to apply transformations
function applyTransformation(value, transformation) {
  if (!transformation || !value) return value;
  
  // Add transformation logic here (e.g., uppercase, lowercase, format dates, etc.)
  switch (transformation) {
    case 'uppercase':
      return value.toString().toUpperCase();
    case 'lowercase':
      return value.toString().toLowerCase();
    case 'trim':
      return value.toString().trim();
    default:
      return value;
  }
}

// Async migration processor
async function processMigration(migrationId, dataType) {
  try {
    // Update status to in_progress
    await db.query(
      'UPDATE migrations SET status = ?, started_at = NOW() WHERE id = ?',
      ['in_progress', migrationId]
    );
    
    // Get field mappings
    const [mappings] = await db.query(
      'SELECT * FROM field_mappings WHERE data_type = ?',
      [dataType]
    );
    
    // Get all data from cache
    const [cachedData] = await db.query(
      'SELECT * FROM shopify_data_cache WHERE data_type = ?',
      [dataType]
    );
    
    const totalItems = cachedData.length;
    await db.query(
      'UPDATE migrations SET total_items = ? WHERE id = ?',
      [totalItems, migrationId]
    );
    
    let processed = 0;
    let failed = 0;
    
    // Process in batches
    const batchSize = parseInt(process.env.BATCH_SIZE) || 50;
    
    for (let i = 0; i < cachedData.length; i += batchSize) {
      const batch = cachedData.slice(i, i + batchSize);
      
      for (const item of batch) {
        try {
          const shopifyItem = JSON.parse(item.data);
          const wcartItem = {};
          
          // Map fields
          for (const mapping of mappings) {
            const shopifyValue = getNestedValue(shopifyItem, mapping.shopify_field);
            wcartItem[mapping.wcart_field] = applyTransformation(shopifyValue, mapping.transformation);
          }
          
          // Send to Wcart API
          await axios.post(
            `${process.env.WCART_API_URL}/${dataType}`,
            wcartItem,
            {
              headers: {
                'Authorization': `Bearer ${process.env.WCART_API_KEY}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          processed++;
          
          // Log success
          await db.query(
            'INSERT INTO migration_logs (migration_id, item_id, status, shopify_data, wcart_data) VALUES (?, ?, ?, ?, ?)',
            [migrationId, item.shopify_id, 'success', JSON.stringify(shopifyItem), JSON.stringify(wcartItem)]
          );
        } catch (itemError) {
          failed++;
          
          // Log failure
          await db.query(
            'INSERT INTO migration_logs (migration_id, item_id, status, error_message) VALUES (?, ?, ?, ?)',
            [migrationId, item.shopify_id, 'failed', itemError.message]
          );
        }
        
        // Update progress
        await db.query(
          'UPDATE migrations SET processed_items = ?, failed_items = ? WHERE id = ?',
          [processed, failed, migrationId]
        );
      }
    }
    
    // Update to completed
    await db.query(
      'UPDATE migrations SET status = ?, completed_at = NOW() WHERE id = ?',
      ['completed', migrationId]
    );
  } catch (error) {
    console.error('Migration processor error:', error);
    
    await db.query(
      'UPDATE migrations SET status = ? WHERE id = ?',
      ['failed', migrationId]
    );
  }
}

module.exports = router;
