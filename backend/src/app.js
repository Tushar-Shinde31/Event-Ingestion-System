const express = require("express");
const eventRoutes = require("./routes/events");
const { getAggregates } = require("./controllers/aggregateController");

const app = express();

// CORS middleware
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

app.use("/events", eventRoutes);
app.get("/aggregates", getAggregates);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
