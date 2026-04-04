'use client';

import AgentForm from "@/components/create-agent/create-form";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { getAgents } from "@/lib/actions/agent.actions";
import { useEffect, useState } from "react";
import { Settings2, MessageSquare } from "lucide-react";

export default function Page() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAgents = async () => {
    const data = await getAgents();
    setAgents(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchAgents();
  }, []);

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Agents</h1>
          <p className="text-muted-foreground">Manage your active AI assistants</p>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button>+ New Agent</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Agent</DialogTitle>
              <DialogDescription>Configure a new AI assistant.</DialogDescription>
            </DialogHeader>
            <AgentForm onSuccess={fetchAgents} />
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
             <Card key={i} className="animate-pulse shadow-sm">
               <CardContent className="h-[104px] p-6" />
             </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {agents.map((agent) => (
            <Card key={agent._id} className="shadow-sm hover:shadow-md transition-all">
              {/* Restored default p-6 for a medium, comfortable size */}
              <CardContent className="p-2 flex items-center justify-between">
                
                {/* Left Side: Avatar & Identity */}
                <div className="flex items-center gap-4 overflow-hidden">
                  <Avatar className="h-12 w-12 border bg-muted shrink-0">
                    <AvatarImage src={`https://api.dicebear.com/9.x/bottts/svg?seed=${agent.avatarSeed || agent.name}`} />
                    <AvatarFallback>AI</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex flex-col justify-center min-w-0 gap-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-base truncate">{agent.name}</h3>
                      {/* Active Green Dot */}
                      {agent.status === "ACTIVE" && (
                        <div className="h-2 w-2 rounded-full bg-green-500 shrink-0" />
                      )}
                    </div>
                    {/* Standard Badge */}
                    <Badge variant="secondary" className="w-fit text-xs">
                      {agent.status}
                    </Badge>
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="icon" className="text-muted-foreground hover:text-foreground">
                        <Settings2 className="h-5 w-5" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                      <DialogHeader>
                        <DialogTitle>Configure Agent</DialogTitle>
                        <DialogDescription>Update settings for {agent.name}.</DialogDescription>
                      </DialogHeader>
                      <AgentForm initialData={agent} onSuccess={fetchAgents} />
                    </DialogContent>
                  </Dialog>

                  <Button variant="outline" size="icon" className="text-muted-foreground hover:text-foreground">
                    <MessageSquare className="h-5 w-5" />
                  </Button>
                </div>
                
              </CardContent>
            </Card>
          ))}

          {agents.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl bg-muted/50">
              <p className="text-sm text-muted-foreground">No agents found.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}