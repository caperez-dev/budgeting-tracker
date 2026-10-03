import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";
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

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

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
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
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
  const cleanNickname = (nickname || cleanEmail.split("@")[0] || "User").trim();

  const connected = await connectDB();
  if (connected) {
    try {
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
      { upsert: true, new: true }
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
        { upsert: true, new: true }
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

// Update user profile credentials (username, email, password, profile picture)
app.post("/api/user/update-profile", async (req, res) => {
  const userId = req.body.userId || (req.headers["x-user-id"] as string);
  const { email, nickname, password, currentPassword, avatarUrl } = req.body;

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

      // Update UserProfileModel strictly scoped to this user
      const profileFilter = userId
        ? { $or: [{ userId }, { singletonId: `profile_${userId}` }] }
        : { singletonId: "default_profile" };

      const profileUpdate: any = {
        userId: userId || "",
        singletonId: userId ? `profile_${userId}` : "default_profile",
      };
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

  const origin =
    getOAuthRedirectOrigin(req, req.query.origin as string) ||
    "https://ais-dev-zbjzs6iojh24oqwmlfkoug-54185673300.asia-southeast1.run.app";
  const redirectUri = `${origin}/auth/callback`;

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
    const origin = getOAuthRedirectOrigin(req);
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
    let user = await (UserModel as any).findOne({ email: cleanEmail });

    if (!user) {
      user = await (UserModel as any).create({
        id: `google_${googleProfile.id || Date.now()}`,
        email: cleanEmail,
        password: `google_oauth_${Math.random().toString(36).slice(2)}`,
        nickname: googleProfile.given_name || googleProfile.name || cleanEmail.split("@")[0],
        avatarUrl: googleProfile.picture || "",
        isVerified: true,
      });
    } else {
      let needsSave = false;
      if (!user.avatarUrl && googleProfile.picture) {
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
      { upsert: true, new: true }
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
        isVerified: true,
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
    const catQuery: any = userId ? { userId } : { userId: "__none__" };
    const accQuery: any = userId
      ? { $or: [{ userId }, { userId: "" }, { userId: { $exists: false } }] }
      : {};

    const [transactions, fetchedCategories, accounts, currencies, debts, goals, profileDocFromDb] =
      await Promise.all([
        (TransactionModel as any).find(txQuery).sort({ date: -1 }).lean().exec(),
        (CategoryModel as any).find(catQuery).sort({ order: 1, _id: 1 }).lean().exec(),
        (AccountModel as any).find(accQuery).sort({ order: 1, _id: 1 }).lean().exec(),
        (CurrencyModel as any).find({}).lean().exec(),
        (DebtModel as any).find(debtQuery).sort({ date: -1 }).lean().exec(),
        (GoalModel as any).find(goalQuery).lean().exec(),
        (UserProfileModel as any)
          .findOne(
            userId
              ? { $or: [{ userId }, { singletonId: `profile_${userId}` }] }
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
      userObj = await (UserModel as any).findOne({ id: userId }).lean().exec();
      if (userObj) {
        profileDoc = {
          nickname: profileDocFromDb?.nickname || userObj.nickname || "User",
          email: userObj.email, // Authoritative email of this authenticated user account
          avatarUrl:
            profileDocFromDb?.avatarUrl !== undefined && profileDocFromDb.avatarUrl !== ""
              ? profileDocFromDb.avatarUrl
              : (userObj.avatarUrl || ""),
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
  const { transactions, categories, accounts, currencies, debts, goals, settings, profile } = req.body;

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

    if (Array.isArray(categories)) {
      const activeCatIds = categories.map((c: any) => c.id);
      if (userId) {
        await (CategoryModel as any).deleteMany({
          userId,
          id: { $nin: activeCatIds },
        });

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
        await (CategoryModel as any).deleteMany({ id: { $nin: activeCatIds } });
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

    if (Array.isArray(accounts)) {
      const activeAccIds = accounts.map((a: any) => a.id);
      const accDelFilter: any = { id: { $nin: activeAccIds } };
      if (userId) {
        accDelFilter.$or = [{ userId }, { userId: "" }, { userId: { $exists: false } }];
      }
      await (AccountModel as any).deleteMany(accDelFilter);

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

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini request timeout")), 5000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
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
        }),
        timeoutPromise,
      ]);

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

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini chat timeout")), 5000)
      );

      const response = await Promise.race([
        ai.models.generateContent({
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
        }),
        timeoutPromise,
      ]);

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
  let fileDir = process.cwd();
  try {
    if (typeof import.meta !== "undefined" && import.meta?.url) {
      fileDir = path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {}

  const isProd =
    process.env.NODE_ENV === "production" || Boolean(process.env.K_SERVICE);

  // In production (Cloud Run), serve static files from dist
  if (isProd) {
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
        res.sendFile(indexPath, (err) => {
          if (err) {
            console.error("Error serving index.html:", err);
            if (!res.headersSent) {
              res
                .status(200)
                .send(
                  "<!DOCTYPE html><html><head><title>Budget Tracker</title></head><body><div id='root'>Budget Tracker is starting...</div></body></html>"
                );
            }
          }
        });
      });
    } else {
      console.warn(
        "Production environment detected, but dist/index.html was not found. Serving fallback page."
      );
      app.get("*", (_req, res) => {
        res
          .status(200)
          .send(
            "<!DOCTYPE html><html><head><title>Budget Tracker</title></head><body><div id='root'>Budget Tracker is starting...</div></body></html>"
          );
      });
    }
  } else {
    // Only in local development: Vite middleware
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.error("Failed to start Vite dev middleware:", err);
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
