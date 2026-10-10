import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import crypto from "crypto";
import {
  connectDB,
  getDBStatus,
  TransactionModel,
  CategoryModel,
  AccountModel,
  CurrencyModel,
  DebtModel,
  GoalModel,
  UserSettingsModel,
  UserProfileModel,
  UserModel,
  PasswordResetTokenModel,
} from "./server/db.ts";
import { validateUsername } from "./src/utils/usernameValidation.ts";

dotenv.config();

function escapeRegex(text: string): string {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

const app = express();
const PORT = Number(process.env.PORT) || 3000;

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

function stripTrailingSlash(url: string): string {
  return (url || "").replace(/\/$/, "");
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
  } catch {
    return false;
  }
}

function getRequestOrigin(req: express.Request): string {
  const protoHeader = req.headers["x-forwarded-proto"];
  const hostHeader = req.headers["x-forwarded-host"] || req.headers.host;
  const protocol = String(Array.isArray(protoHeader) ? protoHeader[0] : protoHeader || req.protocol || "http")
    .split(",")[0]
    .trim();
  const host = String(Array.isArray(hostHeader) ? hostHeader[0] : hostHeader || "")
    .split(",")[0]
    .trim();
  if (!host) return "";
  return `${protocol}://${host}`;
}

/**
 * Production keeps using APP_URL / the browser origin (already working on Vercel).
 * Localhost ignores APP_URL so a production URL in .env cannot break OAuth token exchange.
 */
function getOAuthRedirectOrigin(req: express.Request, requestedOrigin?: string): string {
  const requestOrigin = stripTrailingSlash(getRequestOrigin(req));
  const candidate = stripTrailingSlash((requestedOrigin || "").trim());
  const appUrl = stripTrailingSlash(process.env.APP_URL || "");

  if (isLocalDevOrigin(requestOrigin) || isLocalDevOrigin(candidate)) {
    if (isLocalDevOrigin(candidate)) return candidate;
    return requestOrigin;
  }

  if (requestedOrigin !== undefined) {
    return candidate || appUrl || requestOrigin;
  }

  return appUrl || requestOrigin;
}

// Health Check Endpoints for Cloud Run / uptime monitoring
app.get("/api/health", (_req, res) => {
  res.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    db: getDBStatus(),
  });
});
app.get("/healthz", (_req, res) => {
  res.status(200).send("OK");
});
app.get("/_health", (_req, res) => {
  res.status(200).send("OK");
});

// Auth Endpoints

// Helper: Send 6-digit verification PIN email via SMTP if configured, or fall back to local dev preview
async function sendVerificationPinEmail(toEmail: string, pin: string, nickname?: string) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 36px 24px; color: #18181b; background-color: #fafafa;">
      <div style="text-align: center; margin-bottom: 28px;">
        <div style="display: inline-block; background: linear-gradient(135deg, #18181b 0%, #27272a 100%); color: #ffffff; padding: 12px 24px; border-radius: 14px; font-weight: 700; font-size: 17px; letter-spacing: -0.02em; box-shadow: 0 4px 12px rgba(0,0,0,0.1);">
          Budget Tracker
        </div>
      </div>
      <div style="background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 20px; padding: 36px 32px; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.05);">
        <h2 style="margin-top: 0; font-size: 22px; font-weight: 700; color: #09090b; letter-spacing: -0.02em; text-align: center;">Verify Your Email Address</h2>
        <p style="color: #52525b; font-size: 15px; line-height: 1.6; text-align: center; margin-top: 8px;">
          Welcome to Budget Tracker, <strong>${nickname || "there"}</strong>!<br/>
          Enter the 6-digit verification code below to verify your account and access your dashboard:
        </p>
        
        <div style="text-align: center; margin: 32px 0;">
          <div style="display: inline-block; background-color: #f4f4f5; border: 2px dashed #d4d4d8; padding: 18px 36px; border-radius: 16px;">
            <span style="font-family: 'SF Mono', Monaco, 'Consolas', monospace; font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #18181b; margin-left: 10px;">
              ${pin}
            </span>
          </div>
          <p style="color: #71717a; font-size: 13px; margin-top: 14px; margin-bottom: 0;">
            This PIN is valid for <strong>15 minutes</strong>.
          </p>
        </div>

        <div style="border-top: 1px solid #f4f4f5; padding-top: 20px; margin-top: 28px;">
          <p style="color: #a1a1aa; font-size: 12px; line-height: 1.5; margin-bottom: 0; text-align: center;">
            If you did not attempt to create a Budget Tracker account, you can safely ignore this email.
          </p>
        </div>
      </div>
    </div>
  `;

  if (host && user && pass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Budget Tracker" <${user}>`,
        to: toEmail,
        subject: `${pin} is your Budget Tracker verification code`,
        html: htmlContent,
      });
      console.log(`[Email Verification] Sent verification PIN email to ${toEmail} via SMTP.`);
      return { delivered: true, method: "smtp" as const };
    } catch (err) {
      console.warn("[Email Verification] SMTP delivery notice (falling back to dev preview):", err);
    }
  }

  console.log(`[Email Verification] [DEV MODE] PIN for ${toEmail}: ${pin}`);
  return { delivered: true, method: "dev_mode" as const };
}

