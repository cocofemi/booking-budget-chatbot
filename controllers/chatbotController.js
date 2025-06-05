const axios = require("axios");
const Session = require("../models/session");
const {
  findOrCreateSession,
  updateSessionField,
  updateSessionStep,
} = require("../services/services");
const validate = require("../utils/validation");
const generateBookingSummary = require("../utils/generateBookingSummary");

const { makeSafeReply, sendWhatsAppReply } = require("../utils/replyHandler");

const startSession = async (req, res) => {
  const isClient = req.query.source === "client"; // or use req.headers.source

  const sessionId = req.body.sessionId;
  const text = req.body.text;

  const session = await findOrCreateSession(sessionId);

  // Skip welcome_message for client
  if (isClient && session.currentStep === "welcome_message") {
    await updateSessionStep(sessionId, "ask_show_info");
    session.currentStep = "ask_show_info";
  }
  const currentStep = session.currentStep;
  const safeReply = makeSafeReply(res, isClient, sessionId);
  const lowerText = text.trim().toLowerCase();

  // console.log(session);

  if (lowerText === "restart") {
    await safeReply(
      `🔁 Starting over...\n\nWhat artist would you like to book? (Artist Name)`
    );

    await updateSessionStep(sessionId, "ask_show_info");
    await Session.findOneAndUpdate(
      { sessionId },
      {
        completed: false,
      }
    );
    return;
  }

  if (session.completed) {
    const restartMsg = `✅ This session is complete. Type *restart* to begin a new budgeting session.`;
    return await safeReply(restartMsg);
  }

  switch (currentStep) {
    case "welcome_message":
      await updateSessionField(sessionId, "name", text);
      await updateSessionStep(sessionId, "ask_name");
      await safeReply(
        `👋 Hi there! I’m a Budget booking assistant. Let’s get started with .\n\nWhat’s your name?`
      );
      break;

    case "ask_show_info":
      await updateSessionField(sessionId, "artist", text);
      await updateSessionStep(sessionId, "ask_venue_infomation");
      await safeReply(`What dates are you looking to book for? \n
        And how many shows would they perform at?`);
      break;

    case "ask_venue_infomation":
      await updateSessionField(sessionId, "showDetails", text);
      await updateSessionStep(sessionId, "ask_show_specifics");
      await safeReply(
        `Can you provide the country, city and venue the artist would be performing at?`
      );
      break;

    case "ask_show_specifics":
      await updateSessionField(sessionId, "venueInformation", text);
      await updateSessionStep(sessionId, "ask_show_terms");
      await safeReply(`Awesome! \n
           Let's move on to specific information regarding the show \n           
           Who is the proposed headline/second/opener sponsors would be ?\n
           When the doors of the show would be open? \n
           What time you would like ${session?.artist} to performance \n
           What are the ages of attendees to this show? \n
           If any other acts are scheduled to perform what are their name? \n
           (i.e We have xyz as our headline sponsor, doors open at 12,
           artist perform at 3pm, attendees 18-45, other acts to be announced )? \n `);
      break;

    case "ask_show_terms":
      await updateSessionField(sessionId, "showSpecifics", text);
      await updateSessionStep(sessionId, "ask_promoter_info");
      await safeReply(`Thanks for your reply! \n
        Now lets get to the financial bits. \n
        How much are you offering for the artist($/£/€)? \n
        What are the ticket prices for the event? \n
        Any declared sponsors? \n
        Any additional terms the artist should know about?`);
      break;

    case "ask_promoter_info":
      await updateSessionField(sessionId, "showTerms", text);
      await updateSessionStep(sessionId, "end_conversation");
      await safeReply(`Finally we need your information \n
        What is your email? \n
        What is your company name? \n
        What is your phone number? \n
        What is your address? \n
        What country are you based?`);
      break;

    case "end_conversation":
      await updateSessionField(sessionId, "promoterInformation", text);
      await updateSessionField(sessionId, "completed", true);
      const sessionUpdate = await findOrCreateSession(sessionId);
      const bookingSummary = await generateBookingSummary(sessionUpdate);
      await sendWhatsAppReply(process.env.phoneNumber, bookingSummary);

      await safeReply(`Thanks for your enquiry we would be in touch soon.\n
          As you are aware, there are many details that go into booking an artist so please understand that this booking form serves as an invitation only. \n
          This does not constitute a confirmation of the artist appearance or performance. \n
          It will assist us in making the best decision possible while doing all that we can to meet your request. \n
          🔁 *Would you like to do any of the following?*
          - Type *restart* to start over`);
      break;
    default:
      await safeReply(
        `🤖 I didn’t quite understand that. Type *restart* to begin again.`
      );
  }
};

const verifyToken = (req, res) => {
  const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("✅ Webhook verified");
    return res.status(200).send(challenge);
  }

  res.sendStatus(403);
};

module.exports = {
  startSession,
  verifyToken,
};
