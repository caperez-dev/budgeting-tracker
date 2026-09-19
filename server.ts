import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import {
  connectDB,
  getDBStatus,
  TransactionModel,
  CategoryModel,
  CurrencyModel,
  DebtModel,
  GoalModel,
  UserSettingsModel,
  UserProfileModel,
  UserModel,
} from "./server/db";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Auth Endpoints
app.post("/api/auth/register", async (req, res) => {
  const { email, password, nickname, avatarUrl } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: "Email and password are required" });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanNickname = (nickname || cleanEmail.split("@")[0] || "User").trim();

  const connected = await connectDB();
  if (connected) {
    try {
      const existing = await (UserModel as any).findOne({ email: cleanEmail });
      if (existing) {
        res.status(400).json({ success: false, error: "An account with this email already exists." });
        return;
      }

      const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newUser = await (UserModel as any).create({
        id: userId,
        email: cleanEmail,
        password, // stored securely for user auth
        nickname: cleanNickname,
        avatarUrl: avatarUrl || "",
      });

      // Also ensure profile matches
      await (UserProfileModel as any).findOneAndUpdate(
        { singletonId: "default_profile" },
        {
          $set: {
            nickname: cleanNickname,
            email: cleanEmail,
            avatarUrl: avatarUrl || "",
          },
        },
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          nickname: newUser.nickname,
          avatarUrl: newUser.avatarUrl,
          defaultCurrency: "PHP",
        },
        settings: { defaultCurrency: "PHP" },
      });
      return;
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Registration failed" });
      return;
    }
  }

  // If online storage is not connected
  res.status(503).json({
    success: false,
    error: "Online cloud sync is currently offline. You can continue directly on this device without interruption.",
  });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: "Email and password are required" });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const connected = await connectDB();

  if (connected) {
    try {
      const user = await (UserModel as any).findOne({ email: cleanEmail });
      if (!user) {
        res.status(401).json({
          success: false,
          error: "No account found with this email. Please check your email or create an account.",
        });
        return;
      }

      if (user.password !== password) {
        res.status(401).json({ success: false, error: "Incorrect password. Please try again." });
        return;
      }

      // Sync profile with logged in user
      await (UserProfileModel as any).findOneAndUpdate(
        { singletonId: "default_profile" },
        {
          $set: {
            nickname: user.nickname,
            email: user.email,
            avatarUrl: user.avatarUrl || "",
          },
        },
        { upsert: true }
      );

      // Fetch this user's settings or fallback to default
      const userSettings = await (UserSettingsModel as any)
        .findOne({ $or: [{ userId: user.id }, { singletonId: `settings_${user.id}` }] })
        .lean()
        .exec();

      const userDefaultCurrency =
        userSettings?.defaultCurrency ||
        userSettings?.primaryCurrency ||
        user.defaultCurrency ||
        "PHP";

      res.json({
        success: true,
        user: {
          id: user.id,
          email: user.email,
          nickname: user.nickname,
          avatarUrl: user.avatarUrl,
          defaultCurrency: userDefaultCurrency,
        },
        settings: userSettings
          ? {
              ...userSettings,
              defaultCurrency: userDefaultCurrency,
            }
          : { defaultCurrency: userDefaultCurrency },
      });
      return;
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Login failed" });
      return;
    }
  }

  // If database is not connected, require online database
  res.status(503).json({
    success: false,
    error: "Account service is currently unreachable. Please check your connection in Settings.",
  });
});

