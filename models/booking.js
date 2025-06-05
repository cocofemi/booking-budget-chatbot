const mongoose = require("mongoose");

const BookingSchema = new mongoose.Schema({
  sessionId: { type: String, required: true, unique: true },
  currentStep: { type: String, default: "welcome_message" },
  artist: String,
  promoterInformation: String,
  venueInformation: String,
  showDetails: String,
  showSpecifics: String,
  showTerms: String,
  other: String,
  completed: { type: Boolean, default: false },
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Booking", BookingSchema);