// 1. Create Account (Dispatches Verification PIN to Email)
app.post("/api/auth/register", async (req, res) => {
  const { email, password, nickname, avatarUrl } = req.body;
  if (!email || !password) {
    res.status(400).json({ success: false, error: "Email and password are required" });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const rawNickname = nickname !== undefined ? String(nickname).trim() : "";
  const usernameValidation = validateUsername(rawNickname);
  if (!usernameValidation.isValid) {
    res.status(400).json({ success: false, error: usernameValidation.error });
    return;
  }
  const cleanNickname = rawNickname;

  const connected = await connectDB();
  if (connected) {
    try {
      // Check if username is already taken (case-insensitive)
      const existingWithUsername = await (UserModel as any).findOne({
        nickname: { $regex: new RegExp(`^${escapeRegex(cleanNickname)}$`, "i") },
        email: { $ne: cleanEmail },
      });
      if (existingWithUsername) {
        res.status(400).json({
          success: false,
          error: "This username is already taken. Please choose another.",
        });
        return;
      }

      const existing = await (UserModel as any).findOne({ email: cleanEmail });
      
      // If user exists and is already verified, block duplicate registration
      if (existing && existing.isVerified) {
        res.status(400).json({
          success: false,
          error: "An account with this email already exists. Please sign in instead.",
        });
        return;
      }

      // Generate secure 6-digit numeric PIN
      const pin = crypto.randomInt(100000, 1000000).toString();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      if (existing) {
        // User created account earlier but didn't finish verification: refresh credentials & new PIN
        existing.password = password;
        existing.nickname = cleanNickname;
        existing.avatarUrl = avatarUrl || existing.avatarUrl || "";
        existing.isVerified = false;
        existing.verificationPin = pin;
        existing.verificationPinExpiresAt = expiresAt;
        await existing.save();
      } else {
        // Create new unverified user
        const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await (UserModel as any).create({
          id: userId,
          email: cleanEmail,
          password,
          nickname: cleanNickname,
          avatarUrl: avatarUrl || "",
          isVerified: false,
          verificationPin: pin,
          verificationPinExpiresAt: expiresAt,
        });
      }

      // Send the PIN to their email
      const emailResult = await sendVerificationPinEmail(cleanEmail, pin, cleanNickname);

      // Return requiresVerification: true. Do NOT grant dashboard session yet!
      res.json({
        success: true,
        requiresVerification: true,
        email: cleanEmail,
        nickname: cleanNickname,
        method: emailResult.method,
        // Include devPin if SMTP is not configured so local development/testing is smooth
        ...(emailResult.method === "dev_mode" ? { devPin: pin } : {}),
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
    error: "Account service is currently offline. Please check your connection in Settings.",
  });
});

// 2. Verify PIN after Account Creation
app.post("/api/auth/verify-pin", async (req, res) => {
  const { email, pin } = req.body;
  if (!email || !pin) {
    res.status(400).json({ success: false, error: "Email and verification PIN are required." });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const cleanPin = pin.trim();

  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({
      success: false,
      error: "Account service is currently unreachable. Please check your connection.",
    });
    return;
  }

  try {
    const user = await (UserModel as any).findOne({ email: cleanEmail });
    if (!user) {
      res.status(404).json({ success: false, error: "No account found with this email." });
      return;
    }

    if (!user.isVerified) {
      if (!user.verificationPin) {
        res.status(400).json({
          success: false,
          error: "No active verification code found. Please click 'Resend PIN' to receive a new code.",
        });
        return;
      }

      if (new Date() > new Date(user.verificationPinExpiresAt)) {
        res.status(410).json({
          success: false,
          error: "This verification code has expired. Please click 'Resend PIN' to get a new code.",
        });
        return;
      }

      if (user.verificationPin !== cleanPin) {
        res.status(400).json({
          success: false,
          error: "Incorrect verification PIN. Please check the 6-digit code and try again.",
        });
        return;
      }

      // PIN is correct! Activate account
      user.isVerified = true;
      user.verificationPin = null;
      user.verificationPinExpiresAt = null;
      await user.save();
    }

    // Synchronize user profile record
    await (UserProfileModel as any).findOneAndUpdate(
      { $or: [{ userId: user.id }, { singletonId: `profile_${user.id}` }] },
      {
        $set: {
          userId: user.id,
          singletonId: `profile_${user.id}`,
          nickname: user.nickname,
          email: user.email,
          avatarUrl: user.avatarUrl || "",
        },
      },
      { upsert: true, returnDocument: 'after' }
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
        isVerified: true,
        hasPin: Boolean(user.pinCode),
        pinCode: user.pinCode || null,
      },
      settings: userSettings
        ? {
            ...userSettings,
            defaultCurrency: userDefaultCurrency,
          }
        : { defaultCurrency: userDefaultCurrency },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Verification failed." });
  }
});

// 3. Resend Verification PIN
app.post("/api/auth/resend-pin", async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    res.status(400).json({ success: false, error: "Email address is required." });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({
      success: false,
      error: "Account service is currently unreachable. Please check your connection.",
    });
    return;
  }

  try {
    const user = await (UserModel as any).findOne({ email: cleanEmail });
    if (!user) {
      res.status(404).json({ success: false, error: "No account found with this email." });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({
        success: false,
        alreadyVerified: true,
        error: "This account is already verified. You can sign in directly.",
      });
      return;
    }

    const pin = crypto.randomInt(100000, 1000000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.verificationPin = pin;
    user.verificationPinExpiresAt = expiresAt;
    await user.save();

    const emailResult = await sendVerificationPinEmail(cleanEmail, pin, user.nickname);

    res.json({
      success: true,
      message: `A new verification PIN has been sent to ${cleanEmail}.`,
      email: cleanEmail,
      method: emailResult.method,
      ...(emailResult.method === "dev_mode" ? { devPin: pin } : {}),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to resend PIN." });
  }
});

// 4. Sign In (Blocks unverified accounts from dashboard)
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

      const hasRealPassword = Boolean(user.password && !user.password.startsWith("google_oauth_"));
      const isGoogleAccount = Boolean(
        user.authProvider === "google" ||
        user.googleId ||
        user.googleEmail ||
        (user.password && user.password.startsWith("google_oauth_")) ||
        user.id?.startsWith("google_")
      );

      // If user registered with Google without a password, prompt them to use Google or reset password
      if (isGoogleAccount && !hasRealPassword) {
        res.status(400).json({
          success: false,
          googleRegistered: true,
          error:
            "This email was registered using Google. Please continue with Google to log in, or reset your password to add a password login.",
        });
        return;
      }

      if (user.password !== password) {
        res.status(401).json({ success: false, error: "Incorrect password. Please try again." });
        return;
      }

      // STRICT PROTECTION: If account is not verified, do NOT allow dashboard access!
      if (user.isVerified === false) {
        // Ensure a valid PIN exists or refresh it
        let pin = user.verificationPin;
        const isExpired = !user.verificationPinExpiresAt || new Date() > new Date(user.verificationPinExpiresAt);
        let devPin: string | undefined;

        if (!pin || isExpired) {
          pin = crypto.randomInt(100000, 1000000).toString();
          user.verificationPin = pin;
          user.verificationPinExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
          await user.save();
          const emailResult = await sendVerificationPinEmail(cleanEmail, pin, user.nickname);
          if (emailResult.method === "dev_mode") {
            devPin = pin;
          }
        }

        res.status(403).json({
          success: false,
          unverified: true,
          email: user.email,
          nickname: user.nickname,
          error: "Your account is not verified yet. Please enter the verification PIN sent to your email to access the dashboard.",
          devPin,
        });
        return;
      }

      // Sync profile with logged in user (scoped strictly to this user's account)
      await (UserProfileModel as any).findOneAndUpdate(
        { $or: [{ userId: user.id }, { singletonId: `profile_${user.id}` }] },
        {
          $set: {
            userId: user.id,
            singletonId: `profile_${user.id}`,
            nickname: user.nickname,
            email: user.email,
            avatarUrl: user.avatarUrl || "",
          },
        },
        { upsert: true, returnDocument: 'after' }
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
          isVerified: true,
          hasPin: Boolean(user.pinCode),
          pinCode: user.pinCode || null,
          googleId: user.googleId || null,
          googleEmail: user.googleEmail || null,
          authProvider: user.authProvider || "email",
          hasPassword: hasRealPassword,
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

// Helper: Send password reset email via SMTP if configured, or fall back to direct link
async function sendPasswordResetEmail(toEmail: string, resetUrl: string, nickname?: string) {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = (process.env.SMTP_PASS || "").replace(/\s+/g, "");

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; color: #18181b;">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="display: inline-block; background-color: #18181b; color: #ffffff; padding: 10px 18px; border-radius: 12px; font-weight: 600; font-size: 16px;">
          Budget Tracker
        </div>
      </div>
      <div style="background-color: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <h2 style="margin-top: 0; font-size: 20px; font-weight: 600; color: #09090b;">Reset Your Password</h2>
        <p style="color: #71717a; font-size: 14px; line-height: 1.6;">
          Hello ${nickname || "there"},<br/><br/>
          We received a request to reset your password. Click the button below to choose a new password for your account:
        </p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${resetUrl}" style="background-color: #18181b; color: #ffffff; padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 500; text-decoration: none; display: inline-block;">
            Set New Password
          </a>
        </div>
        <p style="color: #a1a1aa; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
          If you did not request this, you can safely ignore this email. This link will expire in 1 hour.
        </p>
      </div>
    </div>
  `;

  if (host && user && pass) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"Budget Tracker" <${user}>`,
        to: toEmail,
        subject: "Reset your Budget Tracker password",
        html: htmlContent,
      });
      return { delivered: true, method: "smtp" };
    } catch (err) {
      console.warn("SMTP email delivery notice (falling back to direct preview link):", err);
    }
  }

  console.log(`[Password Reset] Link generated for ${toEmail}: ${resetUrl}`);
  return { delivered: true, method: "direct" };
}

// 1. Request Password Reset Link
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email || !email.trim()) {
    res.status(400).json({ success: false, error: "Please enter your email address." });
    return;
  }

  const cleanEmail = email.trim().toLowerCase();
  const connected = await connectDB();

  if (!connected) {
    res.status(503).json({
      success: false,
      error: "Unable to connect right now. Please check your connection in Settings.",
    });
    return;
  }

  try {
    const user = await (UserModel as any).findOne({ email: cleanEmail });
    if (!user) {
      res.status(404).json({
        success: false,
        error: "We could not find an account with that email address. Please check and try again.",
      });
      return;
    }

    // Invalidate previous unused reset tokens for this email
    await (PasswordResetTokenModel as any).updateMany(
      { email: cleanEmail, used: false },
      { $set: { used: true } }
    );

    // Create a 32-byte secure hex token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await (PasswordResetTokenModel as any).create({
      token,
      userId: user.id,
      email: cleanEmail,
      expiresAt,
      used: false,
    });

    const protocol = req.headers["x-forwarded-proto"] || req.protocol || "http";
    const host = req.headers["x-forwarded-host"] || req.get("host") || "localhost:3000";
    const reqOrigin = req.headers.origin || `${protocol}://${host}`;
    const resetUrl = `${reqOrigin}/?resetToken=${token}`;

    const emailResult = await sendPasswordResetEmail(cleanEmail, resetUrl, user.nickname);

    res.json({
      success: true,
      message: "A password reset link has been sent to your email address.",
      email: cleanEmail,
      resetUrl,
      method: emailResult.method,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Failed to process password reset request. Please try again.",
    });
  }
});

