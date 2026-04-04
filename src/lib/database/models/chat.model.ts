import { Schema, model, models } from "mongoose";

const MessageSchema = new Schema({
  role: { type: String, enum: ["user", "assistant", "system", "tool"], required: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const ChatSchema = new Schema({
  userId: { type: String, required: true, index: true },
  title: { type: String, default: "New Chat" },
  messages: [MessageSchema],
  updatedAt: { type: Date, default: Date.now },
});

const Chat = models.Chat || model("Chat", ChatSchema);
export default Chat;