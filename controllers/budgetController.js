const Session = require("../models/session");
const generateSummary = require("../utils/generateSummary");
const generateContextNote = require("../utils/generateContext");
const generatePdf = require("../utils/generatePdf");
const generateExcel = require("../utils/generateExcel");
const uploadFileToCloudinary = require("../utils/uploadFile");
const {
  findOrCreateSession,
  updateSessionField,
} = require("../services/services");

const newSessionBudget = async (req, res) => {
  const {
    sessionId,
    name,
    email,
    artist,
    location,
    venue,
    date,
    capacity,
    currency,
    tickets,
    expenses,
  } = req.body;

  try {
    const newBudget = new Session({
      phoneNumber: sessionId,
      name,
      email,
      artist,
      location,
      venue,
      date,
      capacity,
      currency,
      ticketCount: tickets.length,
      tickets,
      expenses,
    });

    await newBudget.save();

    const session = await findOrCreateSession(sessionId);

    const summary = generateSummary.generateSummary(session);
    const aiInsight = await generateContextNote.generateContextNote(summary);

    await updateSessionField(sessionId, "summary", {
      grossRevenue: summary.grossRevenue,
      totalExpenses: summary.totalExpenses,
      netProfit: summary.netProfit,
      topExpenses: summary.topExpenses,
      aiInsight,
    });

    const updatedSession = await findOrCreateSession(sessionId);

    // Generate and upload files
    const [pdfPath, excelPath] = await Promise.all([
      generatePdf(updatedSession),
      generateExcel(updatedSession),
    ]);

    const [pdfFileUrl, excelFileUrl] = await Promise.all([
      uploadFileToCloudinary(pdfPath, `${sessionId}`),
      uploadFileToCloudinary(excelPath, `${sessionId}`),
    ]);

    res.status(201).json({
      status: 1,
      message: "New budget created successfully",
      data: {
        name: updatedSession?.name,
        email: updatedSession?.email,
        artist: updatedSession?.artist,
        location: updatedSession?.location,
        venue: updatedSession?.venue,
        date: updatedSession?.date,
        capacity: updatedSession?.capacity,
        currency: updatedSession?.currency,
        // tickets: updatedSession?.tickets,
        // expenses: updatedSession?.expenses,
        summary: updatedSession?.summary,
      },
      pdf: pdfFileUrl,
      excel: excelFileUrl,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Something went wrong", error });
  }
};

module.exports = { newSessionBudget };
