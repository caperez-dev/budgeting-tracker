import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  } catch (err) {
    console.error("Failed to initialize GoogleGenAI client:", err);
    return null;
  }
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// AI: Parse natural-language transaction
app.post("/api/ai/parse-transaction", async (req, res) => {
  const { text, categories } = req.body;
  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Missing text input" });
    return;
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      const categoryList = (categories || [])
        .map((c: any) => `${c.id} (${c.name}, ${c.type})`)
        .join("; ");

      const prompt = `Parse this personal finance transaction entry into structured JSON:
Input: "${text}"

Available categories:
${categoryList || "None"}

Current date context: ${new Date().toISOString().split("T")[0]}

Extract:
1. type: "income" or "expense"
2. amount: positive number
3. categoryId: match closest category ID from available categories, or leave empty if none
4. note: brief description/merchant/detail
5. date: YYYY-MM-DD (defaults to today if not specified)
6. time: 12-hour format e.g. "2:30 PM" or "8:15 AM" (defaults to current approximate time if not specified)`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              type: { type: Type.STRING, enum: ["income", "expense"] },
              amount: { type: Type.NUMBER },
              categoryId: { type: Type.STRING },
              note: { type: Type.STRING },
              date: { type: Type.STRING },
              time: { type: Type.STRING },
            },
            required: ["type", "amount", "note"],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      res.json({ success: true, transaction: parsed, source: "gemini" });
      return;
    } catch (err) {
      console.warn("Gemini parse failed, falling back to heuristic parser:", err);
    }
  }

  // Fallback heuristic parser if no API key or API call failed
  const lower = text.toLowerCase();
  const isIncome = /salary|wage|earned|got paid|received|gift|bonus|dividend|freelance/i.test(lower);
  const amountMatch = text.match(/(?:[₱$€¥£]|php|usd)?\s*(\d+(?:[.,]\d+)?)/i);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(/,/g, "")) : 0;
  
  // Try to match note
  let note = text.replace(/(?:spent|paid|bought|received|earned|for|on|at|₱|\$|€|¥|£|php|usd|\d+(?:[.,]\d+)?)/gi, " ").trim();
  if (!note) note = isIncome ? "Income" : "Expense";

  // Match category if name in text
  let matchedCategoryId = "";
  if (Array.isArray(categories)) {
    for (const cat of categories) {
      if (lower.includes(cat.name.toLowerCase())) {
        matchedCategoryId = cat.id;
        break;
      }
    }
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  const dateStr = now.toISOString().split("T")[0];

  res.json({
    success: true,
    transaction: {
      type: isIncome ? "income" : "expense",
      amount: amount || 100,
      categoryId: matchedCategoryId,
      note: note.slice(0, 50).trim() || "Transaction",
      date: dateStr,
      time: timeStr,
    },
    source: "heuristic",
  });
});

// AI: Financial Insights & Analysis
app.post("/api/ai/insights", async (req, res) => {
  const { financialContext } = req.body;
  const ai = getGeminiClient();

  if (ai) {
    try {
      const prompt = `You are a sharp, realistic, and encouraging personal finance budget advisor.
Analyze the user's budgeting data and provide 3 to 4 concise, high-value financial observations, alerts, or actionable suggestions.
Keep each insight under 2 sentences, clear, practical, and grounded in the numbers.

User financial overview:
${JSON.stringify(financialContext, null, 2)}

Provide the output in JSON format with an array of insights, where each has:
- title: string (short, crisp header)
- type: "alert" | "tip" | "milestone" | "savings"
- message: string (direct, practical feedback)
- actionableStep: string (one specific step the user can take)`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              insights: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING },
                    message: { type: Type.STRING },
                    actionableStep: { type: Type.STRING },
                  },
                  required: ["title", "type", "message", "actionableStep"],
                },
              },
            },
            required: ["insights"],
          },
        },
      });

      const parsed = JSON.parse(response.text?.trim() || "{}");
      res.json({ success: true, data: parsed });
      return;
    } catch (err) {
      console.warn("Gemini insights failed, falling back:", err);
    }
  }

  // Fallback insights based on simple financial math
  const ctx = financialContext || {};
  const savings = ctx.currentSavings ?? 0;
  const expenses = ctx.totalExpenses ?? 0;
  const debts = ctx.netDebt ?? 0;
  const topCategory = ctx.topExpenseCategory || "Expenses";

  const insights = [];

  if (debts > 0) {
    insights.push({
      title: "Active Debt Priority",
      type: "alert",
      message: `You currently owe ${debts} in net debt. Prioritizing settlement prevents interest and keeps your finances clean.`,
      actionableStep: "Consider allocating a portion of your current cash surplus toward resolving unsettled debts.",
    });
  } else {
    insights.push({
      title: "Debt-Free Buffer",
      type: "milestone",
      message: "You have no outstanding net debt recorded in your tracker. This provides a stable cash flow foundation.",
      actionableStep: "Channel extra income directly into your primary purchase goals.",
    });
  }

  if (savings > 0) {
    insights.push({
      title: "Healthy Cash Surplus",
      type: "savings",
      message: `Your net savings pool sits at ${savings}. Your total obtained income outweighs cumulative expenses.`,
      actionableStep: "Review your purchase goals to earmark funds for target dates.",
    });
  } else {
    insights.push({
      title: "Tight Cash Balance",
      type: "alert",
      message: "Current expenses match or exceed income logged in the tracker.",
      actionableStep: `Audit your ${topCategory} category entries this week to identify flexible spending reductions.`,
    });
  }

  insights.push({
    title: "Spending Concentration",
    type: "tip",
    message: `${topCategory} accounts for a notable share of your expense tracker.`,
    actionableStep: "Log every small transaction with time-stamps to catch impulsive micro-spending.",
  });

  res.json({
    success: true,
    data: {
      summary: "Balanced overview calculated from your local budget records.",
      insights,
    },
  });
});

// AI: Budget Q&A Chat
app.post("/api/ai/chat", async (req, res) => {
  const { message, history, financialContext } = req.body;
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Missing message" });
    return;
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      const systemInstruction = `You are a financial advisor and budgeting companion built directly into the user's Budget Tracker application.
You have access to their real-time financial context:
${JSON.stringify(financialContext || {}, null, 2)}

Guidelines:
1. Provide concise, direct, helpful answers without filler or sales hype.
2. Reference their actual numbers (savings, expenses, goals, debts) when relevant.
3. Keep answers under 3-4 paragraphs or formatted with short markdown bullets.
4. Encourage steady saving habits, responsible debt clearing, and realistic goal dates.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents: [
          ...(Array.isArray(history) ? history.map((h: any) => ({
            role: h.role === "user" ? "user" : "model",
            parts: [{ text: h.text }],
          })) : []),
          { role: "user", parts: [{ text: message }] },
        ],
        config: {
          systemInstruction,
        },
      });

      res.json({
        success: true,
        reply: response.text || "I have analyzed your tracker data. Feel free to ask any question about your spending.",
      });
      return;
    } catch (err) {
      console.warn("Gemini chat failed:", err);
    }
  }

  // Fallback reply
  res.json({
    success: true,
    reply: `Based on your tracker data (Current Savings: ${(financialContext?.currentSavings || 0).toLocaleString()} ${financialContext?.currency || "PHP"}, Total Expenses: ${(financialContext?.totalExpenses || 0).toLocaleString()}): Keep up consistent daily logging. To hit your purchase goals on time, maintain a steady buffer and review non-essential expenses weekly.`,
  });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Budget Tracker server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