// 2. Verify Reset Token
app.get("/api/auth/verify-reset-token", async (req, res) => {
  const token = req.query.token as string;
  if (!token) {
    res.status(400).json({ valid: false, error: "Reset token is missing." });
    return;
  }

  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({ valid: false, error: "Service currently unavailable. Please try again." });
    return;
  }

  try {
    const tokenDoc = await (PasswordResetTokenModel as any).findOne({
      token,
      used: false,
    });

    if (!tokenDoc) {
      res.status(404).json({
        valid: false,
        error: "This password reset link is invalid or has already been used.",
      });
      return;
    }

    if (new Date() > new Date(tokenDoc.expiresAt)) {
      res.status(410).json({
        valid: false,
        error: "This password reset link has expired. Please request a new one.",
      });
      return;
    }

    res.json({
      valid: true,
      email: tokenDoc.email,
    });
  } catch (err: any) {
    res.status(500).json({ valid: false, error: "Failed to verify reset link." });
  }
});

// 3. Set New Password with Token
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token) {
    res.status(400).json({ success: false, error: "Reset link token is missing." });
    return;
  }

  if (!newPassword || newPassword.length < 4) {
    res.status(400).json({
      success: false,
      error: "Your new password must be at least 4 characters long.",
    });
    return;
  }

  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({
      success: false,
      error: "Unable to connect right now. Please try again in a few moments.",
    });
    return;
  }

  try {
    const tokenDoc = await (PasswordResetTokenModel as any).findOne({
      token,
      used: false,
    });

    if (!tokenDoc) {
      res.status(404).json({
        success: false,
        error: "This password reset link is invalid or has already been used. Please request a new one.",
      });
      return;
    }

    if (new Date() > new Date(tokenDoc.expiresAt)) {
      res.status(410).json({
        success: false,
        error: "This password reset link has expired. Please request a new one.",
      });
      return;
    }

    // Update user's password
    await (UserModel as any).findOneAndUpdate(
      { id: tokenDoc.userId },
      { $set: { password: newPassword } }
    );

    // Mark token as used
    tokenDoc.used = true;
    await tokenDoc.save();

    res.json({
      success: true,
      message: "Your password has been updated! You can now sign in with your new password.",
      email: tokenDoc.email,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Failed to update password. Please try again.",
    });
  }
});

// Check username availability endpoint
app.get("/api/auth/check-username", async (req, res) => {
  const username = req.query.username ? String(req.query.username).trim() : "";
  const userId = req.query.userId ? String(req.query.userId) : "";

  const validation = validateUsername(username);
  if (!validation.isValid) {
    res.json({ available: false, error: validation.error });
    return;
  }

  const connected = await connectDB();
  if (connected) {
    try {
      const query: any = {
        nickname: { $regex: new RegExp(`^${escapeRegex(username)}$`, "i") },
      };
      if (userId) {
        query.id = { $ne: userId };
      }
      const existing = await (UserModel as any).findOne(query);
      if (existing) {
        res.json({
          available: false,
          error: "This username is already taken. Please choose another.",
        });
        return;
      }
    } catch {
      // Allow through on connection failure
    }
  }

  res.json({ available: true });
});

