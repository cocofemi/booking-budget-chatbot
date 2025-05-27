const axios = require("axios");
const formatCurrency = require("../utils/generateSummary").formatCurrency;

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function generateContextNote(summaryData) {
  const { grossRevenue, totalExpenses, netProfit, topExpenses, currency } =
    summaryData;

  const messages = [
    {
      role: "system",
      content: `
User is budgeting an event. Here are the figures:
- Gross Revenue: ${formatCurrency(grossRevenue, currency)}
- Total Expenses: ${formatCurrency(totalExpenses, currency)}
- Net Profit: ${formatCurrency(netProfit, currency)}
- Top Expenses: ${topExpenses.join(", ")}

Write a short, friendly analysis (max 60 words). Encourage the user and offer improvement tips if needed.
  `,
    },
  ];

  try {
    const res = await axios.post(
      GROQ_API_URL,
      {
        model: "llama3-70b-8192", // or "mixtral-8x7b-32768"
        messages,
        temperature: 0.7,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.data.choices[0].message.content.trim();
  } catch (err) {
    console.error(
      "Groq summarization failed:",
      err?.response?.data || err.message
    );
    return null;
  }
}

module.exports = { generateContextNote };
