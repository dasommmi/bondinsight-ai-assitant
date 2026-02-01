const axios = require("axios");

const SOLAR_URL = "https://api.upstage.ai/generate";

async function callSolar(systemPrompt, userPrompt) {
  const response = await axios.post(
    SOLAR_URL,
    {
      prompt: systemPrompt + "\n\n" + userPrompt
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.UPSTAGE_API_KEY}`
      }
    }
  );

  return response.data.text;
}

module.exports = { callSolar };

