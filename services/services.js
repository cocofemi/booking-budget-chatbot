const Session = require("../models/session");

const findOrCreateSession = async (phoneNumber) => {
  let session = await Session.findOne({ phoneNumber });
  if (!session) {
    session = await Session.create({ phoneNumber });
  }
  return session;
};

const updateSessionField = async (phoneNumber, field, value) => {
  const update = { [field]: value, lastUpdated: new Date() };
  return await Session.findOneAndUpdate(
    { phoneNumber },
    { $set: update },
    { new: true }
  );
};

const addTicket = async (phoneNumber, ticket) => {
  return await Session.findOneAndUpdate(
    { phoneNumber },
    { $push: { tickets: ticket }, $set: { lastUpdated: new Date() } },
    { new: true }
  );
};

const addExpense = async (phoneNumber, expense) => {
  return await Session.findOneAndUpdate(
    { phoneNumber },
    { $push: { expenses: expense }, $set: { lastUpdated: new Date() } },
    { new: true }
  );
};

const updateSessionStep = async (phoneNumber, newStep) => {
  return await Session.findOneAndUpdate(
    { phoneNumber },
    { $set: { currentStep: newStep, lastUpdated: new Date() } },
    { new: true }
  );
};

module.exports = {
  findOrCreateSession,
  updateSessionField,
  addTicket,
  addExpense,
  updateSessionStep,
};
