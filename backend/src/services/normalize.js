const normalizeEvent = (raw) => {
  return {
    client_id: raw.source || "unknown",
    metric: raw.payload?.metric || "unknown",
    amount: Number(raw.payload?.amount || 0),
    timestamp: new Date(raw.payload?.timestamp || Date.now()).toISOString()
  };
};

module.exports = { normalizeEvent };
