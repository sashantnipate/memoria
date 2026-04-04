import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { functions } from "@/inngest/function.ts";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: functions
});