const db = require("../db");
const { normalizeEvent } = require("../services/normalize");
const { generateEventHash } = require("../services/hash");

const ingestEvent = (req, res) => {
  const { simulateFailure, ...rawEvent } = req.body;

  db.run(
    `INSERT INTO raw_events (raw_payload, status) VALUES (?, ?)`,
    [JSON.stringify(rawEvent), "RECEIVED"],
    function (err) {
      if (err) {
        return res.status(500).json({ error: "Failed to store raw event" });
      }

      const rawEventId = this.lastID;

      try {
        const normalized = normalizeEvent(rawEvent);
        const eventHash = generateEventHash(normalized);

        // 🔥 Simulate DB failure BEFORE processed insert
        if (simulateFailure) {
          throw new Error("Simulated database failure");
        }

        db.run(
          `INSERT INTO processed_events
           (event_hash, client_id, metric, amount, timestamp)
           VALUES (?, ?, ?, ?, ?)`,
          [
            eventHash,
            normalized.client_id,
            normalized.metric,
            normalized.amount,
            normalized.timestamp
          ],
          (err) => {
            if (err) {
              if (err.message.includes("UNIQUE")) {
                return res.status(200).json({ message: "Duplicate event ignored" });
              }

              db.run(
                `UPDATE raw_events SET status = ? WHERE id = ?`,
                ["FAILED", rawEventId]
              );

              return res.status(500).json({ error: "Processing failed" });
            }

            db.run(
              `UPDATE raw_events SET status = ? WHERE id = ?`,
              ["PROCESSED", rawEventId]
            );

            return res.status(200).json({ message: "Event processed successfully" });
          }
        );
      } catch (e) {
        db.run(
          `UPDATE raw_events SET status = ? WHERE id = ?`,
          ["FAILED", rawEventId]
        );

        db.run(
          `INSERT INTO failed_events (raw_payload, error_message) VALUES (?, ?)`,
          [JSON.stringify(rawEvent), e.message]
        );

        return res.status(500).json({ error: e.message });
      }
    }
  );
};

// Get processed events for frontend display
const getProcessedEvents = (req, res) => {
  db.all(
    `SELECT id, client_id, metric, amount, timestamp, created_at 
     FROM processed_events 
     ORDER BY created_at DESC 
     LIMIT 100`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch processed events" });
      }
      res.json(rows);
    }
  );
};

// Get failed events for frontend display
const getFailedEvents = (req, res) => {
  db.all(
    `SELECT id, raw_payload, error_message, created_at 
     FROM failed_events 
     ORDER BY created_at DESC 
     LIMIT 100`,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: "Failed to fetch failed events" });
      }
      res.json(rows);
    }
  );
};

module.exports = { ingestEvent, getProcessedEvents, getFailedEvents };