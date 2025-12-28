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

The frontend will run on http://localhost:3001 (or next available port) and the backend on http://localhost:3000.

## API Endpoints

- `POST /events` - Submit a raw event (supports `simulateFailure` flag)
- `GET /events/processed` - Get successfully processed events
- `GET /events/failed` - Get failed/rejected events
- `GET /aggregates?client_id=X&from=Y&to=Z` - Get aggregated data (total count and total amount)

## Design Questions

### 1. What assumptions did you make?

- **Event structure**: Events follow a predictable structure with `source`, `payload.metric`, `payload.amount`, and `payload.timestamp`. Missing fields default to "unknown" or 0.
- **Idempotency scope**: Events are considered duplicates if they have the same `client_id`, `metric`, `amount`, and `timestamp` combination (used for hash generation).
- **Database**: SQLite is sufficient for this use case. No connection pooling or transaction management beyond basic SQLite operations.
- **Timestamps**: Timestamps are normalized to ISO 8601 format strings for consistency.
- **Amount type**: Amounts are treated as integers (stored as INTEGER in SQLite).
- **No authentication**: The system operates without authentication or authorization layers.
- **Single instance**: The system is designed to run as a single process without distributed coordination.

### 2. How does your system prevent double counting?

The system uses **hash-based deduplication** with a database-level UNIQUE constraint:

1. **Hash generation**: Each normalized event generates a SHA-256 hash from `client_id|metric|amount|timestamp`.
2. **UNIQUE constraint**: The `processed_events` table has a UNIQUE constraint on `event_hash`.
3. **Idempotent insertion**: When a duplicate event (same hash) is inserted:
   - The database rejects the insert due to the UNIQUE constraint
   - The system detects this and returns a success response (idempotent behavior)
   - The event is **not** counted again in aggregates
4. **Aggregation source**: Aggregates (`/aggregates`) read **only** from `processed_events`, ensuring:
   - Only successfully processed, deduplicated events are counted
   - Retries of the same event don't inflate counts
   - Failed events are never included in aggregates

This approach ensures that even if the same event is submitted multiple times (due to network retries, client errors, etc.), it will only be counted once in the final aggregates.

### 3. What happens if the database fails mid-request?

The system handles mid-request failures through a **two-phase approach**:

1. **Raw event storage first**: The raw event is always stored in `raw_events` with status "RECEIVED" before any processing begins.
2. **Failure scenarios**:
   - **Before processed insert**: If failure occurs (simulated or real) before inserting into `processed_events`, the `raw_events` status is updated to "FAILED" and the event is logged in `failed_events`. The aggregate counts remain unchanged.
   - **During processed insert**: If the database fails during the `processed_events` insert:
     - The UNIQUE constraint on `event_hash` prevents duplicate counting if the insert partially succeeded
     - If the insert fails completely, the `raw_events` status is updated to "FAILED"
     - Aggregates remain consistent (only counting fully processed events)
   - **After processed insert**: If failure occurs after successful insert but before status update, the event is already in `processed_events` and will be counted. The `raw_events` status update may be lost, but this doesn't affect correctness.

3. **Consistency guarantee**: Because aggregates read **only** from `processed_events`, partial failures don't corrupt the aggregate data. An event is either fully processed (counted) or not processed (not counted).

4. **Recovery**: Failed events are stored in `failed_events` table and can be manually reviewed or retried. The system doesn't automatically retry, but the idempotency mechanism ensures safe manual retries.

### 4. What would break first at scale and why?

**Primary bottleneck: SQLite write contention**

SQLite uses file-level locking and supports only **one writer at a time**. As concurrent write requests increase:
- Requests will queue and block, causing high latency
- Under heavy load, the single-writer lock becomes a severe bottleneck
- This would manifest as timeouts and degraded API response times

**Secondary issues**:

1. **No connection pooling**: Each request opens a new database connection. Under load, this creates connection overhead and potential resource exhaustion.

2. **Missing indexes**: The `processed_events` table lacks indexes on `client_id` and `timestamp`. Filtered queries (`/aggregates?client_id=X&from=Y&to=Z`) will perform full table scans, becoming slow as data grows.

3. **Unbounded result sets**: The `/events/processed` and `/events/failed` endpoints return up to 100 rows without pagination. As the dataset grows, this becomes inefficient and memory-intensive.

4. **In-memory processing**: Normalization and hashing happen in the application layer. Under high throughput, CPU becomes a bottleneck, especially for hash generation.

5. **No horizontal scaling**: The system is designed for a single process. To scale, you'd need to move to a distributed database (PostgreSQL, MySQL) with proper connection pooling, or implement a message queue (Redis, RabbitMQ) for async processing.

**Recommended fixes for scale**:
- Migrate to PostgreSQL with connection pooling
- Add indexes: `CREATE INDEX idx_client_timestamp ON processed_events(client_id, timestamp)`
- Implement pagination for list endpoints
- Consider async processing with a message queue for high-throughput scenarios