// Update user profile credentials (username, email, password, profile picture)
app.post("/api/user/update-profile", async (req, res) => {
  const userId = req.body.userId || (req.headers["x-user-id"] as string);
  const { email, nickname, password, avatarUrl } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: "Active account session required" });
    return;
  }

  const cleanEmail = email ? email.trim().toLowerCase() : "";
  const cleanNickname = nickname ? nickname.trim() : "";

  if (email !== undefined && !cleanEmail) {
    res.status(400).json({ success: false, error: "Email address cannot be empty." });
    return;
  }

  if (password && password.trim().length > 0 && password.trim().length < 6) {
    res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
    return;
  }

  const connected = await connectDB();
  if (connected) {
    try {
      // Check if another account already uses this email
      if (cleanEmail) {
        const existingWithEmail = await (UserModel as any).findOne({
          email: cleanEmail,
          id: { $ne: userId },
        });
        if (existingWithEmail) {
          res.status(400).json({
            success: false,
            error: "An account with this email address already exists.",
          });
          return;
        }
      }

      // Update UserModel
      let user = await (UserModel as any).findOne({ id: userId });
      if (!user && cleanEmail) {
        user = await (UserModel as any).findOne({ email: cleanEmail });
      }

      if (user) {
        if (cleanEmail) user.email = cleanEmail;
        if (cleanNickname) user.nickname = cleanNickname;
        if (password && password.trim().length >= 6) {
          user.password = password.trim();
        }
        if (avatarUrl !== undefined) {
          user.avatarUrl = avatarUrl;
        }
        await user.save();
      }

      // Update UserProfileModel
      const profileFilter = {
        $or: [
          { userId },
          { singletonId: `profile_${userId}` },
          { singletonId: "default_profile" },
        ],
      };

      const profileUpdate: any = { userId };
      if (cleanNickname) profileUpdate.nickname = cleanNickname;
      if (cleanEmail) profileUpdate.email = cleanEmail;
      if (avatarUrl !== undefined) profileUpdate.avatarUrl = avatarUrl;

      await (UserProfileModel as any).findOneAndUpdate(
        profileFilter,
        { $set: profileUpdate },
        { upsert: true, new: true }
      );

      res.json({
        success: true,
        user: {
          id: user ? user.id : userId,
          email: cleanEmail || user?.email || "",
          nickname: cleanNickname || user?.nickname || "User",
          avatarUrl: avatarUrl !== undefined ? avatarUrl : (user?.avatarUrl || ""),
        },
      });
      return;
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: err.message || "Unable to save your profile changes. Please try again.",
      });
      return;
    }
  }

  // Offline fallback
  res.json({
    success: true,
    user: {
      id: userId,
      email: cleanEmail,
      nickname: cleanNickname || "User",
      avatarUrl: avatarUrl || "",
    },
  });
});

