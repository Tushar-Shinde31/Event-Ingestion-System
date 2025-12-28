const crypto = require("crypto");

const generateEventHash = (event) => {
  const data = `${event.client_id}|${event.metric}|${event.amount}|${event.timestamp}`;
  return crypto.createHash("sha256").update(data).digest("hex");
};

module.exports = { generateEventHash };
