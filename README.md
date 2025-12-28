# Event Ingestion System

A simple event ingestion and aggregation system built with Node.js, Express, and SQLite.

## Setup

### Backend
```bash
cd backend
npm install
node src/app.js
```

### Frontend
```bash
cd frontend
npm install
npm start
```

The frontend will run on http://localhost:3001 and the backend on http://localhost:3000.

## API Endpoints

- `POST /events` - Submit a raw event (supports `simulateFailure` flag)
- `GET /events/processed` - Get successfully processed events
- `GET /events/failed` - Get failed/rejected events
- `GET /aggregates?client_id=X&from=Y&to=Z` - Get aggregated data (total count and total amount)

## Design Questions

### 1. What assumptions did you make?

- Client events are unreliable and may have missing or malformed fields.

- There is no trusted event ID, so duplicates are identified using event content.

- Events with the same client_id, metric, amount, and timestamp are treated as duplicates.

- SQLite is sufficient for a single-node, demo-scale system.

- Timestamps are normalized to ISO format and amounts are treated as integers.

- The system runs as a single instance without authentication.

### 2. How does your system prevent double counting?

- Each normalized event generates a deterministic hash using
  client_id + metric + amount + timestamp.

- This hash is stored with a UNIQUE constraint in the processed_events table.

- If the same event is retried, the database rejects the duplicate insert.

- Aggregations read only from processed_events, so duplicates and failed events are never counted.

### 3. What happens if the database fails mid-request?

- Raw events are always stored first.

- Events are inserted into processed_events only after successful normalization.

- If a failure occurs before or during processing, the event is not counted.

- If a failure occurs after insertion, the event is already stored once.

- Aggregates remain consistent because they read only from processed data.

- Retries are safe due to idempotent hashing.

### 4. What would break first at scale and why?

- SQLite write contention would be the first bottleneck due to single-writer locking.

- Additional limitations include missing indexes, lack of pagination, and synchronous processing.

- Scaling would require PostgreSQL, proper indexing, pagination, and async processing.


