const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Dashboard home page
router.get('/', async (req, res) => {
  try {
    // Get migration statistics
    const [migrations] = await db.query(`
      SELECT 
        COUNT(*) as total_migrations,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(total_items) as total_items_migrated
      FROM migrations
    `);

    // Get recent migrations
    const [recentMigrations] = await db.query(`
      SELECT 
        id,
        shopify_store,
        data_type,
        status,
        total_items,
        processed_items,
        failed_items,
        created_at
      FROM migrations
      ORDER BY created_at DESC
      LIMIT 10
    `);

    res.render('dashboard', {
      title: 'Shopify to Wcart Migration Dashboard',
      stats: migrations[0],
      recentMigrations: recentMigrations
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('error', { error: 'Failed to load dashboard' });
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

    // Get logs for this migration
    const [logs] = await db.query(
      'SELECT * FROM migration_logs WHERE migration_id = ? ORDER BY created_at DESC LIMIT 50',
      [req.params.id]
    );

    res.json({
      migration: migration[0],
      logs: logs
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ error: 'Failed to fetch migration status' });
  }
});

// Get migration statistics
router.get('/statistics', async (req, res) => {
  try {
    // Overall statistics
    const [overallStats] = await db.query(`
      SELECT 
        data_type,
        COUNT(*) as count,
        SUM(total_items) as total_items,
        SUM(processed_items) as processed_items,
        SUM(failed_items) as failed_items
      FROM migrations
      GROUP BY data_type
    `);

    // Recent activity
    const [recentActivity] = await db.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as migrations_count,
        SUM(total_items) as items_count
      FROM migrations
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);

    res.json({
      byDataType: overallStats,
      recentActivity: recentActivity
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

module.exports = router;
