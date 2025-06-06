const Session = require("../models/session");
const Booking = require("../models/booking");

const findOrCreateSession = async (sessionId) => {
  let session = await Booking.findOne({ sessionId });
  if (!session) {
    session = await Booking.create({ sessionId });
  }
  return session;
};

const findOrCreateBudget = async (sessionId) => {
  let session = await Session.findOne({ sessionId });
  if (!session) {
    session = await Session.create({ sessionId });
  }
  return session;
};

const updateSessionField = async (sessionId, field, value) => {
  const update = { [field]: value, lastUpdated: new Date() };
  return await Booking.findOneAndUpdate(
    { sessionId },
    { $set: update },
    { new: true }
  );
};

const updateBudgetField = async (sessionId, field, value) => {
  const update = { [field]: value, lastUpdated: new Date() };
  return await Session.findOneAndUpdate(
    { sessionId },
    { $set: update },
    { new: true }
  );
};

const addTicket = async (sessionId, ticket) => {
  return await Booking.findOneAndUpdate(
    { sessionId },
    { $push: { tickets: ticket }, $set: { lastUpdated: new Date() } },
    { new: true }
  );
};

const addExpense = async (sessionId, expense) => {
  return await Booking.findOneAndUpdate(
    { sessionId },
    { $push: { expenses: expense }, $set: { lastUpdated: new Date() } },
    { new: true }
  );
};

const updateSessionStep = async (sessionId, newStep) => {
  return await Booking.findOneAndUpdate(
    { sessionId },
    { $set: { currentStep: newStep, lastUpdated: new Date() } },
    { new: true }
  );
};

module.exports = {
  findOrCreateSession,
  findOrCreateBudget,
  updateSessionField,
  updateBudgetField,
  addTicket,
  addExpense,
  updateSessionStep,
};
