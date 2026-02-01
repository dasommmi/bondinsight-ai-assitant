const express = require("express");
const cors = require("cors");
const multer = require("multer");
const axios = require("axios");
const fs = require("fs");
const FormData = require("form-data");

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const UPSTAGE_KEY = process.env.UPSTAGE_API_KEY;
if (!UPSTAGE_KEY) {
  console.error("❌ UPSTAGE_API_KEY is missing");
  process.exit(1);
}

/* ---------- Helper: chunk / keyword scan ---------- */
function chunkText(text, chunkSize = 2000) {
  const chunks = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

const KEYWORDS = [
  "maturity", "coupon", "interest rate", "call option", "put option",
  "credit rating", "default", "risk factors", "fees", "benchmark",
  "duration", "fund", "prospectus", "bond"
];

function hasKeywords(text) {
  const lower = text.toLowerCase();
  return KEYWORDS.some((k) => lower.includes(k));
}

/* ---------- 1. PDF → TEXT (Document Digitization) ---------- */
app.post("/parse", upload.single("file"), async (req, res) => {
  console.log("🚀 /parse called");

  try {
    const form = new FormData();
    form.append("document", fs.createReadStream(req.file.path));
    form.append("output_formats", JSON.stringify(["html", "text"]));
    form.append("base64_encoding", JSON.stringify(["table"]));
    form.append("ocr", "always"); // 강제 OCR
    form.append("coordinates", "true");
    form.append("model", "document-parse");

    const response = await axios.post(
        "https://api.upstage.ai/v1/document-digitization",
        form,
        {
          headers: {
            Authorization: `Bearer ${UPSTAGE_KEY}`,
            ...form.getHeaders()
          }
        }
    );

    fs.unlink(req.file.path, () => {});

    const text = response.data.text || "";
    const html = response.data.html || "";

    // fallback: text가 비어있으면 html에서 텍스트 추출
    let finalText = text;
    if (!finalText || finalText.trim().length === 0) {
      finalText = html.replace(/<[^>]+>/g, " ");
    }

    console.log("parse response: text length =", finalText.length);
    res.json({ text: finalText });
  } catch (e) {
    console.log("parse error:", e.response?.data || e.message);
    res.status(500).json({
      error: "PDF parsing failed",
      detail: e.response?.data || e.message
    });
  }
});

/* ---------- helper: LLM call (Chat Completions) ---------- */
const callChat = async (messages) => {
  const response = await axios.post(
      "https://api.upstage.ai/v1/chat/completions",
      {
        model: "solar-pro3",
        messages
      },
      {
        headers: {
          Authorization: `Bearer ${UPSTAGE_KEY}`
        }
      }
  );

  return response.data.choices?.[0]?.message?.content || "";
};

/* ---------- 2. TEXT → STRUCTURED DATA (LLM 기반) ---------- */
app.post("/extract", async (req, res) => {
  try {
    const { text, documentType } = req.body;

    console.time("extract_total");

    // 1) 텍스트 chunk로 분할
    const chunks = chunkText(text, 2000);

    // 2) 키워드가 있는 chunk만 골라서 최대 4개만 사용
    const relevantChunks = chunks.filter(hasKeywords).slice(0, 4);
    const relevantText = relevantChunks.join("\n\n");

    // 3) 관련 텍스트가 없으면 전체 텍스트 fallback
    const finalText = relevantText.length > 200 ? relevantText : text;

    const response = await axios.post(
        "https://api.upstage.ai/v1/chat/completions",
        {
          model: "solar-pro3",
          messages: [
            {
              role: "system",
              content:
                  "You are a financial data extraction agent. Extract the following JSON: bond_terms and fund_terms. If not present, return null. Do NOT hallucinate."
            },
            {
              role: "user",
              content: `
DOCUMENT TYPE: ${documentType || "Unknown"}

Extract:
1) bond_terms:
   - maturity
   - coupon
   - call_put
   - credit_risk
   - loss_scenarios

2) fund_terms:
   - strategy
   - duration_risk
   - fees
   - benchmark
   - key_risks

TEXT:
${finalText}
`
            }
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "bond_fund_schema",
              schema: {
                type: "object",
                properties: {
                  bond_terms: {
                    type: ["object", "null"],
                    properties: {
                      maturity: { type: ["string", "null"] },
                      coupon: { type: ["string", "null"] },
                      call_put: { type: ["string", "null"] },
                      credit_risk: { type: ["string", "null"] },
                      loss_scenarios: { type: ["string", "null"] }
                    }
                  },
                  fund_terms: {
                    type: ["object", "null"],
                    properties: {
                      strategy: { type: ["string", "null"] },
                      duration_risk: { type: ["string", "null"] },
                      fees: { type: ["string", "null"] },
                      benchmark: { type: ["string", "null"] },
                      key_risks: { type: ["string", "null"] }
                    }
                  }
                }
              }
            }
          }
        },
        {
          headers: {
            Authorization: `Bearer ${UPSTAGE_KEY}`
          }
        }
    );

    const content = response.data.choices?.[0]?.message?.content;
    console.log("extract content:", JSON.stringify(content, null, 2));

    let extracted = content;
    if (typeof content === "string") {
      try {
        extracted = JSON.parse(content);
      } catch {
        extracted = { raw: content };
      }
    }

    // null이면 fallback: 전체 텍스트로 재추출 (1회만)
    if (extracted.bond_terms === null && extracted.fund_terms === null && finalText !== text) {
      console.log("Fallback: re-extract using full text");

      const fallbackResp = await axios.post(
          "https://api.upstage.ai/v1/chat/completions",
          {
            model: "solar-pro3",
            messages: [
              {
                role: "system",
                content:
                    "You are a financial data extraction agent. Extract the following JSON: bond_terms and fund_terms. If not present, return null. Do NOT hallucinate."
              },
              {
                role: "user",
                content: `
DOCUMENT TYPE: ${documentType || "Unknown"}

Extract:
1) bond_terms:
   - maturity
   - coupon
   - call_put
   - credit_risk
   - loss_scenarios

2) fund_terms:
   - strategy
   - duration_risk
   - fees
   - benchmark
   - key_risks

TEXT:
${text}
`
              }
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "bond_fund_schema",
                schema: {
                  type: "object",
                  properties: {
                    bond_terms: {
                      type: ["object", "null"],
                      properties: {
                        maturity: { type: ["string", "null"] },
                        coupon: { type: ["string", "null"] },
                        call_put: { type: ["string", "null"] },
                        credit_risk: { type: ["string", "null"] },
                        loss_scenarios: { type: ["string", "null"] }
                      }
                    },
                    fund_terms: {
                      type: ["object", "null"],
                      properties: {
                        strategy: { type: ["string", "null"] },
                        duration_risk: { type: ["string", "null"] },
                        fees: { type: ["string", "null"] },
                        benchmark: { type: ["string", "null"] },
                        key_risks: { type: ["string", "null"] }
                      }
                    }
                  }
                }
              }
            }
          },
          {
            headers: {
              Authorization: `Bearer ${UPSTAGE_KEY}`
            }
          }
      );

      const fallbackContent = fallbackResp.data.choices?.[0]?.message?.content;
      extracted = typeof fallbackContent === "string" ? JSON.parse(fallbackContent) : fallbackContent;
    }

    console.timeEnd("extract_total");
    res.json(extracted);
  } catch (e) {
    console.log("extract error:", e.response?.data || e.message);
    res.status(500).json({
      error: "Information extraction failed",
      detail: e.response?.data || e.message
    });
  }
});

