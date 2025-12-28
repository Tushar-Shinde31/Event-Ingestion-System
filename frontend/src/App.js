import React, { useState, useEffect } from 'react';
import './App.css';

const API_BASE = 'http://localhost:3000';

function App() {
  const [eventPayload, setEventPayload] = useState('{"source": "client1", "payload": {"metric": "purchase", "amount": 100, "timestamp": "' + new Date().toISOString() + '"}}');
  const [simulateFailure, setSimulateFailure] = useState(false);
  const [processedEvents, setProcessedEvents] = useState([]);
  const [failedEvents, setFailedEvents] = useState([]);
  const [aggregates, setAggregates] = useState({ total_count: 0, total_amount: 0 });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');


  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    try {
  
      const processedRes = await fetch(`${API_BASE}/events/processed`);
      const processed = await processedRes.json();
      setProcessedEvents(processed);

      const failedRes = await fetch(`${API_BASE}/events/failed`);
      const failed = await failedRes.json();
      setFailedEvents(failed);

      const aggRes = await fetch(`${API_BASE}/aggregates`);
      const agg = await aggRes.json();
      setAggregates(agg);
    } catch (error) {
      console.error('Failed to refresh data:', error);
      setMessage('Failed to refresh data');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let payload;
      try {
        payload = JSON.parse(eventPayload);
      } catch (e) {
        setMessage('Invalid JSON format');
        setLoading(false);
        return;
      }

      const body = simulateFailure ? { ...payload, simulateFailure: true } : payload;

      const response = await fetch(`${API_BASE}/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Event submitted successfully');
        // Refresh data after successful submission
        setTimeout(() => {
          refreshData();
        }, 500);
      } else {
        setMessage(data.error || 'Failed to submit event');
      }
    } catch (error) {
      setMessage('Error submitting event: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header>
        <h1>Event Ingestion System</h1>
      </header>

      <main>
        <section className="section">
          <h2>Submit Event</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="eventPayload">Event JSON:</label>
              <textarea
                id="eventPayload"
                value={eventPayload}
                onChange={(e) => setEventPayload(e.target.value)}
                rows={5}
                style={{ width: '100%', fontFamily: 'monospace' }}
              />
            </div>
            <div className="form-group">
              <label>
                <input
                  type="checkbox"
                  checked={simulateFailure}
                  onChange={(e) => setSimulateFailure(e.target.checked)}
                />
                Simulate failure
              </label>
            </div>
            <div className="form-group">
              <button type="submit" disabled={loading}>
                {loading ? 'Submitting...' : 'Submit Event'}
              </button>
              <button type="button" onClick={refreshData} style={{ marginLeft: '10px' }}>
                Refresh Results
              </button>
            </div>
            {message && <div className="message">{message}</div>}
          </form>
        </section>

        <section className="section">
          <h2>Aggregated Results</h2>
          <div className="aggregates">
            <div className="aggregate-item">
              <strong>Total Count:</strong> {aggregates.total_count}
            </div>
            <div className="aggregate-item">
              <strong>Total Amount:</strong> {aggregates.total_amount}
            </div>
          </div>
        </section>

        <section className="section">
          <h2>Successfully Processed Events</h2>
          <div className="events-list">
            {processedEvents.length === 0 ? (
              <p>No processed events yet</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Client ID</th>
                    <th>Metric</th>
                    <th>Amount</th>
                    <th>Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {processedEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{event.id}</td>
                      <td>{event.client_id}</td>
                      <td>{event.metric}</td>
                      <td>{event.amount}</td>
                      <td>{new Date(event.timestamp).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="section">
          <h2>Failed / Rejected Events</h2>
          <div className="events-list">
            {failedEvents.length === 0 ? (
              <p>No failed events</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Error Message</th>
                    <th>Raw Payload</th>
                    <th>Created At</th>
                  </tr>
                </thead>
                <tbody>
                  {failedEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{event.id}</td>
                      <td>{event.error_message}</td>
                      <td>
                        <pre style={{ fontSize: '12px', maxWidth: '300px', overflow: 'auto' }}>
                          {event.raw_payload}
                        </pre>
                      </td>
                      <td>{new Date(event.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;

