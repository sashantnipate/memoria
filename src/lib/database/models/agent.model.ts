import mongoose, { Schema, Document } from "mongoose";

export interface IAgent extends Document {
  userId: string;
  name: string;
  avatarSeed: string;
  systemPrompt: string;
  permissions: {
    canReadMemory: boolean;
    canDraftEmails: boolean;
    canSendEmails: boolean;
  };
  status: "ACTIVE" | "PAUSED";
  scheduleInterval: number;  
  lastRunAt: Date | null;
  createdAt: Date;
  
}

const AgentSchema = new Schema<IAgent>({
  userId: { type: String, required: true, index: true }, 
  name: { type: String, required: true },
  avatarSeed: { type: String },
  systemPrompt: { type: String, required: true },
  permissions: {
    canReadMemory: { type: Boolean, default: false },
    canDraftEmails: { type: Boolean, default: false },
    canSendEmails: { type: Boolean, default: false },
  },
  status: { type: String, enum: ["ACTIVE", "PAUSED"], default: "ACTIVE" },
  scheduleInterval: { type: Number, default: 0 }, 
  lastRunAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
});

export const Agent = mongoose.models.Agent || mongoose.model<IAgent>("Agent", AgentSchema);