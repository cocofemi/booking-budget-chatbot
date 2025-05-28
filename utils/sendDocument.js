const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

async function sendDocument(filePath, phoneNumber, filename) {
  const form = new FormData();
  form.append("file", fs.createReadStream(filePath));
  form.append("type", "application/octet-stream");
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
        filename,
        caption: `📄 Your budget summary (${filename})`,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        "Content-Type": "application/json",
      },
    }
  );
}

module.exports = sendDocument;
