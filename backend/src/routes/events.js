const express = require("express");
const router = express.Router();
const { ingestEvent, getProcessedEvents, getFailedEvents } = require("../controllers/eventController");

router.post("/", ingestEvent);
router.get("/processed", getProcessedEvents);
router.get("/failed", getFailedEvents);

module.exports = router;