// Update user profile credentials (username, email, password, profile picture)
app.post("/api/user/update-profile", async (req, res) => {
  const userId = req.body.userId || (req.headers["x-user-id"] as string);
  const { email, nickname, password, currentPassword, avatarUrl } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: "Active account session required" });
    return;
  }

  const cleanEmail = email ? email.trim().toLowerCase() : "";
  const connected = await connectDB();

  let user: any = null;
  if (connected) {
    user = await (UserModel as any).findOne({
      $or: [{ id: userId }, { email: String(userId).toLowerCase().trim() }],
    });
    if (!user && cleanEmail) {
      user = await (UserModel as any).findOne({ email: cleanEmail });
    }
  }

  let cleanNickname = "";
  if (nickname !== undefined) {
    const rawNickname = String(nickname).trim();
    // Only validate username format if it is actually changing
    if (!user || user.nickname !== rawNickname) {
      const usernameValidation = validateUsername(rawNickname);
      if (!usernameValidation.isValid) {
        res.status(400).json({ success: false, error: usernameValidation.error });
        return;
      }
    }
    cleanNickname = rawNickname;
  }

  if (email !== undefined && !cleanEmail) {
    res.status(400).json({ success: false, error: "Email address cannot be empty." });
    return;
  }

  if (password && password.trim().length > 0 && password.trim().length < 6) {
    res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
    return;
  }

  if (connected) {
    try {
      const canonicalUserId = user ? user.id : userId;

      // Check if another account already uses this username (case-insensitive)
      if (cleanNickname && (!user || user.nickname !== cleanNickname)) {
        const existingWithUsername = await (UserModel as any).findOne({
          nickname: { $regex: new RegExp(`^${escapeRegex(cleanNickname)}$`, "i") },
          id: { $ne: canonicalUserId },
        });
        if (existingWithUsername) {
          res.status(400).json({
            success: false,
            error: "This username is already taken. Please choose another.",
          });
          return;
        }
      }

      // Check if another account already uses this email
      if (cleanEmail && (!user || user.email !== cleanEmail)) {
        const existingWithEmail = await (UserModel as any).findOne({
          email: cleanEmail,
          id: { $ne: canonicalUserId },
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
      if (user) {
        if (password && password.trim().length >= 6) {
          if (user.password && currentPassword !== undefined && currentPassword.trim() !== user.password) {
            res.status(400).json({
              success: false,
              error: "The current password you entered is incorrect.",
            });
            return;
          }
          user.password = password.trim();
        }
        if (cleanEmail) user.email = cleanEmail;
        if (cleanNickname) user.nickname = cleanNickname;
        if (avatarUrl !== undefined) {
          user.avatarUrl = avatarUrl;
        }
        await user.save();
      }

      const finalAvatarUrl = avatarUrl !== undefined ? avatarUrl : (user?.avatarUrl || "");
      const finalNickname = cleanNickname || user?.nickname || "User";
      const finalEmail = cleanEmail || user?.email || "";

      // Update UserProfileModel strictly scoped to this user
      const profileFilter = canonicalUserId
        ? { $or: [{ userId: canonicalUserId }, { singletonId: `profile_${canonicalUserId}` }] }
        : { singletonId: "default_profile" };

      const profileUpdate: any = {
        userId: canonicalUserId || "",
        singletonId: canonicalUserId ? `profile_${canonicalUserId}` : "default_profile",
      };
      if (cleanNickname) profileUpdate.nickname = cleanNickname;
      if (cleanEmail) profileUpdate.email = cleanEmail;
      if (avatarUrl !== undefined) profileUpdate.avatarUrl = avatarUrl;

      await (UserProfileModel as any).findOneAndUpdate(
        profileFilter,
        { $set: profileUpdate },
        { upsert: true, returnDocument: 'after' }
      );

      // Real-time broadcast to all connected devices for this user
      broadcastToUser(canonicalUserId, {
        type: "profile_updated",
        userId: canonicalUserId,
        email: finalEmail,
        profile: {
          nickname: finalNickname,
          email: finalEmail,
          avatarUrl: finalAvatarUrl,
        },
      });

      res.json({
        success: true,
        user: {
          id: canonicalUserId,
          email: finalEmail,
          nickname: finalNickname,
          avatarUrl: finalAvatarUrl,
          defaultCurrency: user?.defaultCurrency || "PHP",
          googleId: user?.googleId || null,
          googleEmail: user?.googleEmail || null,
          authProvider: user?.authProvider || (user?.googleId ? "google" : "email"),
          hasPassword: Boolean(user?.password && !user?.password.startsWith("google_oauth_")),
          hasPin: Boolean(user?.pinCode),
          isVerified: true,
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

// Verify current password endpoint
app.post("/api/user/verify-password", async (req, res) => {
  const userId = req.body.userId || (req.headers["x-user-id"] as string);
  const { currentPassword } = req.body;

  if (!userId) {
    res.status(400).json({ success: false, error: "Active account session required." });
    return;
  }

  if (!currentPassword || typeof currentPassword !== "string" || !currentPassword.trim()) {
    res.status(400).json({ success: false, error: "Please enter your current password." });
    return;
  }

  const connected = await connectDB();
  if (connected) {
    try {
      let user = await (UserModel as any).findOne({ id: userId });
      if (!user && req.body.email) {
        user = await (UserModel as any).findOne({ email: req.body.email.trim().toLowerCase() });
      }
      if (!user) {
        // If not found in database (e.g. guest or local session), accept password to proceed
        res.json({ success: true, message: "Password verified." });
        return;
      }

      if (user.password && user.password !== currentPassword.trim()) {
        res.status(400).json({ success: false, error: "The current password you entered is incorrect." });
        return;
      }

      res.json({ success: true, message: "Password verified." });
      return;
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Failed to verify password." });
      return;
    }
  }

  res.json({ success: true, message: "Password verified." });
});

// Check PIN Status for a user across all devices
app.get("/api/user/pin-status", async (req, res) => {
  const userId = (req.query.userId as string) || (req.headers["x-user-id"] as string);
  const email = (req.query.email as string) || "";

  if (!userId && !email) {
    res.status(400).json({ success: false, error: "User identifier required." });
    return;
  }

  const cleanEmail = email ? email.trim().toLowerCase() : "";
  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({ success: false, error: "Database unreachable." });
    return;
  }

  try {
    const user = await (UserModel as any).findOne({
      $or: [
        ...(userId ? [{ id: userId }] : []),
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(userId && userId.includes('@') ? [{ email: userId.trim().toLowerCase() }] : []),
      ],
    });

    if (!user) {
      res.status(404).json({ success: false, error: "Account not found." });
      return;
    }

    res.json({
      success: true,
      hasPin: Boolean(user.pinCode),
      pinCode: user.pinCode || null,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch PIN status." });
  }
});

// Verify 4-digit PIN Code
app.post("/api/user/verify-pin", async (req, res) => {
  const userId = req.body.userId || (req.headers["x-user-id"] as string);
  const email = req.body.email as string;
  const { pin } = req.body;

  if (!userId && !email) {
    res.status(400).json({ success: false, error: "Active account session required." });
    return;
  }

  if (!pin || typeof pin !== "string" || pin.trim().length !== 4) {
    res.status(400).json({ success: false, error: "Please enter a 4-digit PIN." });
    return;
  }

  const cleanPin = pin.trim();
  const cleanEmail = email ? email.trim().toLowerCase() : "";

  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({ success: false, error: "Database service unreachable." });
    return;
  }

  try {
    const user = await (UserModel as any).findOne({
      $or: [
        ...(userId ? [{ id: userId }] : []),
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(userId && userId.includes('@') ? [{ email: userId.trim().toLowerCase() }] : []),
      ],
    });

    if (!user) {
      res.status(404).json({ success: false, error: "User account not found." });
      return;
    }

    if (!user.pinCode) {
      // No PIN set yet on account
      res.status(400).json({ success: false, noPinSet: true, error: "No PIN code configured for this account." });
      return;
    }

    const isMatch = String(user.pinCode).trim() === cleanPin;
    if (!isMatch) {
      res.status(400).json({ success: false, error: "Incorrect PIN code. Please try again." });
      return;
    }

    res.json({ success: true, verified: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to verify PIN." });
  }
});

// Set / Update 4-digit PIN Code
app.post("/api/user/set-pin", async (req, res) => {
  const userId = req.body.userId || (req.headers["x-user-id"] as string);
  const email = req.body.email as string;
  const { pin } = req.body;

  if (!userId && !email) {
    res.status(400).json({ success: false, error: "Active account session required." });
    return;
  }

  if (!pin || typeof pin !== "string" || !/^\d{4}$/.test(pin.trim())) {
    res.status(400).json({ success: false, error: "PIN must be exactly 4 digits." });
    return;
  }

  const cleanPin = pin.trim();
  const cleanEmail = email ? email.trim().toLowerCase() : "";

  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({ success: false, error: "Database service unreachable." });
    return;
  }

  try {
    const user = await (UserModel as any).findOne({
      $or: [
        ...(userId ? [{ id: userId }] : []),
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(userId && userId.includes('@') ? [{ email: userId.trim().toLowerCase() }] : []),
      ],
    });

    if (!user) {
      res.status(404).json({ success: false, error: "Account not found." });
      return;
    }

    user.pinCode = cleanPin;
    await user.save();

    console.log(`[PIN Code] Successfully saved PIN for user ${user.email} (${user.id})`);
    res.json({ success: true, message: "PIN set successfully.", hasPin: true, pinCode: cleanPin });
  } catch (err: any) {
    console.error("[PIN Code] Failed to update PIN:", err);
    res.status(500).json({ success: false, error: err.message || "Failed to update PIN." });
  }
});

// Remove 4-digit PIN Code
app.post("/api/user/remove-pin", async (req, res) => {
  const userId = req.body.userId || (req.headers["x-user-id"] as string);
  const email = req.body.email as string;

  if (!userId && !email) {
    res.status(400).json({ success: false, error: "Active account session required." });
    return;
  }

  const cleanEmail = email ? email.trim().toLowerCase() : "";

  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({ success: false, error: "Database service unreachable." });
    return;
  }

  try {
    const user = await (UserModel as any).findOne({
      $or: [
        ...(userId ? [{ id: userId }] : []),
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(userId && userId.includes('@') ? [{ email: userId.trim().toLowerCase() }] : []),
      ],
    });

    if (user) {
      user.pinCode = null;
      await user.save();
    }

    res.json({ success: true, message: "PIN removed successfully." });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to remove PIN." });
  }
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

  const origin =
    getOAuthRedirectOrigin(req, req.query.origin as string) ||
    "https://ais-dev-zbjzs6iojh24oqwmlfkoug-54185673300.asia-southeast1.run.app";
  const redirectUri = `${origin}/auth/callback`;

  const action = (req.query.action as string) || "signin";
  const userId = (req.query.userId as string) || "";

  const statePayload = {
    origin,
    action,
    userId,
  };
  const state = Buffer.from(JSON.stringify(statePayload)).toString("base64url");

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid email profile",
    prompt: "select_account",
    access_type: "offline",
    state,
  });

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  res.json({ configured: true, url: authUrl });
});

// Google OAuth Popup Callback Handler
app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
  const { code, error, state } = req.query;

  if (error || !code) {
    res.send(`
      <!DOCTYPE html>
      <html>
        <body style="font-family: system-ui, sans-serif; padding: 24px; text-align: center; color: #374151;">
          <p style="color: #dc2626; font-weight: 600;">Google sign-in was canceled or failed.</p>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'GOOGLE_CONNECT_ERROR', error: 'Google authentication was canceled.' }, '*');
            }
            setTimeout(() => window.close(), 1500);
          </script>
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
    let stateData: { origin?: string; action?: string; userId?: string } = {};
    if (typeof state === "string" && state) {
      try {
        stateData = JSON.parse(Buffer.from(state, "base64url").toString("utf-8"));
      } catch {}
    }

    const origin = stateData.origin || getOAuthRedirectOrigin(req);
    const redirectUri = `${origin}/auth/callback`;

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

    // ==========================================
    // ACTION: CONNECT GOOGLE ACCOUNT TO EXISTING USER
    // ==========================================
    if (stateData.action === "connect" && stateData.userId) {
      const targetUser = await (UserModel as any).findOne({
        $or: [{ id: stateData.userId }, { email: stateData.userId.toLowerCase().trim() }],
      });

      if (!targetUser) {
        res.send(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: system-ui, sans-serif; padding: 24px; text-align: center; color: #dc2626;">
              <p style="font-weight: 600;">Account session not found.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'GOOGLE_CONNECT_ERROR', error: 'User session not found.' }, '*');
                }
                setTimeout(() => window.close(), 2000);
              </script>
            </body>
          </html>
        `);
        return;
      }

      // Check if this Google account is already linked to another user
      const conflictUser = await (UserModel as any).findOne({
        id: { $ne: targetUser.id },
        $or: [{ googleId: googleProfile.id }, { googleEmail: cleanEmail }],
      });

      if (conflictUser) {
        res.send(`
          <!DOCTYPE html>
          <html>
            <body style="font-family: system-ui, sans-serif; padding: 28px; text-align: center; color: #374151;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #FEE2E2; color: #DC2626; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 20px;">!</div>
              <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 8px; color: #991B1B;">Already Connected</h2>
              <p style="font-size: 13px; color: #4B5563; margin: 0;">This Google account is already connected to another Wallo account.</p>
              <script>
                if (window.opener) {
                  window.opener.postMessage({ type: 'GOOGLE_CONNECT_ERROR', error: 'This Google account is already linked to another Wallo account.' }, '*');
                }
                setTimeout(() => window.close(), 3000);
              </script>
            </body>
          </html>
        `);
        return;
      }

      // Successfully link Google account to target user
      targetUser.googleId = googleProfile.id;
      targetUser.googleEmail = cleanEmail;
      if (!targetUser.avatarUrl && googleProfile.picture) {
        targetUser.avatarUrl = googleProfile.picture;
      }
      await targetUser.save();

      // Update UserProfileModel
      await (UserProfileModel as any).findOneAndUpdate(
        { $or: [{ userId: targetUser.id }, { singletonId: `profile_${targetUser.id}` }] },
        {
          $set: {
            userId: targetUser.id,
            singletonId: `profile_${targetUser.id}`,
            nickname: targetUser.nickname,
            email: targetUser.email,
            ...(targetUser.avatarUrl ? { avatarUrl: targetUser.avatarUrl } : {}),
          },
        },
        { upsert: true, returnDocument: 'after' }
      );

      const hasPassword = Boolean(targetUser.password && !targetUser.password.startsWith("google_oauth_"));
      const connectPayload = JSON.stringify({
        type: "GOOGLE_CONNECT_SUCCESS",
        googleEmail: cleanEmail,
        googleId: googleProfile.id,
        user: {
          id: targetUser.id,
          email: targetUser.email,
          nickname: targetUser.nickname,
          avatarUrl: targetUser.avatarUrl,
          defaultCurrency: targetUser.defaultCurrency || "PHP",
          isVerified: true,
          hasPin: Boolean(targetUser.pinCode),
          pinCode: targetUser.pinCode || null,
          googleId: targetUser.googleId,
          googleEmail: targetUser.googleEmail,
          authProvider: targetUser.authProvider || "email",
          hasPassword,
        },
      });

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Google Account Connected</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: system-ui, -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #FAFAFA; color: #18181B;">
            <div style="text-align: center; padding: 24px;">
              <div style="width: 44px; height: 44px; border-radius: 50%; background-color: #059669; color: white; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 20px;">✓</div>
              <h2 style="font-size: 16px; font-weight: 600; margin: 0 0 8px;">Google Account Connected!</h2>
              <p style="font-size: 13px; color: #71717A; margin: 0;">Connected as ${cleanEmail}. This window will close shortly.</p>
            </div>
            <script>
              const payload = ${connectPayload};
              if (window.opener) {
                window.opener.postMessage(payload, '*');
                setTimeout(() => { window.close(); }, 600);
              } else {
                window.location.href = '/';
              }
            </script>
          </body>
        </html>
      `);
      return;
    }

    // ==========================================
    // ACTION: REGULAR SIGN IN / SIGN UP WITH GOOGLE
    // ==========================================
    // Match by Google ID, Google Email, or registered email address
    let user = await (UserModel as any).findOne({
      $or: [
        { googleId: googleProfile.id },
        { googleEmail: cleanEmail },
        { email: cleanEmail },
      ],
    });

    if (!user) {
      user = await (UserModel as any).create({
        id: `google_${googleProfile.id || Date.now()}`,
        email: cleanEmail,
        password: null,
        nickname: googleProfile.given_name || googleProfile.name || cleanEmail.split("@")[0],
        avatarUrl: googleProfile.picture || "",
        isVerified: true,
        googleId: googleProfile.id || `google_${Date.now()}`,
        googleEmail: cleanEmail,
        authProvider: "google",
      });
    } else {
      let needsSave = false;
      if (!user.googleId && googleProfile.id) {
        user.googleId = googleProfile.id;
        needsSave = true;
      }
      if (!user.googleEmail) {
        user.googleEmail = cleanEmail;
        needsSave = true;
      }
      if (user.avatarUrl === undefined && googleProfile.picture) {
        user.avatarUrl = googleProfile.picture;
        needsSave = true;
      }
      if (!user.isVerified) {
        user.isVerified = true;
        needsSave = true;
      }
      if (needsSave) {
        await user.save();
      }
    }

    // Update profile record strictly scoped to this user
    await (UserProfileModel as any).findOneAndUpdate(
      { $or: [{ userId: user.id }, { singletonId: `profile_${user.id}` }] },
      {
        $set: {
          userId: user.id,
          singletonId: `profile_${user.id}`,
          nickname: user.nickname,
          email: user.email,
          avatarUrl: user.avatarUrl || "",
        },
      },
      { upsert: true, returnDocument: 'after' }
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

    const hasRealPassword = Boolean(user.password && !user.password.startsWith("google_oauth_"));

    const authPayload = JSON.stringify({
      type: "OAUTH_AUTH_SUCCESS",
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        defaultCurrency: userDefaultCurrency,
        isVerified: true,
        hasPin: Boolean(user.pinCode),
        pinCode: user.pinCode || null,
        googleId: user.googleId || null,
        googleEmail: user.googleEmail || null,
        authProvider: user.authProvider || "google",
        hasPassword: hasRealPassword,
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
            const payload = ${authPayload};
            try {
              localStorage.setItem('budget_tracker_google_auth', JSON.stringify(payload));
            } catch (err) {}

            if (window.opener) {
              window.opener.postMessage(payload, '*');
              try {
                window.opener.location.href = '/';
              } catch (err) {}
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

// Disconnect Google Account endpoint
app.post("/api/auth/google/disconnect", async (req, res) => {
  const userId =
    req.body.userId ||
    (req.headers["x-user-id"] as string) ||
    "";

  if (!userId) {
    res.status(400).json({ success: false, error: "Active account session required." });
    return;
  }

  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({ success: false, error: "Unable to connect right now. Please try again shortly." });
    return;
  }

  try {
    const user = await (UserModel as any).findOne({
      $or: [{ id: userId }, { email: String(userId).toLowerCase().trim() }],
    });

    if (!user) {
      res.status(404).json({ success: false, error: "Account not found." });
      return;
    }

    const hasRealPassword = Boolean(user.password && !user.password.startsWith("google_oauth_"));
    if (!hasRealPassword) {
      res.status(400).json({
        success: false,
        error: "Please set a password first before disconnecting your Google account so you can still log in.",
      });
      return;
    }

    user.googleId = null;
    user.googleEmail = null;
    if (user.authProvider === "google") {
      user.authProvider = "email";
    }
    await user.save();

    res.json({
      success: true,
      message: "Google account disconnected successfully.",
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        avatarUrl: user.avatarUrl,
        defaultCurrency: user.defaultCurrency || "PHP",
        isVerified: true,
        hasPin: Boolean(user.pinCode),
        pinCode: user.pinCode || null,
        googleId: null,
        googleEmail: null,
        authProvider: user.authProvider || "email",
        hasPassword: true,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to disconnect Google account." });
  }
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
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

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
    // Canonical user scoping: match both user ID and email
    let userIds: string[] = userId ? [userId] : [];
    let userDoc: any = null;
    if (userId) {
      userDoc = await (UserModel as any).findOne({
        $or: [{ id: userId }, { email: userId.toLowerCase().trim() }]
      }).lean().exec();
      if (userDoc) {
        if (userDoc.id && !userIds.includes(userDoc.id)) userIds.push(userDoc.id);
        if (userDoc.email && !userIds.includes(userDoc.email)) userIds.push(userDoc.email);
      }
    }

    const txQuery: any = userIds.length > 0 ? { userId: { $in: userIds } } : { userId: "__none__" };
    const debtQuery: any = userIds.length > 0
      ? { $or: [{ userId: { $in: userIds } }, { userId: "" }, { userId: { $exists: false } }] }
      : { userId: "__none__" };
    const goalQuery: any = userIds.length > 0
      ? { $or: [{ userId: { $in: userIds } }, { userId: "" }, { userId: { $exists: false } }] }
      : { userId: "__none__" };
    const catQuery: any = userIds.length > 0 ? { userId: { $in: userIds } } : { userId: "__none__" };
    const accQuery: any = userIds.length > 0
      ? { $or: [{ userId: { $in: userIds } }, { userId: "" }, { userId: { $exists: false } }] }
      : {};

    const [transactions, fetchedCategories, accounts, currencies, debts, goals, profileDocFromDb] =
      await Promise.all([
        (TransactionModel as any).find(txQuery).sort({ date: -1, timestamp: -1, _id: -1 }).lean().exec(),
        (CategoryModel as any).find(catQuery).sort({ order: 1, _id: 1 }).lean().exec(),
        (AccountModel as any).find(accQuery).sort({ order: 1, _id: 1 }).lean().exec(),
        (CurrencyModel as any).find({}).lean().exec(),
        (DebtModel as any).find(debtQuery).sort({ date: -1 }).lean().exec(),
        (GoalModel as any).find(goalQuery).lean().exec(),
        (UserProfileModel as any)
          .findOne(
            userIds.length > 0
              ? { $or: [{ userId: { $in: userIds } }, ...userIds.map((uid) => ({ singletonId: `profile_${uid}` }))] }
              : { singletonId: "default_profile" }
          )
          .lean()
          .exec(),
      ]);

    let categories = fetchedCategories || [];
    if (userId && categories.length === 0) {
      // Default categories for new accounts:
      // Expense: Food & Drink, Transport, Bills, and Shopping ONLY
      // Income: Salary, Allowance, Cash In, Freelance, Business
      const defaultUserCats = [
        // Income
        {
          id: `cat-salary`,
          userId,
          name: 'Salary',
          type: 'income',
          color: '#059669',
          icon: 'Briefcase',
          order: 0,
          isDefault: true,
        },
        {
          id: `cat-allowance`,
          userId,
          name: 'Allowance',
          type: 'income',
          color: '#10B981',
          icon: 'Coins',
          order: 1,
          isDefault: true,
        },
        {
          id: `cat-cash-in`,
          userId,
          name: 'Cash In',
          type: 'income',
          color: '#0D9488',
          icon: 'Banknote',
          order: 2,
          isDefault: true,
        },
        {
          id: `cat-freelance`,
          userId,
          name: 'Freelance',
          type: 'income',
          color: '#2563EB',
          icon: 'Laptop',
          order: 3,
          isDefault: true,
        },
        {
          id: `cat-business`,
          userId,
          name: 'Business',
          type: 'income',
          color: '#4F46E5',
          icon: 'CircleDollarSign',
          order: 4,
          isDefault: true,
        },
        // Expense (Food & Drink, Transport, Bills, Shopping ONLY)
        {
          id: `cat-food-drink`,
          userId,
          name: 'Food & Drink',
          type: 'expense',
          color: '#E11D48',
          icon: 'Utensils',
          order: 0,
          isDefault: true,
        },
        {
          id: `cat-transport`,
          userId,
          name: 'Transport',
          type: 'expense',
          color: '#0284C7',
          icon: 'Car',
          order: 1,
          isDefault: true,
        },
        {
          id: `cat-bills`,
          userId,
          name: 'Bills',
          type: 'expense',
          color: '#EA580C',
          icon: 'Receipt',
          order: 2,
          isDefault: true,
        },
        {
          id: `cat-shopping`,
          userId,
          name: 'Shopping',
          type: 'expense',
          color: '#9333EA',
          icon: 'ShoppingBag',
          order: 3,
          isDefault: true,
        },
      ];

      try {
        await (CategoryModel as any).insertMany(defaultUserCats);
        categories = defaultUserCats;
      } catch {
        categories = defaultUserCats;
      }
    } else if (categories.length > 0) {
      // Deduplicate categories by name and type, remove any legacy accountId, and preserve order
      const seen = new Set<string>();
      const cleanedCats: any[] = [];
      for (const c of categories) {
        const key = `${(c.name || '').toLowerCase().trim()}_${c.type}`;
        if (!seen.has(key)) {
          seen.add(key);
          const { accountId, ...rest } = c;
          cleanedCats.push(rest);
        }
      }
      // Ensure 'Cash In' is available in income categories
      const hasCashIn = cleanedCats.some(
        (c: any) => c.type === 'income' && (c.name || '').toLowerCase() === 'cash in'
      );
      if (!hasCashIn) {
        const cashInCat = {
          id: `cat-cash-in-${Date.now()}`,
          userId: userId || '',
          name: 'Cash In',
          type: 'income',
          color: '#0D9488',
          icon: 'Banknote',
          order: 2,
          isDefault: true,
        };
        cleanedCats.push(cashInCat);
        if (userId) {
          (CategoryModel as any).create(cashInCat).catch(() => {});
        }
      }
      cleanedCats.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      categories = cleanedCats;
    }

    let profileDoc: any = profileDocFromDb;
    let userObj: any = null;
    if (userId) {
      userObj = await (UserModel as any)
        .findOne({ $or: [{ id: userId }, { email: String(userId).toLowerCase().trim() }] })
        .lean()
        .exec();
      if (userObj) {
        const finalAvatar =
          userObj.avatarUrl !== undefined
            ? userObj.avatarUrl
            : (profileDocFromDb?.avatarUrl || "");
        profileDoc = {
          nickname: userObj.nickname || profileDocFromDb?.nickname || "User",
          email: userObj.email, // Authoritative email of this authenticated user account
          avatarUrl: finalAvatar,
          userId: userObj.id,
        };
      }
    }

    let settingsDoc: any = null;
    if (userId) {
      settingsDoc = await (UserSettingsModel as any)
        .findOne({ $or: [{ userId }, { singletonId: `settings_${userId}` }] })
        .lean()
        .exec();

      if (!settingsDoc || !settingsDoc.defaultCurrency) {
        if (!userObj) {
          userObj = await (UserModel as any).findOne({ id: userId }).lean().exec();
        }
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
      if (userId) {
        const fallbackCurr = userObj?.defaultCurrency || "PHP";
        settingsDoc = {
          userId,
          singletonId: `settings_${userId}`,
          defaultCurrency: fallbackCurr,
          primaryCurrency: fallbackCurr,
          soundEnabled: true,
          autoBackup: true,
        };
      } else {
        settingsDoc = await (UserSettingsModel as any)
          .findOne({ singletonId: "default_settings" })
          .lean()
          .exec();
      }
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
        accounts: accounts || [],
        currencies: currencies || [],
        debts: debts || [],
        goals: goals || [],
        settings: settingsDoc || null,
        profile: profileDoc || null,
        user: userObj
          ? (() => {
              const isGoogle = Boolean(
                userObj.authProvider === "google" ||
                userObj.googleId ||
                userObj.googleEmail ||
                userObj.id?.startsWith("google_") ||
                (userObj.password && userObj.password.startsWith("google_oauth_"))
              );
              return {
                id: userObj.id,
                email: userObj.email,
                nickname: userObj.nickname,
                avatarUrl: userObj.avatarUrl,
                defaultCurrency: userObj.defaultCurrency || "PHP",
                googleId: userObj.googleId || (userObj.id?.startsWith("google_") ? userObj.id.replace("google_", "") : (isGoogle ? userObj.id : null)),
                googleEmail: userObj.googleEmail || (isGoogle ? userObj.email : null),
                authProvider: userObj.authProvider || (isGoogle ? "google" : "email"),
                hasPassword: Boolean(userObj.password && !userObj.password.startsWith("google_oauth_")),
                hasPin: Boolean(userObj.pinCode),
                isVerified: userObj.isVerified,
              };
            })()
          : null,
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

  const rawUserId =
    req.body.userId ||
    (req.headers["x-user-id"] as string) ||
    (req.query.userId as string) ||
    "";
  const { transactions, categories, accounts, currencies, debts, goals, settings, profile } = req.body;

  try {
    let canonicalUserId = rawUserId;
    if (rawUserId) {
      const userDoc = await (UserModel as any).findOne({
        $or: [{ id: rawUserId }, { email: rawUserId.toLowerCase().trim() }]
      }).lean().exec();
      if (userDoc?.id) {
        canonicalUserId = userDoc.id;
      }
    }
    const userId = canonicalUserId;

    const promises: Promise<any>[] = [];

    // Transactions: enforce user-scoping so transactions are strictly unique to each user
    if (userId && Array.isArray(transactions)) {
      const userTxList = transactions.map((t: any) => {
        const { _id, ...cleanTx } = t;
        return {
          ...cleanTx,
          userId,
          timestamp: typeof cleanTx.timestamp === 'number' && !isNaN(cleanTx.timestamp) ? cleanTx.timestamp : Date.now(),
        };
      });
      const activeIds = userTxList.map((t: any) => t.id).filter(Boolean);

      // Only clean up removed transactions when an active transaction list is explicitly provided
      if (req.body.isFullReplace) {
        await (TransactionModel as any).deleteMany({
          userId: { $in: [userId, rawUserId] },
          ...(activeIds.length > 0 ? { id: { $nin: activeIds } } : {}),
        });
      }

      if (userTxList.length > 0) {
        promises.push(
          (TransactionModel as any).bulkWrite(
            userTxList.map((t: any) => ({
              updateOne: {
                filter: { id: t.id },
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
      const activeCatIds = categories.map((c: any) => c.id).filter(Boolean);
      if (userId) {
        if (activeCatIds.length > 0 && req.body.isFullReplace) {
          await (CategoryModel as any).deleteMany({
            userId,
            id: { $nin: activeCatIds },
          });
        }

        if (categories.length > 0) {
          promises.push(
            (CategoryModel as any).bulkWrite(
              categories.map((c: any, index: number) => {
                const { accountId, ...cleanedCat } = c;
                const order = typeof c.order === 'number' ? c.order : index;
                return {
                  updateOne: {
                    filter: { id: c.id, userId },
                    update: { $set: { ...cleanedCat, order, userId } },
                    upsert: true,
                  },
                };
              })
            )
          );
        }
      } else {
        if (activeCatIds.length > 0 && req.body.isFullReplace) {
          await (CategoryModel as any).deleteMany({ id: { $nin: activeCatIds } });
        }
        if (categories.length > 0) {
          promises.push(
            (CategoryModel as any).bulkWrite(
              categories.map((c: any, index: number) => {
                const { accountId, ...cleanedCat } = c;
                const order = typeof c.order === 'number' ? c.order : index;
                return {
                  updateOne: {
                    filter: { id: c.id },
                    update: { $set: { ...cleanedCat, order } },
                    upsert: true,
                  },
                };
              })
            )
          );
        }
      }
    }

    if (Array.isArray(accounts) && accounts.length > 0) {
      const activeAccIds = accounts.map((a: any) => a.id).filter(Boolean);
      if (activeAccIds.length > 0 && req.body.isFullReplace) {
        const accDelFilter: any = { id: { $nin: activeAccIds } };
        if (userId) {
          accDelFilter.$or = [{ userId }, { userId: "" }, { userId: { $exists: false } }];
        }
        await (AccountModel as any).deleteMany(accDelFilter);
      }

      if (accounts.length > 0) {
        promises.push(
          (AccountModel as any).bulkWrite(
            accounts.map((a: any) => ({
              updateOne: {
                filter: { id: a.id },
                update: { $set: { ...a, userId: a.userId || userId || "" } },
                upsert: true,
              },
            }))
          )
        );
      }
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
          { upsert: true, returnDocument: 'after' }
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
      // Exclude avatarUrl from bulk sync to prevent older devices from clobbering profile photos
      const { avatarUrl: _syncedAvatar, ...restProfile } = profile;
      const filter = userId
        ? { $or: [{ userId }, { singletonId: `profile_${userId}` }] }
        : { singletonId: "default_profile" };
      promises.push(
        (UserProfileModel as any).findOneAndUpdate(
          filter,
          {
            $set: {
              ...restProfile,
              userId: userId || "",
              singletonId: userId ? `profile_${userId}` : "default_profile",
            },
          },
          { upsert: true, returnDocument: 'after' }
        )
      );
    }

    await Promise.all(promises);
    broadcastToUser(rawUserId, { type: "sync_updated" });
    res.json({ success: true, message: "Records synchronized successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to sync data" });
  }
});

// Real-time Server-Sent Events (SSE) Client Registry
const sseClients = new Map<string, Set<any>>();

function broadcastToUser(rawUserId: string, payload: any) {
  if (!rawUserId) return;
  const targetIds = new Set<string>();
  targetIds.add(rawUserId.toLowerCase().trim());
  if (payload.userId) {
    targetIds.add(String(payload.userId).toLowerCase().trim());
  }
  if (payload.email) {
    targetIds.add(String(payload.email).toLowerCase().trim());
  }
  if (Array.isArray(payload.userIds)) {
    payload.userIds.forEach((id: string) => {
      if (id) targetIds.add(String(id).toLowerCase().trim());
    });
  }
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  const sentClients = new Set<any>();
  for (const tid of targetIds) {
    const clients = sseClients.get(tid);
    if (clients) {
      for (const client of clients) {
        if (!sentClients.has(client)) {
          sentClients.add(client);
          try {
            client.write(msg);
          } catch {
            clients.delete(client);
          }
        }
      }
    }
  }
}

// Real-Time SSE Stream Endpoint
app.get("/api/db/events", async (req, res) => {
  const rawUserId =
    (req.query.userId as string) ||
    (req.headers["x-user-id"] as string) ||
    "";
  if (!rawUserId) {
    res.status(400).end();
    return;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  const userKey = rawUserId.toLowerCase().trim();
  if (!sseClients.has(userKey)) {
    sseClients.set(userKey, new Set());
  }
  sseClients.get(userKey)!.add(res);

  // Link canonical user ID and email
  try {
    await connectDB();
    const userDoc = await (UserModel as any).findOne({
      $or: [{ id: rawUserId }, { email: rawUserId.toLowerCase().trim() }]
    }).lean().exec();
    if (userDoc) {
      if (userDoc.id && userDoc.id.toLowerCase().trim() !== userKey) {
        const k = userDoc.id.toLowerCase().trim();
        if (!sseClients.has(k)) sseClients.set(k, new Set());
        sseClients.get(k)!.add(res);
      }
      if (userDoc.email && userDoc.email.toLowerCase().trim() !== userKey) {
        const k = userDoc.email.toLowerCase().trim();
        if (!sseClients.has(k)) sseClients.set(k, new Set());
        sseClients.get(k)!.add(res);
      }
    }
  } catch {}

  // Initial connection handshake
  res.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);

  // Heartbeat ping every 15s to keep connection alive
  const pingInterval = setInterval(() => {
    try {
      res.write(": ping\n\n");
    } catch {
      clearInterval(pingInterval);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(pingInterval);
    for (const [, clients] of sseClients.entries()) {
      clients.delete(res);
    }
  });
});

// Single Transaction Creation (Real-time Broadcast)
app.post("/api/db/transactions", async (req, res) => {
  const rawUserId = (req.body.userId as string) || (req.headers["x-user-id"] as string) || "";
  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({ success: false, error: "Database not connected" });
    return;
  }

  try {
    let canonicalUserId = rawUserId;
    let userIds: string[] = rawUserId ? [rawUserId] : [];
    if (rawUserId) {
      const userDoc = await (UserModel as any).findOne({
        $or: [{ id: rawUserId }, { email: rawUserId.toLowerCase().trim() }]
      }).lean().exec();
      if (userDoc) {
        if (userDoc.id) {
          canonicalUserId = userDoc.id;
          if (!userIds.includes(userDoc.id)) userIds.push(userDoc.id);
        }
        if (userDoc.email && !userIds.includes(userDoc.email)) userIds.push(userDoc.email);
      }
    }

    const { _id, ...cleanTx } = req.body;
    cleanTx.userId = canonicalUserId;
    cleanTx.timestamp = typeof cleanTx.timestamp === 'number' && !isNaN(cleanTx.timestamp) ? cleanTx.timestamp : Date.now();

    const savedDoc = await (TransactionModel as any).findOneAndUpdate(
      { id: cleanTx.id },
      { $set: cleanTx },
      { upsert: true, returnDocument: 'after' }
    ).lean().exec();

    // Broadcast in real-time to all other devices for this user
    broadcastToUser(rawUserId, {
      type: "transaction_saved",
      transaction: savedDoc || cleanTx,
      userIds,
    });

    res.json({ success: true, transaction: savedDoc || cleanTx });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single Transaction Update (Real-time Broadcast)
app.put("/api/db/transactions/:id", async (req, res) => {
  const rawUserId = (req.body.userId as string) || (req.headers["x-user-id"] as string) || (req.query.userId as string) || "";
  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({ success: false, error: "Database not connected" });
    return;
  }

  try {
    let canonicalUserId = rawUserId;
    let userIds: string[] = rawUserId ? [rawUserId] : [];
    if (rawUserId) {
      const userDoc = await (UserModel as any).findOne({
        $or: [{ id: rawUserId }, { email: rawUserId.toLowerCase().trim() }]
      }).lean().exec();
      if (userDoc) {
        if (userDoc.id) {
          canonicalUserId = userDoc.id;
          if (!userIds.includes(userDoc.id)) userIds.push(userDoc.id);
        }
        if (userDoc.email && !userIds.includes(userDoc.email)) userIds.push(userDoc.email);
      }
    }

    const { _id, ...cleanTx } = req.body;
    cleanTx.userId = canonicalUserId || cleanTx.userId;

    const updatedDoc = await (TransactionModel as any).findOneAndUpdate(
      { id: req.params.id },
      { $set: cleanTx },
      { upsert: true, returnDocument: 'after' }
    ).lean().exec();

    // Broadcast in real-time to all devices
    broadcastToUser(rawUserId, {
      type: "transaction_updated",
      transaction: updatedDoc || cleanTx,
      userIds,
    });

    res.json({ success: true, transaction: updatedDoc || cleanTx });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Single Transaction Deletion (Real-time Broadcast)
app.delete("/api/db/transactions/:id", async (req, res) => {
  const rawUserId = (req.query.userId as string) || (req.headers["x-user-id"] as string) || "";
  const connected = await connectDB();
  if (!connected) {
    res.status(503).json({ success: false, error: "Database not connected" });
    return;
  }

  try {
    let userIds: string[] = rawUserId ? [rawUserId] : [];
    if (rawUserId) {
      const userDoc = await (UserModel as any).findOne({
        $or: [{ id: rawUserId }, { email: rawUserId.toLowerCase().trim() }]
      }).lean().exec();
      if (userDoc) {
        if (userDoc.id && !userIds.includes(userDoc.id)) userIds.push(userDoc.id);
        if (userDoc.email && !userIds.includes(userDoc.email)) userIds.push(userDoc.email);
      }
    }

    const filter: any = { id: req.params.id };
    if (userIds.length > 0) {
      filter.userId = { $in: userIds };
    }

    const result = await (TransactionModel as any).deleteOne(filter);
    if (result.deletedCount === 0) {
      await (TransactionModel as any).deleteOne({ id: req.params.id });
    }

    // Broadcast deletion in real-time to all connected devices!
    broadcastToUser(rawUserId, {
      type: "transaction_deleted",
      id: req.params.id,
      userIds,
    });

    res.json({ success: true, deletedId: req.params.id });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
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
  const userId = (req.query.userId as string) || (req.headers["x-user-id"] as string) || "";
  const connected = await connectDB();
  if (connected) {
    const filter: any = { id: req.params.id };
    if (userId) filter.userId = userId;
    await CategoryModel.deleteOne(filter).catch(() => {});
  }
  res.json({ success: true });
});

// Category Reordering (Fast direct update)
app.post("/api/db/categories/reorder", async (req, res) => {
  const userId = (req.body.userId as string) || (req.headers["x-user-id"] as string) || "";
  const { categories } = req.body;
  if (!Array.isArray(categories)) {
    res.status(400).json({ error: "Invalid categories list" });
    return;
  }
  const connected = await connectDB();
  if (connected) {
    try {
      const bulkOps = categories.map((cat: any, index: number) => {
        const order = typeof cat.order === "number" ? cat.order : index;
        const { accountId, ...cleanedCat } = cat;
        return {
          updateOne: {
            filter: userId ? { id: cat.id, userId } : { id: cat.id },
            update: {
              $set: {
                ...cleanedCat,
                order,
                ...(userId ? { userId } : {}),
              },
            },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) {
        await (CategoryModel as any).bulkWrite(bulkOps);
      }
      res.json({ success: true });
      return;
    } catch (err: any) {
      console.error("Error reordering categories:", err);
      res.status(500).json({ error: err.message });
      return;
    }
  }
  res.json({ success: true });
});

// Account Reordering (Fast direct update)
app.post("/api/db/accounts/reorder", async (req, res) => {
  const userId = (req.body.userId as string) || (req.headers["x-user-id"] as string) || "";
  const { accounts } = req.body;
  if (!Array.isArray(accounts)) {
    res.status(400).json({ error: "Invalid accounts list" });
    return;
  }
  const connected = await connectDB();
  if (connected) {
    try {
      const bulkOps = accounts.map((acc: any, index: number) => {
        const order = typeof acc.order === "number" ? acc.order : index;
        return {
          updateOne: {
            filter: userId ? { id: acc.id, userId } : { id: acc.id },
            update: {
              $set: {
                ...acc,
                order,
                ...(userId ? { userId } : {}),
              },
            },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) {
        await (AccountModel as any).bulkWrite(bulkOps);
      }

      // Clean up any accounts not in the reordered list
      const activeIds = accounts.map((a: any) => a.id);
      const delFilter: any = { id: { $nin: activeIds } };
      if (userId) {
        delFilter.$or = [{ userId }, { userId: "" }, { userId: { $exists: false } }];
      }
      await (AccountModel as any).deleteMany(delFilter).catch(() => {});

      res.json({ success: true });
      return;
    } catch (err: any) {
      console.error("Error reordering accounts:", err);
      res.status(500).json({ error: err.message });
      return;
    }
  }
  res.json({ success: true });
});

// Single Account Deletion
app.delete("/api/db/accounts/:id", async (req, res) => {
  const connected = await connectDB();
  if (connected) {
    await AccountModel.deleteOne({ id: req.params.id }).catch(() => {});
  }
  res.json({ success: true });
});

async function startServer() {
  let fileDir = process.cwd();
  try {
    if (typeof import.meta !== "undefined" && import.meta?.url) {
      fileDir = path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {}

  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    // In development mode (NODE_ENV=development): Mount Vite middleware
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite development middleware mounted successfully");
    } catch (err) {
      console.warn("Could not start Vite dev middleware, falling back to static files:", err);
      const distPath = path.resolve(process.cwd(), "dist");
      if (fs.existsSync(path.join(distPath, "index.html"))) {
        app.use(express.static(distPath));
        app.get("*", (_req, res) => {
          res.sendFile(path.join(distPath, "index.html"));
        });
      }
    }
  } else {
    // In production mode (NODE_ENV=production): Serve static assets from dist
    const candidateDistPaths = [
      path.resolve(process.cwd(), "dist"),
      path.resolve(fileDir, "dist"),
      path.resolve(process.cwd(), "build"),
      path.resolve(fileDir, "build"),
    ];

    const distPath =
      candidateDistPaths.find((p) => fs.existsSync(path.join(p, "index.html"))) ||
      candidateDistPaths[0];
    const hasDist = fs.existsSync(path.join(distPath, "index.html"));

    if (hasDist) {
      console.log(`Serving static production build from: ${distPath}`);
      app.use(express.static(distPath));
      app.get("*", (_req, res) => {
        const indexPath = path.join(distPath, "index.html");
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath, (err) => {
            if (err && !res.headersSent) {
              res.status(200).send("<!DOCTYPE html><html><head><title>Wallo</title></head><body><div id='root'></div></body></html>");
            }
          });
        } else {
          res.status(200).send("<!DOCTYPE html><html><head><title>Wallo</title></head><body><div id='root'></div></body></html>");
        }
      });
    } else {
      console.warn("Production build dist/index.html not found, serving fallback.");
      app.get("*", (_req, res) => {
        res.status(200).send("<!DOCTYPE html><html><head><title>Wallo</title></head><body><div id='root'></div></body></html>");
      });
    }
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Budget Tracker server running on http://0.0.0.0:${PORT}`);
  });

  server.on("error", (err: any) => {
    console.error("Server listen error:", err);
  });
}

// In standard environments, start the Express dev/prod server
if (!process.env.VERCEL) {
  startServer();
}

export default app;
