import { inngest } from "../client";
import { connectToDB } from "@/lib/database/db";
import User from "@/lib/database/models/user.model";
import { Agent } from "@/lib/database/models/agent.model";
import { clerkClient } from "@clerk/nextjs/server";

export const universalMasterCron = inngest.createFunction(
  { 
    id: "universal-master-cron",
    // Inngest v4 requirement: triggers go INSIDE the options object
    triggers: [{ cron: "*/5 * * * *" }] 
  },
  async ({ step }) => { 
    
    await connectToDB();
    const now = Date.now();
    
    const allEventsToDispatch: any[] = [];

    // ==========================================================
    // 1. GMAIL SYNC DISPATCHER
    // ==========================================================
    const emailEvents = await step.run("gather-email-syncs", async () => {
      const users = await User.find({ "syncSettings.autoSyncInterval": { $gt: 0 } });
      const client = await clerkClient();
      const events: any[] = []; 

      for (const user of users) {
        const lastSynced = user.syncSettings?.lastSyncedTimestamp || 0;
        const intervalMs = (user.syncSettings?.autoSyncInterval || 1440) * 60 * 1000;
        
        if (now - lastSynced >= intervalMs) {
          try {
            const tokenRes = await client.users.getUserOauthAccessToken(user.clerkId, 'oauth_google');
            const token = tokenRes.data[0]?.token;
            if (token) {
              events.push({
                name: "gmail/sync.requested", 
                data: {
                  userId: user.clerkId,
                  accessToken: token,
                  after: new Date(lastSynced || Date.now() - 86400000).toISOString(),
                  before: new Date().toISOString(),
                  autoSyncInterval: user.syncSettings.autoSyncInterval
                }
              });
            }
          } catch (e) {
            console.error(`Token fetch failed for ${user.clerkId}`);
          }
        }
      }
      return events;
    });
    
    allEventsToDispatch.push(...emailEvents);

    // ==========================================================
    // 2. CUSTOM AI AGENT DISPATCHER
    // ==========================================================
    const agentEvents = await step.run("gather-agent-automations", async () => {
      const activeAgents = await Agent.find({ 
        status: "ACTIVE", 
        scheduleInterval: { $gt: 0 } 
      });
      
      const events: any[] = []; 

      for (const agent of activeAgents) {
        const lastRun = agent.lastRunAt?.getTime() || 0;
        const intervalMs = (agent.scheduleInterval || 1440) * 60 * 1000;

        if (now - lastRun >= intervalMs) {
          events.push({
            name: "agent/execute.requested",
            data: {
              agentId: agent._id.toString(),
              userId: agent.userId,
            }
          });
        }
      }
      return events;
    });

    allEventsToDispatch.push(...agentEvents);

    // ==========================================================
    // FIRE ALL EVENTS IN PARALLEL
    // ==========================================================
    if (allEventsToDispatch.length > 0) {
      await step.sendEvent("dispatch-universal-events", allEventsToDispatch as any);
    }

    return { totalDispatched: allEventsToDispatch.length };
  }
);