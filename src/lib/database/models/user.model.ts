import { Schema, model, models } from "mongoose";

const UserSchema = new Schema({
  clerkId: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  photo: {
    type: String,
    required: false,
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  syncSettings: {
    lastSyncedTimestamp: { type: Number, default: 0 },
    oldestSyncedTimestamp: { type: Number, default: 0 }, 
    isInitialSyncDone: { type: Boolean, default: false },
    autoSyncEnabled: { type: Boolean, default: false },
    autoSyncInterval: { type: Number, default: 1440 }, 
    updatedAt: { type: Date }
  }
});

const User = models?.User || model("User", UserSchema);

export default User;