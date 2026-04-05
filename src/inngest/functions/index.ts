import { syncGmailProcess } from "./email-sync";
import { universalMasterCron } from "./universal-cron";
import { customAgentWorker } from "./agent-worker";
import { inboxObserver } from "./inbox-observer";

export const functions = [
  syncGmailProcess,
  universalMasterCron,
  customAgentWorker,
  inboxObserver
];