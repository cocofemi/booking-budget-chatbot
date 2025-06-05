const axios = require("axios");
const formatCurrency = require("./generateSummary").formatCurrency;

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

async function generateContextNote(session) {
  const { artist, showDetails, showSpecifics, showTerms, promoterInformation } =
    session;

  const messages = [
    {
      role: "system",
      content: `You are a professional virtual assistant preparing a formal summary for a talent agent or artist management team regarding a booking enquiry.

The user is trying to book an artist for an upcoming event. Use the details provided below to create a clear, concise, and professional summary message. Avoid using unnecessary symbols or overly casual tone.

Include:
- A brief introduction stating the intent to book the artist
- Key event/show details
- Any relevant terms or requirements
- Promoter contact information

Details:
- Artist: ${artist}
- Show Details: ${showDetails}
- Show Specifics: ${showSpecifics}
- Show Terms: ${showTerms}
- Promoter Information: ${promoterInformation}
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

module.exports = generateContextNote;
