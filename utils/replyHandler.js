// utils/replyHandler.js
const axios = require("axios");

const sendWhatsAppReply = async (phoneNumber, message) => {
  return axios.post(
    `https://graph.facebook.com/v19.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: "whatsapp",
      to: phoneNumber,
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
};

/**
 * Returns a safe reply function that only sends one response (either WhatsApp or JSON)
 */
const makeSafeReply = (res, isClient, phoneNumber) => {
  let hasReplied = false;

  return async (msg) => {
    if (hasReplied) return;
    hasReplied = true;

    if (isClient) {
      res.json(typeof msg === "string" ? { reply: msg } : msg);
    } else {
      const text = typeof msg === "string" ? msg : msg.reply;
      await sendWhatsAppReply(phoneNumber, text);
      return res.sendStatus(200);
    }
  };
};

module.exports = {
  makeSafeReply,
};
