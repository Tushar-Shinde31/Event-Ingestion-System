const db = require("../db");

const getAggregates = (req, res) => {
  const { client_id, from, to } = req.query;

  // Build query with optional filters
  let query = `SELECT COUNT(*) as total_count, SUM(amount) as total_amount 
               FROM processed_events WHERE 1=1`;
  const params = [];

  if (client_id) {
    query += ` AND client_id = ?`;
    params.push(client_id);
  }

  if (from) {
    query += ` AND timestamp >= ?`;
    params.push(from);
  }

  if (to) {
    query += ` AND timestamp <= ?`;
    params.push(to);
  }

  db.get(query, params, (err, row) => {
    if (err) {
      return res.status(500).json({ error: "Failed to fetch aggregates" });
    }

    // Handle null values from SUM when no rows exist
    const totalCount = row.total_count || 0;
    const totalAmount = row.total_amount || 0;

    res.json({
      total_count: totalCount,
      total_amount: totalAmount
    });
  });
};

module.exports = { getAggregates };

