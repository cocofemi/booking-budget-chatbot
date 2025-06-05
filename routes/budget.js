const express = require("express");
const budgetController = require("../controllers/budgetController");
const chatbotController = require("../controllers/chatbotController");

const router = express.Router();

router.post("/new", budgetController.newSessionBudget);
router.post("/booking/chat", chatbotController.startSession);
router.get("/booking/chat", chatbotController.verifyToken);

module.exports = router;