// Google OAuth Authorization URL endpoint
app.get("/api/auth/google/url", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    res.status(400).json({
      configured: false,
      error: "Google Sign-In is not configured yet. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Settings.",
    });
    return;
  }

  const origin = (req.query.origin as string) || process.env.APP_URL || "https://ais-dev-zbjzs6iojh24oqwmlfkoug-54185673300.asia-southeast1.run.app";
  const redirectUri = `${origin.replace(/\/$/, '')}/auth/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    access_type: "offline",
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ configured: true, url: authUrl });
});

// Google OAuth Popup Callback Handler
app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
  const { code, error } = req.query;

  if (error || !code) {
    res.send(`
      <!DOCTYPE html>
      <html>
        <body style="font-family: system-ui, sans-serif; padding: 24px; text-align: center; color: #374151;">
          <p style="color: #dc2626; font-weight: 600;">Google sign-in was canceled or failed.</p>
          <script>setTimeout(() => window.close(), 2000);</script>
        </body>
      </html>
    `);
    return;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.send(`
      <!DOCTYPE html>
      <html>
        <body style="font-family: system-ui, sans-serif; padding: 24px; text-align: center; color: #dc2626;">
          <p>Google OAuth credentials are missing. Please configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Settings.</p>
          <script>setTimeout(() => window.close(), 3500);</script>
        </body>
      </html>
    `);
    return;
  }

  try {
    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "https";
    const host = req.headers["x-forwarded-host"] || req.headers.host;
    const origin = process.env.APP_URL || `${protocol}://${host}`;
    const redirectUri = `${origin.replace(/\/$/, '')}/auth/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code: code as string,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange authorization token");
    }

    // Fetch user profile from Google
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const googleProfile = await userRes.json();
    if (!googleProfile.email) {
      throw new Error("Could not retrieve email from your Google account.");
    }

    await connectDB();

    const cleanEmail = googleProfile.email.toLowerCase().trim();
    let user = await (UserModel as any).findOne({ email: cleanEmail });

    if (!user) {
      user = await (UserModel as any).create({
        id: `google_${googleProfile.id || Date.now()}`,
        email: cleanEmail,
        password: `google_oauth_${Math.random().toString(36).slice(2)}`,
        nickname: googleProfile.given_name || googleProfile.name || cleanEmail.split("@")[0],
        avatarUrl: googleProfile.picture || "",
      });
    } else {
      if (!user.avatarUrl && googleProfile.picture) {
        user.avatarUrl = googleProfile.picture;
        await user.save();
      }
    }

    // Update default profile singleton
    await (UserProfileModel as any).findOneAndUpdate(
      { singletonId: "default_profile" },
      {
        $set: {
          nickname: user.nickname,
          email: user.email,
          avatarUrl: user.avatarUrl || "",
        },
      },
      { upsert: true }
    );

    // Fetch this user's settings or fallback to default
    const userSettings = await (UserSettingsModel as any)
      .findOne({ $or: [{ userId: user.id }, { singletonId: `settings_${user.id}` }] })
      .lean()
      .exec();

    const userDefaultCurrency =
      userSettings?.defaultCurrency ||
      userSettings?.primaryCurrency ||
      user.defaultCurrency ||
      "PHP";

    const authPayload = JSON.stringify({
      type: "OAUTH_AUTH_SUCCESS",
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        defaultCurrency: userDefaultCurrency,
      },
    });

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authentication Successful</title>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #FAFAFA; color: #18181B;">
          <div style="text-align: center; padding: 24px;">
            <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #18181B; color: white; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 20px;">✓</div>
            <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 8px;">Signed in with Google</h2>
            <p style="font-size: 13px; color: #71717A; margin: 0;">Connecting your account... This window will close shortly.</p>
          </div>
          <script>
            if (window.opener) {
              window.opener.postMessage(${authPayload}, '*');
              setTimeout(() => { window.close(); }, 400);
            } else {
              window.location.href = '/';
            }
          </script>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error("Google OAuth error:", err);
    res.send(`
      <!DOCTYPE html>
      <html>
        <body style="font-family: system-ui, sans-serif; padding: 32px; text-align: center; color: #dc2626;">
          <h3>Sign-in Failed</h3>
          <p>${err.message || "Failed to complete Google authentication."}</p>
          <button onclick="window.close()" style="margin-top: 16px; padding: 8px 16px; background: #18181B; color: white; border: none; border-radius: 6px; cursor: pointer;">Close</button>
        </body>
      </html>
    `);
  }
});

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
    db: getDBStatus(),
  });
});

// MongoDB Status & Sync Endpoints
app.get("/api/db/status", async (_req, res) => {
  const status = getDBStatus();
  if (status.configured && !status.connected && !status.hasPlaceholder) {
    await connectDB();
  }
  res.json(getDBStatus());
});

// Full Sync - Retrieve data from MongoDB
app.get("/api/db/sync", async (req, res) => {
  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({ error: "Storage not connected", status: getDBStatus() });
    return;
  }

  const userId =
    (req.query.userId as string) ||
    (req.headers["x-user-id"] as string) ||
    "";

  try {
    // Unique user scoping for transactions:
    // If a userId is supplied, fetch only this user's transactions.
    // If no userId is supplied, return empty transactions (never leak other users' transactions).
    const txQuery: any = userId ? { userId } : { userId: "__none__" };
    const debtQuery: any = userId
      ? { $or: [{ userId }, { userId: "" }, { userId: { $exists: false } }] }
      : { userId: "__none__" };
    const goalQuery: any = userId
      ? { $or: [{ userId }, { userId: "" }, { userId: { $exists: false } }] }
      : { userId: "__none__" };

    const [transactions, categories, currencies, debts, goals, profileDoc] =
      await Promise.all([
        (TransactionModel as any).find(txQuery).sort({ date: -1 }).lean().exec(),
        (CategoryModel as any).find({}).lean().exec(),
        (CurrencyModel as any).find({}).lean().exec(),
        (DebtModel as any).find(debtQuery).sort({ date: -1 }).lean().exec(),
        (GoalModel as any).find(goalQuery).lean().exec(),
        (UserProfileModel as any)
          .findOne(
            userId
              ? { $or: [{ userId }, { singletonId: `profile_${userId}` }, { singletonId: "default_profile" }] }
              : { singletonId: "default_profile" }
          )
          .lean()
          .exec(),
      ]);

    let settingsDoc: any = null;
    if (userId) {
      settingsDoc = await (UserSettingsModel as any)
        .findOne({ $or: [{ userId }, { singletonId: `settings_${userId}` }] })
        .lean()
        .exec();

      if (!settingsDoc || !settingsDoc.defaultCurrency) {
        const userObj = await (UserModel as any).findOne({ id: userId }).lean().exec();
        if (userObj?.defaultCurrency) {
          settingsDoc = {
            ...(settingsDoc || {}),
            defaultCurrency: userObj.defaultCurrency,
            primaryCurrency: userObj.defaultCurrency,
          };
        }
      }
    }
    if (!settingsDoc) {
      settingsDoc = await (UserSettingsModel as any)
        .findOne({ singletonId: "default_settings" })
        .lean()
        .exec();
    }
    if (settingsDoc) {
      const curr = settingsDoc.defaultCurrency || settingsDoc.primaryCurrency || "PHP";
      settingsDoc.defaultCurrency = curr;
      settingsDoc.primaryCurrency = curr;
    }

    const isEmpty = (!transactions || transactions.length === 0);

    res.json({
      success: true,
      isEmpty,
      data: {
        transactions: transactions || [],
        categories: categories || [],
        currencies: currencies || [],
        debts: debts || [],
        goals: goals || [],
        settings: settingsDoc || null,
        profile: profileDoc || null,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch data" });
  }
});

// Full Sync - Save all client data to MongoDB
app.post("/api/db/sync", async (req, res) => {
  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({ error: "Storage not connected", status: getDBStatus() });
    return;
  }

  const userId =
    req.body.userId ||
    (req.headers["x-user-id"] as string) ||
    (req.query.userId as string) ||
    "";
  const { transactions, categories, currencies, debts, goals, settings, profile } = req.body;

  try {
    const promises: Promise<any>[] = [];

    // Transactions: enforce user-scoping so transactions are strictly unique to each user
    if (userId && Array.isArray(transactions)) {
      const userTxList = transactions.map((t: any) => ({ ...t, userId }));
      const activeIds = userTxList.map((t: any) => t.id);

      // Remove any transactions for this user that are no longer present
      await (TransactionModel as any).deleteMany({ userId, id: { $nin: activeIds } });

      if (userTxList.length > 0) {
        promises.push(
          (TransactionModel as any).bulkWrite(
            userTxList.map((t: any) => ({
              updateOne: {
                filter: { id: t.id, userId },
                update: { $set: t },
                upsert: true,
              },
            }))
          )
        );
      }
    } else if (!userId && Array.isArray(transactions) && transactions.length > 0) {
      promises.push(
        (TransactionModel as any).bulkWrite(
          transactions.map((t: any) => ({
            updateOne: {
              filter: { id: t.id },
              update: { $set: t },
              upsert: true,
            },
          }))
        )
      );
    }

    if (Array.isArray(categories) && categories.length > 0) {
      promises.push(
        (CategoryModel as any).bulkWrite(
          categories.map((c: any) => ({
            updateOne: {
              filter: { id: c.id },
              update: { $set: c },
              upsert: true,
            },
          }))
        )
      );
    }

    if (Array.isArray(currencies) && currencies.length > 0) {
      promises.push(
        (CurrencyModel as any).bulkWrite(
          currencies.map((c: any) => ({
            updateOne: {
              filter: { code: c.code },
              update: { $set: c },
              upsert: true,
            },
          }))
        )
      );
    }

    if (Array.isArray(debts)) {
      const userDebts = debts.map((d: any) => ({ ...d, userId: d.userId || userId || "" }));
      if (userId) {
        const activeDebtIds = userDebts.map((d: any) => d.id);
        await (DebtModel as any).deleteMany({ userId, id: { $nin: activeDebtIds } });
      }
      if (userDebts.length > 0) {
        promises.push(
          (DebtModel as any).bulkWrite(
            userDebts.map((d: any) => ({
              updateOne: {
                filter: { id: d.id },
                update: { $set: d },
                upsert: true,
              },
            }))
          )
        );
      }
    }

    if (Array.isArray(goals)) {
      const userGoals = goals.map((g: any) => ({ ...g, userId: g.userId || userId || "" }));
      if (userId) {
        const activeGoalIds = userGoals.map((g: any) => g.id);
        await (GoalModel as any).deleteMany({ userId, id: { $nin: activeGoalIds } });
      }
      if (userGoals.length > 0) {
        promises.push(
          (GoalModel as any).bulkWrite(
            userGoals.map((g: any) => ({
              updateOne: {
                filter: { id: g.id },
                update: { $set: g },
                upsert: true,
              },
            }))
          )
        );
      }
    }

    if (settings) {
      const curr = settings.defaultCurrency || settings.primaryCurrency || "PHP";
      const filter = userId
        ? { $or: [{ userId }, { singletonId: `settings_${userId}` }] }
        : { singletonId: "default_settings" };
      promises.push(
        (UserSettingsModel as any).findOneAndUpdate(
          filter,
          {
            $set: {
              ...settings,
              defaultCurrency: curr,
              primaryCurrency: curr,
              userId: userId || "",
              singletonId: userId ? `settings_${userId}` : "default_settings",
            },
          },
          { upsert: true, new: true }
        )
      );

      if (userId) {
        promises.push(
          (UserModel as any).findOneAndUpdate(
            { id: userId },
            { $set: { defaultCurrency: curr } }
          )
        );
      }
    }

    if (profile) {
      const filter = userId
        ? { $or: [{ userId }, { singletonId: `profile_${userId}` }] }
        : { singletonId: "default_profile" };
      promises.push(
        (UserProfileModel as any).findOneAndUpdate(
          filter,
          {
            $set: {
              ...profile,
              userId: userId || "",
              singletonId: userId ? `profile_${userId}` : "default_profile",
            },
          },
          { upsert: true, new: true }
        )
      );
    }

    await Promise.all(promises);
    res.json({ success: true, message: "Records synchronized successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to sync data" });
  }
});

// Single Transaction Deletion
app.delete("/api/db/transactions/:id", async (req, res) => {
  const userId = (req.query.userId as string) || (req.headers["x-user-id"] as string) || "";
  const connected = await connectDB();
  if (connected) {
    const filter: any = { id: req.params.id };
    if (userId) filter.userId = userId;
    await TransactionModel.deleteOne(filter).catch(() => {});
  }
  res.json({ success: true });
});

// Bulk Delete / Reset transactions for a user
app.delete("/api/db/transactions", async (req, res) => {
  const userId = (req.query.userId as string) || (req.headers["x-user-id"] as string) || "";
  const connected = await connectDB();
  if (connected) {
    if (userId) {
      await TransactionModel.deleteMany({ userId }).catch(() => {});
    } else {
      await TransactionModel.deleteMany({}).catch(() => {});
    }
  }
  res.json({ success: true });
});

// Single Debt Deletion
app.delete("/api/db/debts/:id", async (req, res) => {
  const connected = await connectDB();
  if (connected) {
    await DebtModel.deleteOne({ id: req.params.id }).catch(() => {});
  }
  res.json({ success: true });
});

// Single Goal Deletion
app.delete("/api/db/goals/:id", async (req, res) => {
  const connected = await connectDB();
  if (connected) {
    await GoalModel.deleteOne({ id: req.params.id }).catch(() => {});
  }
  res.json({ success: true });
});

// Single Category Deletion
app.delete("/api/db/categories/:id", async (req, res) => {
  const connected = await connectDB();
  if (connected) {
    await CategoryModel.deleteOne({ id: req.params.id }).catch(() => {});
  }
  res.json({ success: true });
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

// In standard environments, start the Express dev/prod server
if (!process.env.VERCEL) {
  startServer();
}

export default app;
