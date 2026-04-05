import { inngest } from "../client";
import { connectToDB } from "@/lib/database/db";
import User from "@/lib/database/models/user.model";
import { Agent } from "@/lib/database/models/agent.model";
import { clerkClient } from "@clerk/nextjs/server";

export const universalMasterCron = inngest.createFunction(
  { 
    id: "universal-master-cron",
    triggers: [{ cron: "* * * * *" }] // The 1-minute heartbeat
  },
  async ({ step }) => { 
    
    await connectToDB();
    const now = Date.now();
    const allEventsToDispatch: any[] = [];

    // ==========================================================
    // 1. GMAIL SYNC DISPATCHER
    // ==========================================================
    const emailEvents = await step.run("gather-email-syncs", async () => {
      // Find users who have sync enabled (or users who don't have it set, we'll assume they want it)
      const users = await User.find({});
      const client = await clerkClient();
      const events: any[] = []; 

      for (const user of users) {
        const lastSynced = user.syncSettings?.lastSyncedTimestamp || 0;
        
        // 🚨 FIX 1: Default to 2 minutes instead of 1440!
        const intervalMs = (user.syncSettings?.autoSyncInterval || 2) * 60 * 1000;
        
        if (now - lastSynced >= intervalMs) {
          try {
            // 🚨 FIX 2: Use 'google', not 'oauth_google'
            const tokenRes = await client.users.getUserOauthAccessToken(user.clerkId, 'google');
            const token = tokenRes.data[0]?.token;
            
            if (token) {
              events.push({
                name: "gmail/sync.requested", 
                data: {
                  userId: user.clerkId,
                  accessToken: token,
                  after: new Date(lastSynced || Date.now() - 86400000).toISOString(),
                  before: new Date().toISOString(),
                  autoSyncInterval: user.syncSettings?.autoSyncInterval || 2
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
      const activeAgents = await Agent.find({ status: "ACTIVE" });
      const events: any[] = []; 
      
      const nowIST = new Date(now).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", hour12: false });
      const currentHourMin = nowIST.split(', ')[1].trim().substring(0, 5);

      for (const agent of activeAgents) {
        const lastRun = agent.lastRunAt?.getTime() || 0;

        // MODE 1: Target Time (e.g., 6:00 AM)
        if (agent.targetTime) {
          const hasRunRecently = (now - lastRun) < (60 * 60 * 1000); 

          if (currentHourMin === agent.targetTime && !hasRunRecently) {
             events.push({
               name: "agent/execute.requested",
               data: { agentId: agent._id.toString(), userId: agent.userId }
             });
          }
        } 
        // MODE 2: Continuous Interval (e.g., every 5 minutes)
        else if (agent.scheduleInterval && agent.scheduleInterval > 0) {
          const intervalMs = agent.scheduleInterval * 60 * 1000;

          if (now - lastRun >= intervalMs) {
            events.push({
              name: "agent/execute.requested",
              data: { agentId: agent._id.toString(), userId: agent.userId }
            });
          }
        }
      }
      return events;
    });

    allEventsToDispatch.push(...agentEvents);

    // ==========================================================
    // FIRE ALL EVENTS IN PARALLEL
    // ==========================================================
    if (allEventsToDispatch.length > 0) {
      await step.sendEvent("dispatch-universal-events", allEventsToDispatch);
    }

    return { totalDispatched: allEventsToDispatch.length };
  }
);