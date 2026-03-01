import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { config } from '../config';

export interface IUser extends Document {
  email: string;
  password?: string;
  displayName: string;
  role: string;
  authProvider: 'local' | 'entra_id';
  isActive: boolean;
  avatarUrl?: string;
  jobTitle?: string;
  department?: string;
  phone?: string;
  entraId?: string;
  groups?: string[];
  lastLogin?: Date;
  mfaEnabled?: boolean;
  inviteToken?: string;
  inviteExpires?: Date;
  inviteAccepted?: boolean;
  resetToken?: string;
  resetExpires?: Date;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function (this: IUser) {
        // Password required for local users who have accepted invite (or were directly created)
        return this.authProvider === 'local' && this.inviteAccepted !== false;
      },
      minlength: 12,
    },
    displayName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: [
        'platform_admin',
        'admin',
        'it_operations',
        'security_analyst',
        'executive_viewer',
        'user',
        'viewer',
      ],
      default: 'user',
    },
    authProvider: {
      type: String,
      enum: ['local', 'entra_id'],
      default: 'local',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatarUrl: String,
    jobTitle: String,
    department: String,
    phone: String,
    inviteToken: {
      type: String,
      sparse: true,
      index: true,
    },
    inviteExpires: Date,
    inviteAccepted: {
      type: Boolean,
      default: false,
    },
    resetToken: {
      type: String,
      sparse: true,
      index: true,
    },
    resetExpires: Date,
    emailVerified: {
      type: Boolean,
      default: false,
    },
    entraId: {
      type: String,
      sparse: true,
      unique: true,
    },
    groups: [String],
    lastLogin: Date,
    mfaEnabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  try {
    this.password = await bcrypt.hash(this.password, config.bcryptRounds);
    next();
  } catch (error: any) {
    next(error);
  }
});

// Compare password
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Strip password from JSON output
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

export const User = mongoose.model<IUser>('User', userSchema);
