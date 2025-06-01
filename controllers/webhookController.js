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
const generateExcel = require("../utils/generateExcel");
const sendDocument = require("../utils/sendDocument");
const { makeSafeReply } = require("../utils/replyHandler");
const uploadFileToCloudinary = require("../utils/uploadFile");

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

// const getNextStep = (currentStep) => {
//   const index = STATES.indexOf(currentStep);
//   return index < STATES.length - 1 ? STATES[index + 1] : "show_summary";
// };

const startSession = async (req, res) => {
  const isClient = req.query.source === "client"; // or use req.headers.source
  const entry = req.body.entry?.[0];
  const message = entry?.changes?.[0]?.value?.messages?.[0];
  const phoneNumber = isClient ? req.body.sessionId : message?.from;
  const text = isClient ? req.body.text : message?.text?.body;

  console.log(req.body);

  //   if (!message || !phoneNumber) {
  //     return res.sendStatus(200); // skip if not a message
  //   }

  const session = await findOrCreateSession(phoneNumber);

  // Skip welcome_message for client
  if (isClient && session.currentStep === "welcome_message") {
    await updateSessionStep(phoneNumber, "ask_name");
    session.currentStep = "ask_name"; // so switch() enters correct case
  }
  const currentStep = session.currentStep;

  //   let hasResponded = false;

  //   const safeReply = async (msg) => {
  //     if (!hasResponded) {
  //       await sendReply(phoneNumber, msg);
  //       res.sendStatus(200);
  //       hasResponded = true;
  //     }
  //   };
  const safeReply = makeSafeReply(res, isClient, phoneNumber);

  let reply = "";
  const lowerText = text.trim().toLowerCase();

  if (lowerText === "restart") {
    // await safeReply(
    //   `✅ Give me one second while I generate your budget summary PDF...`
    // );
    await safeReply(
      `🔁 Starting over...\n\nWho are you booking? (Artist Name)`
    );

    await updateSessionStep(phoneNumber, "ask_artist");
    await Session.findOneAndUpdate(
      { phoneNumber },
      {
        tickets: [],
        expenses: [],
        summary: {},
        currentTicketIndex: 0,
        currentExpenseIndex: 0,
        completed: false,
      }
    );

    // await safeReply(`Who are you booking? (Artist Name)`);
    return;
  }

  if (["pdf", "excel"].includes(lowerText)) {
    if (!session.completed || !session.summary) {
      safeReply(
        `📄 You can only request a PDF after completing the budget session. Type *restart* to begin.`
      );
      //   return await sendReply(phoneNumber, reply, res);
    }
    try {
      await updateSessionField(phoneNumber, "formatChoice", lowerText);
      //   await safeReply(
      //     `✅ Give me one second while I generate your budget summary PDF...`
      //   );
      //   reply = `✅ Give me one second while I generate your budget summary PDF...`;
      //   await sendReply(phoneNumber, reply, res);
      if (lowerText === "pdf") {
        // await safeReply("✅ Generating your PDF...");
        const pdfPath = await generatePdf(session);

        const fileUrl = await uploadFileToCloudinary(pdfPath, `${phoneNumber}`);

        if (isClient) {
          console.log("does this work");
          return await safeReply({
            reply: `✅ Generating your PDF...\n\n✅ Done! Want this in Excel instead? Type *excel* to get a spreadsheet.\nOr type *restart* to begin a new session.`,
            fileUrl,
            fileType: "pdf",
          });
        }

        await sendDocument(pdfPath, phoneNumber, "event-budget-summary.pdf");
        // await sendReply(
        //   phoneNumber,
        //   `✅ Done! Want this in Excel instead? Type *excel* to get a spreadsheet.\nOr type *restart* to begin a new session.`
        // );
      } else {
        // await safeReply("✅ Generating your Excel sheet...");
        const excelPath = await generateExcel(session); // You’ll build this

        const fileUrl = await uploadFileToCloudinary(
          excelPath,
          `session_${phoneNumber}`
        );

        if (isClient) {
          return await safeReply({
            reply: `✅ Generating your Excel sheet...\n\n✅ Done! Want a PDF version instead? Type *pdf* to get one.\nOr type *restart* to start fresh.`,
            fileUrl,
            fileType: "xlsx",
          });
        }

        await sendDocument(excelPath, phoneNumber, "event-budget-summary.xlsx");

        // await sendReply(
        //   phoneNumber,
        //   `✅ Done! Want a PDF version instead? Type *pdf* to get one.\nOr type *restart* to start fresh.`
        // );
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      return await safeReply(
        `❌ Something went wrong while generating your PDF. Please try again.`
      );
    }
  }

  if (session.completed) {
    const restartMsg = `✅ This session is complete. Type *restart* to begin a new budgeting session.`;
    return await safeReply(phoneNumber, restartMsg, res);
  }

  switch (currentStep) {
    case "welcome_message":
      await updateSessionField(phoneNumber, "name", text);
      await updateSessionStep(phoneNumber, "ask_name");
      await safeReply(
        `👋 Hi there! I’m a Budget booking assistant, your event budgeting assistant. Let’s get started with your event budget planning.\n\nWhat’s your name?`
      );
      break;

    case "ask_name":
      await updateSessionField(phoneNumber, "name", text);
      await updateSessionStep(phoneNumber, "ask_email");
      await safeReply(`Thanks ${text}! What’s your email address?`);
      break;

    case "ask_email":
      if (!validate.isValidEmail(text)) {
        await safeReply(`❌ Please enter a valid email address.`);
        break;
      }
      await updateSessionField(phoneNumber, "email", text);
      await updateSessionStep(phoneNumber, "ask_artist");
      await safeReply(`Great! Who are you booking? (Artist Name)`);
      break;

    case "ask_artist":
      await updateSessionField(phoneNumber, "artist", text);
      await updateSessionStep(phoneNumber, "ask_location");
      await safeReply(`Awesome. What city will the event take place?`);
      break;

    case "ask_location":
      await updateSessionField(phoneNumber, "location", text);
      await updateSessionStep(phoneNumber, "ask_venue");
      await safeReply(`What’s the name of the venue?`);
      break;

    case "ask_venue":
      await updateSessionField(phoneNumber, "venue", text);
      await updateSessionStep(phoneNumber, "ask_date");
      await safeReply(`What’s the date of the event? (e.g. 2025-07-13)`);
      break;

    case "ask_date":
      await updateSessionField(phoneNumber, "date", text);
      await updateSessionStep(phoneNumber, "ask_capacity");
      await safeReply(
        `What’s the expected capacity of the venue (e.g. 2000, 50000)?`
      );
      break;

    case "ask_capacity":
      await updateSessionField(phoneNumber, "capacity", parseInt(text));
      await updateSessionStep(phoneNumber, "ask_currency");
      await safeReply(
        `What currency are you budgeting in? (e.g. NGN, USD, GBP)`
      );
      break;

    case "ask_currency":
      await updateSessionField(phoneNumber, "currency", text.toUpperCase());
      await updateSessionStep(phoneNumber, "ask_ticket_count");
      await safeReply(`How many ticket tiers will you sell (e.g. 2, 3, 1) ?`);
      break;

    // ask_ticket_count: set the total number of ticket tiers
    case "ask_ticket_count": {
      if (!validate.isValidPositiveInteger(text)) {
        await safeReply(
          `❌ Please enter a valid number of ticket tiers. For example: 1, 2, 3.`
        );
        break;
      }
      await updateSessionField(phoneNumber, "ticketCount", parseInt(text));
      await updateSessionField(phoneNumber, "currentTicketIndex", 0);
      await updateSessionStep(phoneNumber, "ask_ticket_details");
      await safeReply(
        `Let’s start entering ticket details. What’s the name of ticket tier #1?`
      );
      break;
    }

    // ask_ticket_details: get the name of the current ticket tier
    case "ask_ticket_details": {
      const index = session.currentTicketIndex || 0;
      await updateSessionField(phoneNumber, `tickets.${index}.name`, text);
      await updateSessionStep(phoneNumber, "ask_ticket_price");

      await safeReply(`What’s the price for *${text}* (e.g. 50, 100)?`);
      break;
    }

    // ask_ticket_price: get the price for current ticket tier
    case "ask_ticket_price": {
      if (!validate.isValidPositiveInteger(text)) {
        await safeReply(
          `❌ Please enter a valid number of ticket price. e.g. 50, 100, 200.`
        );
        break;
      }
      const index = session.currentTicketIndex;
      const ticketName = session.tickets[index].name || text;

      const price = parseFloat(text);
      if (isNaN(price)) {
        await safeReply(
          `❌ Please enter a valid price for ${ticketName} (e.g. 100)`
        );
        break;
      }

      await updateSessionField(phoneNumber, `tickets.${index}.price`, price);
      await updateSessionStep(phoneNumber, "ask_ticket_quantity");

      await safeReply(
        `How many *${ticketName}* tickets are you selling (e.g. 100, 500, 3000)?`
      );
      break;
    }

    // ask_ticket_quantity: get the quantity, then loop or move to expenses
    case "ask_ticket_quantity": {
      const index = session.currentTicketIndex;
      const ticket = session.tickets?.[index];
      const quantity = parseInt(text);
      if (isNaN(quantity)) {
        await safeReply(
          `❌ Please enter a valid number of tickets for ${
            ticket?.name || "this tier"
          } (e.g. 200)`
        );
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
        await safeReply(`What’s the name of ticket tier #${nextIndex + 1}?`);
      } else {
        console.log("✅ All tickets complete. Moving to expenses.");
        await updateSessionStep(phoneNumber, "ask_expenses");
        await safeReply(
          `✅ Great! Now let’s go through expenses.\nWhat’s your cost for: ${expenseLabels[0]}?`
        );
      }

      break;
    }

    case "ask_expenses": {
      const index = session.currentExpenseIndex;
      const label = expenseLabels[index];

      if (isNaN(text) || !validate.isValidFloat(text)) {
        await safeReply(
          `❌ Please enter a valid amount for ${label} (e.g. 1000, 5000).`
        );
        break;
      }

      await addExpense(phoneNumber, { label, amount: parseFloat(text) });

      if (index + 1 < expenseLabels.length) {
        await updateSessionField(phoneNumber, "currentExpenseIndex", index + 1);
        await safeReply(
          `Next: What’s your cost for: ${expenseLabels[index + 1]}?`
        );
      } else {
        await updateSessionStep(phoneNumber, "show_summary");
        //await safeReply(`Thanks! Generating your budget summary...`);

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

        await safeReply(
          `Thanks! Generating your budget summary...\n\n
          ${summary.summaryText}
            🤖 *Insight from Budget booking assistant:*
            ${aiInsight}

            🔁 *Would you like to do any of the following?*
            - Type *restart* to start over
            - Type *pdf* to download your budget summary as a PDF or excel to download as an Excel sheet.`.trim()
        );
      }
      break;
    }
    default:
      await safeReply(
        `🤖 I didn’t quite understand that. Type *restart* to begin again.`
      );
  }

  //await updateSessionStep(phoneNumber, getNextStep(currentStep));
  // Send response to user via Meta API
  //   sendReply(phoneNumber, reply, res);
};

// const sendReply = async (phoneNumber, reply, res) => {
//   await axios.post(
//     `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
//     {
//       messaging_product: "whatsapp",
//       to: phoneNumber,
//       text: { body: reply },
//     },
//     {
//       headers: {
//         Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
//         "Content-Type": "application/json",
//       },
//     }
//   );
// };

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
