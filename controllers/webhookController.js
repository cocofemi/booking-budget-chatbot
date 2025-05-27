const axios = require("axios");
const Session = require("../models/session");
const expenseLabels = require("../utils/expenses");
const generateSummary = require("../utils/generateSummary");
const generateContextNote = require("../utils/generateContext");
const {
  findOrCreateSession,
  updateSessionField,
  updateSessionStep,
  addExpense,
  addTicket,
} = require("../services/services");
const validate = require("../utils/validation");
const generatePdf = require("../utils/generatePdf");
const fs = require("fs");
const FormData = require("form-data");

const STATES = [
  "welcome_message",
  "ask_name",
  "ask_email",
  "ask_artist",
  "ask_location",
  "ask_venue",
  "ask_date",
  "ask_capacity",
  "ask_currency",
  "ask_ticket_count",
  "ask_ticket_details",
  "ask_ticket_price",
  "ask_ticket_quantity",
  "ask_expenses",
  "show_summary",
];

const getNextStep = (currentStep) => {
  const index = STATES.indexOf(currentStep);
  return index < STATES.length - 1 ? STATES[index + 1] : "show_summary";
};

const startSession = async (req, res) => {
  const entry = req.body.entry?.[0];
  const message = entry?.changes?.[0]?.value?.messages?.[0];
  const phoneNumber = message?.from;
  const text = message?.text?.body;

  if (!message || !phoneNumber) {
    return res.sendStatus(200); // skip if not a message
  }

  const session = await findOrCreateSession(phoneNumber);
  const currentStep = session.currentStep;

  let reply = "";
  const lowerText = text.trim().toLowerCase();

  if (lowerText === "restart") {
    await Session.findOneAndUpdate(
      { phoneNumber },
      {
        currentStep: "ask_name",
        tickets: [],
        expenses: [],
        summary: {},
        currentTicketIndex: 0,
        currentExpenseIndex: 0,
        completed: false,
      }
    );

    reply = `🔁 Starting over... What’s your name?`;
    return await sendReply(phoneNumber, reply, res);
  }

  if (lowerText === "pdf") {
    if (!session.completed || !session.summary) {
      reply = `📄 You can only request a PDF after completing the budget session. Type *restart* to begin.`;
      return await sendReply(phoneNumber, reply, res);
    }

    try {
      reply = `✅ Give me one second while I generate your budget summary PDF...`;
      await sendReply(phoneNumber, reply, res);
      const pdfPath = await generatePdf(session);
      const form = new FormData();
      form.append("file", fs.createReadStream(pdfPath));
      form.append("type", "application/pdf");
      form.append("messaging_product", "whatsapp");

      const mediaRes = await axios.post(
        `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/media`,
        form,
        {
          headers: {
            ...form.getHeaders(),
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          },
        }
      );

      const mediaId = mediaRes.data.id;
      await axios.post(
        `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          messaging_product: "whatsapp",
          to: phoneNumber,
          type: "document",
          document: {
            id: mediaId,
            caption: "📄 Your budget summary PDF",
            filename: "event-budget-summary.pdf",
          },
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );
      reply = `✅ This session is complete. Type *restart* to begin a new budgeting session.`;
      return await sendReply(phoneNumber, reply, res);
    } catch (error) {
      console.error("Error generating PDF:", error);
      reply = `❌ Something went wrong while generating your PDF. Please try again.`;
      return sendReply(phoneNumber, reply, res);
    }
  }

  if (session.completed) {
    const restartMsg = `✅ This session is complete. Type *restart* to begin a new budgeting session.`;
    return sendReply(phoneNumber, restartMsg, res);
  }

  switch (currentStep) {
    case "welcome_message":
      await updateSessionField(phoneNumber, "name", text);
      await updateSessionStep(phoneNumber, "ask_name");
      reply = `👋 Hi there! I’m a Budget booking assistant, your event budgeting assistant. Let’s get started with your event budget planning.\n\nWhat’s your name?`;
      break;

    case "ask_name":
      await updateSessionField(phoneNumber, "name", text);
      await updateSessionStep(phoneNumber, "ask_email");
      reply = `Thanks ${text}! What’s your email address?`;
      break;

    case "ask_email":
      if (!validate.isValidEmail(text)) {
        reply = `❌ Please enter a valid email address.`;
        break;
      }
      await updateSessionField(phoneNumber, "email", text);
      await updateSessionStep(phoneNumber, "ask_artist");
      reply = `Great! Who are you booking? (Artist Name)`;
      break;

    case "ask_artist":
      await updateSessionField(phoneNumber, "artist", text);
      await updateSessionStep(phoneNumber, "ask_location");
      reply = `Awesome. What city will the event take place?`;
      break;

    case "ask_location":
      await updateSessionField(phoneNumber, "location", text);
      await updateSessionStep(phoneNumber, "ask_venue");
      reply = `What’s the name of the venue?`;
      break;

    case "ask_venue":
      await updateSessionField(phoneNumber, "venue", text);
      await updateSessionStep(phoneNumber, "ask_date");
      reply = `What’s the date of the event? (e.g. 2025-07-13)`;
      break;

    case "ask_date":
      await updateSessionField(phoneNumber, "date", text);
      await updateSessionStep(phoneNumber, "ask_capacity");
      reply = `What’s the expected capacity of the venue (e.g. 2000, 50000)?`;
      break;

    case "ask_capacity":
      await updateSessionField(phoneNumber, "capacity", parseInt(text));
      await updateSessionStep(phoneNumber, "ask_currency");
      reply = `What currency are you budgeting in? (e.g. NGN, USD, GBP)`;
      break;

    case "ask_currency":
      await updateSessionField(phoneNumber, "currency", text.toUpperCase());
      await updateSessionStep(phoneNumber, "ask_ticket_count");
      reply = `How many ticket tiers will you sell (e.g. 2, 3, 1) ?`;
      break;

    // ask_ticket_count: set the total number of ticket tiers
    case "ask_ticket_count": {
      if (!validate.isValidPositiveInteger(text)) {
        reply = `❌ Please enter a valid number of ticket tiers. For example: 1, 2, 3.`;
        break;
      }
      await updateSessionField(phoneNumber, "ticketCount", parseInt(text));
      await updateSessionField(phoneNumber, "currentTicketIndex", 0);
      await updateSessionStep(phoneNumber, "ask_ticket_details");
      reply = `Let’s start entering ticket details. What’s the name of ticket tier #1?`;
      break;
    }

    // ask_ticket_details: get the name of the current ticket tier
    case "ask_ticket_details": {
      const index = session.currentTicketIndex || 0;
      await updateSessionField(phoneNumber, `tickets.${index}.name`, text);
      await updateSessionStep(phoneNumber, "ask_ticket_price");

      reply = `What’s the price for *${text}* (e.g. 50, 100)?`;
      break;
    }

    // ask_ticket_price: get the price for current ticket tier
    case "ask_ticket_price": {
      if (!validate.isValidPositiveInteger(text)) {
        reply = `❌ Please enter a valid number of ticket price. e.g. 50, 100, 200.`;
        break;
      }
      const index = session.currentTicketIndex;
      const ticketName = session.tickets[index].name || text;

      const price = parseFloat(text);
      if (isNaN(price)) {
        reply = `❌ Please enter a valid price for ${ticketName} (e.g. 100)`;
        break;
      }

      await updateSessionField(phoneNumber, `tickets.${index}.price`, price);
      await updateSessionStep(phoneNumber, "ask_ticket_quantity");

      reply = `How many *${ticketName}* tickets are you selling (e.g. 100, 500, 3000)?`;
      break;
    }

    // ask_ticket_quantity: get the quantity, then loop or move to expenses
    case "ask_ticket_quantity": {
      const index = session.currentTicketIndex;
      const ticket = session.tickets?.[index];
      const quantity = parseInt(text);
      if (isNaN(quantity)) {
        reply = `❌ Please enter a valid number of tickets for ${
          ticket?.name || "this tier"
        } (e.g. 200)`;
        break;
      }

      await updateSessionField(
        phoneNumber,
        `tickets.${index}.quantity`,
        quantity
      );

      const nextIndex = index + 1;
      const ticketCount = session.ticketCount;

      console.log("🎯 Checking if more tickets needed...");
      console.log({ nextIndex, ticketCount });

      console.log(nextIndex < ticketCount);

      if (nextIndex < ticketCount) {
        await updateSessionField(phoneNumber, "currentTicketIndex", nextIndex);
        await updateSessionStep(phoneNumber, "ask_ticket_details");
        reply = `What’s the name of ticket tier #${nextIndex + 1}?`;
      } else {
        console.log("✅ All tickets complete. Moving to expenses.");
        await updateSessionStep(phoneNumber, "ask_expenses");
        reply = `✅ Great! Now let’s go through expenses.\nWhat’s your cost for: ${expenseLabels[0]}?`;
      }

      break;
    }

    case "ask_expenses": {
      const index = session.currentExpenseIndex;
      const label = expenseLabels[index];

      if (isNaN(text) || !validate.isValidFloat(text)) {
        reply = `❌ Please enter a valid amount for ${label} (e.g. 1000, 5000).`;
        break;
      }

      await addExpense(phoneNumber, { label, amount: parseFloat(text) });

      if (index + 1 < expenseLabels.length) {
        await updateSessionField(phoneNumber, "currentExpenseIndex", index + 1);
        reply = `Next: What’s your cost for: ${expenseLabels[index + 1]}?`;
      } else {
        await updateSessionStep(phoneNumber, "show_summary");
        reply = `Thanks! Generating your budget summary...`;

        // Optionally call summary generator here
        const summary = generateSummary.generateSummary(session);
        const aiInsight = await generateContextNote.generateContextNote(
          summary
        );

        await updateSessionField(phoneNumber, "summary", {
          grossRevenue: summary.grossRevenue,
          totalExpenses: summary.totalExpenses,
          netProfit: summary.netProfit,
          topExpenses: summary.topExpenses,
          aiInsight,
        });

        await updateSessionField(phoneNumber, "completed", true);

        reply = `${summary.summaryText}
            🤖 *Insight from Budget booking assistant:*
            ${aiInsight}

            🔁 *Would you like to do any of the following?*
            - Type *restart* to start over
            - Type *pdf* to download your budget summary as a PDF
             `.trim();
      }
      break;
    }
    default:
      reply = `🤖 I didn’t quite understand that. Type *restart* to begin again.`;
  }

  //await updateSessionStep(phoneNumber, getNextStep(currentStep));
  // Send response to user via Meta API
  sendReply(phoneNumber, reply, res);
};

const sendReply = async (phoneNumber, reply, res) => {
  await axios.post(
    `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: phoneNumber,
      text: { body: reply },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );

  res.sendStatus(200);
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
