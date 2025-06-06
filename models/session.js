const mongoose = require("mongoose");

const TicketSchema = new mongoose.Schema({
  name: String,
  price: Number,
  quantity: Number,
});

const ExpenseSchema = new mongoose.Schema({
  label: String,
  amount: Number,
});

const SessionSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  name: String,
  email: String,
  artist: String,
  location: String,
  venue: String,
  date: String,
  capacity: Number,
  currency: String,
  ticketCount: Number,
  tickets: [TicketSchema],
  expenses: [ExpenseSchema],
  summary: {
    grossRevenue: Number,
    totalExpenses: Number,
    netProfit: Number,
    topExpenses: [String],
    aiInsight: String,
  },

  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Session", SessionSchema);