/* ---------- 3. DOCUMENT TYPE CLASSIFICATION ---------- */
app.post("/solar/classify", async (req, res) => {
  const { text } = req.body;

  const messages = [
    {
      role: "system",
      content:
          "You are a financial AI agent. Classify the document type. Return ONLY one: Bond Prospectus / Bond Index Fund Prospectus"
    },
    {
      role: "user",
      content: text.slice(0, 3000)
    }
  ];

  const result = await callChat(messages);
  res.json({ documentType: result.trim() });
});

/* ---------- 4. RISK-FIRST SUMMARY ---------- */
app.post("/solar/summary", async (req, res) => {
  const { extracted, documentType } = req.body;

  const messages = [
    {
      role: "system",
      content:
          "You are BondInsight Solar Agent. Summarize from a FRONT-OFFICE DEALER perspective. Rules: Risks first, No marketing tone, Focus on downside"
    },
    {
      role: "user",
      content: `Document Type: ${documentType}\n\nBond Terms:\n${JSON.stringify(extracted.bond_terms, null, 2)}\n\nFund Terms:\n${JSON.stringify(extracted.fund_terms, null, 2)}`
    }
  ];

  const summary = await callChat(messages);
  res.json({ summary });
});

/* ---------- 5. WORST CASE SCENARIO ---------- */
app.post("/solar/worst-case", async (req, res) => {
  const { extracted, documentType } = req.body;

  const messages = [
    {
      role: "system",
      content:
          "You are a financial risk analysis AI Agent. Simulate worst-case scenarios. Do NOT recommend investments."
    },
    {
      role: "user",
      content: `Document Type: ${documentType}\n\nBond Terms:\n${JSON.stringify(extracted.bond_terms, null, 2)}\n\nFund Terms:\n${JSON.stringify(extracted.fund_terms, null, 2)}\n\nScenario:\n- Rapid interest rate hike\n- Credit spread widening\n- Liquidity stress\n\nExplain:\n1. What breaks first\n2. Potential loss drivers\n3. Who should be cautious`
    }
  ];

  const worstCase = await callChat(messages);
  res.json({ worstCase });
});

app.listen(3001, () => {
  console.log("Server running on http://localhost:3001");
});
