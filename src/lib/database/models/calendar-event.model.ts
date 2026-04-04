import { Schema, model, models } from "mongoose";

const CalendarEventSchema = new Schema({
  userId:      { type: String, required: true, index: true },
  title:       { type: String, required: true },
  description: { type: String, default: "" },
  start:       { type: String, required: true }, // ISO datetime string
  end:         { type: String, required: true },  // ISO datetime string
  createdAt:   { type: Date, default: Date.now },
});

const CalendarEventModel =
  models.CalendarEvent || model("CalendarEvent", CalendarEventSchema);

export default CalendarEventModel;
