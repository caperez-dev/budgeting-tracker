import mongoose from 'mongoose';

let isConnected = false;
let connectionError: string | null = null;

export async function connectDB(): Promise<boolean> {
  const uri = process.env.MONGODB_URI;

  if (!uri || !uri.trim()) {
    isConnected = false;
    connectionError = 'MONGODB_URI environment variable is not configured.';
    return false;
  }

  // Check if user still has placeholder in their URI
  if (uri.includes('<db_password>') || uri.includes('<password>')) {
    isConnected = false;
    connectionError = 'Please replace <db_password> in your MONGODB_URI with your database user password.';
    return false;
  }

  if (isConnected && mongoose.connection.readyState === 1) {
    return true;
  }

  try {
    // Set connection options
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    connectionError = null;
    console.log('MongoDB connected successfully');
    return true;
  } catch (err: any) {
    isConnected = false;
    connectionError = err.message || 'Failed to connect to MongoDB';
    console.error('MongoDB connection error:', connectionError);
    return false;
  }
}

export function getDBStatus() {
  const uri = process.env.MONGODB_URI;
  const hasUri = Boolean(uri && uri.trim());
  const hasPlaceholder = hasUri && (uri!.includes('<db_password>') || uri!.includes('<password>'));
  
  return {
    configured: hasUri,
    hasPlaceholder,
    connected: isConnected && mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
    error: connectionError,
  };
}

// Schemas & Models
const TransactionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true, default: '' },
    type: { type: String, required: true, enum: ['income', 'expense'] },
    amount: { type: Number, required: true },
    categoryId: { type: String, default: '' },
    note: { type: String, default: '' },
    date: { type: String, required: true },
    time: { type: String, default: '' },
  },
  { timestamps: true }
);

const CategorySchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true, default: '' },
    name: { type: String, required: true },
    type: { type: String, required: true, enum: ['income', 'expense'] },
    icon: { type: String, default: 'Tag' },
    color: { type: String, default: 'bg-zinc-500' },
    isCustom: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const CurrencySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true },
    symbol: { type: String, required: true },
    name: { type: String, required: true },
    exchangeRate: { type: Number, required: true },
    flag: { type: String },
  },
  { timestamps: true, strict: false }
);

const DebtSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true, default: '' },
    person: { type: String, required: true },
    amount: { type: Number, required: true },
    type: { type: String, required: true, enum: ['you_owe', 'owed_to_you'] },
    note: { type: String, default: '' },
    date: { type: String, required: true },
    isSettled: { type: Boolean, default: false },
    settledDate: { type: String },
  },
  { timestamps: true, strict: false }
);

const GoalSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true, default: '' },
    name: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    currentAmount: { type: Number, default: 0 },
    targetDate: { type: String, required: true },
    category: { type: String, default: 'Other' },
    isCompleted: { type: Boolean, default: false },
  },
  { timestamps: true, strict: false }
);

const UserSettingsSchema = new mongoose.Schema(
  {
    singletonId: { type: String, default: 'default_settings', index: true },
    userId: { type: String, index: true, default: '' },
    defaultCurrency: { type: String, default: 'PHP' },
    primaryCurrency: { type: String, default: 'PHP' },
    includeDebtInNetWorth: { type: Boolean, default: false },
    donateInfo: { type: mongoose.Schema.Types.Mixed },
    soundEnabled: { type: Boolean, default: true },
    autoBackup: { type: Boolean, default: true },
    dailyReminder: { type: Boolean, default: false },
    theme: { type: String, default: 'light' },
  },
  { timestamps: true, strict: false }
);

const UserProfileSchema = new mongoose.Schema(
  {
    singletonId: { type: String, default: 'default_profile', index: true },
    userId: { type: String, index: true, default: '' },
    nickname: { type: String, default: 'Carlos' },
    avatarUrl: { type: String, default: '' },
    email: { type: String, default: 'perez.carlos6566@gmail.com' },
  },
  { timestamps: true, strict: false }
);

const UserSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    nickname: { type: String, default: 'Carlos' },
    avatarUrl: { type: String, default: '' },
    defaultCurrency: { type: String, default: 'PHP' },
  },
  { timestamps: true, strict: false }
);

export const TransactionModel: mongoose.Model<any> =
  mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);
export const CategoryModel: mongoose.Model<any> =
  mongoose.models.Category || mongoose.model('Category', CategorySchema);
export const CurrencyModel: mongoose.Model<any> =
  mongoose.models.Currency || mongoose.model('Currency', CurrencySchema);
export const DebtModel: mongoose.Model<any> =
  mongoose.models.Debt || mongoose.model('Debt', DebtSchema);
export const GoalModel: mongoose.Model<any> =
  mongoose.models.Goal || mongoose.model('Goal', GoalSchema);
export const UserSettingsModel: mongoose.Model<any> =
  mongoose.models.UserSettings || mongoose.model('UserSettings', UserSettingsSchema);
export const UserProfileModel: mongoose.Model<any> =
  mongoose.models.UserProfile || mongoose.model('UserProfile', UserProfileSchema);
export const UserModel: mongoose.Model<any> =
  mongoose.models.User || mongoose.model('User', UserSchema);
