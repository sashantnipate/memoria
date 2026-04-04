import mongoose, { Schema, models } from "mongoose";

const EmailMemorySchema = new Schema({
  userId: { type: String, required: true, index: true }, 
  gmailId: { type: String, required: true, unique: true },
  threadId: { type: String },
  subject: { type: String },
  from: { type: String },
  to: { type: String },
  date: { type: String },
  snippet: { type: String },
  body: { type: String },
  embedding: { 
    type: [Number], 
    index: false
  }, 
  internalDate: { type: Number, required: true, index: true }, 
}, { timestamps: true });

const EmailMemory = models.EmailMemory || mongoose.model("EmailMemory", EmailMemorySchema);
export default EmailMemory;