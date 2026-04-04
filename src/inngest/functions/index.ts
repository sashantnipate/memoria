import { syncGmailProcess } from "./email-sync";
import { universalMasterCron } from "./universal-cron";
import { customAgentWorker } from "./agent-worker";

export const functions = [
  syncGmailProcess,
  universalMasterCron,
  customAgentWorker
];