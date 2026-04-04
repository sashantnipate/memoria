import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { syncGmailProcess } from "@/inngest/functions"; // We will build this next

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    syncGmailProcess, 
  ],
});