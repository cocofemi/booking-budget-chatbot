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
  phoneNumber: { type: String, required: true, unique: true },
  currentStep: { type: String, default: "welcome_message" },
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
  currentTicketIndex: { type: Number, default: 0 },
  currentExpenseIndex: { type: Number, default: 0 },
  summary: {
    grossRevenue: Number,
    totalExpenses: Number,
    netProfit: Number,
    topExpenses: [String],
    aiInsight: String,
  },
  completed: { type: Boolean, default: false },

  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Session", SessionSchema);
