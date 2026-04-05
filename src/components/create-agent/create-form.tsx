"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { createOrUpdateAgent } from "@/lib/actions/agent.actions";
import { toast } from "sonner";

type AgentFormData = {
  name: string;
  avatarSeed: string;
  systemPrompt: string;
  scheduleInterval: number;
  targetTime: string;
  permissions: {
    canReadMemory: boolean;
    canDraftEmails: boolean;
    canSendEmails: boolean;
  };
  status: "ACTIVE" | "PAUSED";
};

type AgentFormProps = {
  onSuccess?: () => void;
  initialData?: any; 
};

export default function AgentForm({ onSuccess, initialData }: AgentFormProps) {
  const [randomSeed, setRandomSeed] = useState("");
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<AgentFormData>({
    name: initialData?.name || "",
    avatarSeed: initialData?.avatarSeed || "",
    systemPrompt: initialData?.systemPrompt || "",
    scheduleInterval: initialData?.scheduleInterval || 0,
    targetTime: initialData?.targetTime || "",
    permissions: initialData?.permissions || {
      canReadMemory: false,
      canDraftEmails: false,
      canSendEmails: false,
    },
    status: initialData?.status || "ACTIVE",
  });

  useEffect(() => {
    if (!initialData) {
      const seed = Math.random().toString(36).substring(7);
      setRandomSeed(seed);
      setFormData((prev) => ({
        ...prev,
        avatarSeed: seed,
      }));
    }
  }, [initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const seedToSave = formData.avatarSeed || randomSeed;

    const payload = {
      ...formData,
      _id: initialData?._id, 
      avatarSeed: seedToSave 
    };

    const result = await createOrUpdateAgent(payload);

    if (result.success) {
      toast.success("Agent saved successfully!");
      onSuccess?.();
    } else {
      toast.error("Failed to save agent");
    }
    
    setLoading(false);
  };

const avatarUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${formData.avatarSeed || formData.name || 'bot'}`;
  return (
    <form onSubmit={handleSubmit} className="space-y-6 pt-4">
      
      {/* Name & Avatar Row */}
      <div className="flex items-center gap-4">
        <Avatar className="h-16 w-16 border bg-muted shadow-sm">
          <AvatarImage src={avatarUrl} alt="Agent Avatar" />
          <AvatarFallback className="bg-primary/10 text-primary">AI</AvatarFallback>
        </Avatar>
        <div className="space-y-2 flex-1">
          <Label htmlFor="name">Agent Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, 
                name: e.target.value,
                avatarSeed: e.target.value,
              })
            }
            placeholder="e.g. SalesBot 9000"
          />
        </div>
      </div>

      {/* System Prompt */}
      <div className="space-y-2">
        <Label htmlFor="prompt">System Prompt</Label>
        <Textarea
          id="prompt"
          value={formData.systemPrompt}
          onChange={(e) =>
            setFormData({
              ...formData,
              systemPrompt: e.target.value,
            })
          }
          placeholder="Describe what this agent does..."
          className="min-h-[100px] resize-none"
        />
      </div>

      {/* Timing & Scheduling Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-muted/30 p-4 rounded-xl border border-border/50">
        <div className="space-y-2">
          <Label htmlFor="scheduleInterval">Interval (Minutes)</Label>
          <Input
            id="scheduleInterval"
            type="number"
            min="0"
            value={formData.scheduleInterval || ""}
            onChange={(e) =>
              setFormData({ ...formData, scheduleInterval: parseInt(e.target.value) || 0 })
            }
            placeholder="e.g. 5, 60, 1440"
          />
          <p className="text-[10px] text-muted-foreground">0 = Event Driven | 60 = Hourly | 1440 = Daily</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="targetTime">Target Time (24h)</Label>
          <Input
            id="targetTime"
            type="time"
            value={formData.targetTime}
            onChange={(e) =>
              setFormData({ ...formData, targetTime: e.target.value })
            }
          />
          <p className="text-[10px] text-muted-foreground">Leave blank to use Interval only.</p>
        </div>
      </div>

      {/* Permissions and Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Permissions */}
        <div className="space-y-3">
          <Label>Permissions</Label>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="read-memory"
              checked={formData.permissions.canReadMemory}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  permissions: {
                    ...formData.permissions,
                    canReadMemory: !!checked,
                  },
                })
              }
            />
            <Label htmlFor="read-memory" className="font-normal cursor-pointer">Can Read Memory</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="draft-emails"
              checked={formData.permissions.canDraftEmails}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  permissions: {
                    ...formData.permissions,
                    canDraftEmails: !!checked,
                  },
                })
              }
            />
            <Label htmlFor="draft-emails" className="font-normal cursor-pointer">Can Draft Emails</Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="send-emails"
              checked={formData.permissions.canSendEmails}
              onCheckedChange={(checked) =>
                setFormData({
                  ...formData,
                  permissions: {
                    ...formData.permissions,
                    canSendEmails: !!checked,
                  },
                })
              }
            />
            <Label htmlFor="send-emails" className="font-normal cursor-pointer">Can Send Emails</Label>
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label>Status</Label>
          <Select
            value={formData.status}
            onValueChange={(value: "ACTIVE" | "PAUSED") =>
              setFormData({ ...formData, status: value })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ACTIVE">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  Active
                </div>
              </SelectItem>
              <SelectItem value="PAUSED">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  Paused
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Submit */}
      <div className="flex justify-end pt-4">
        <Button 
          type="submit" 
          className="w-full sm:w-auto" 
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Agent"}
        </Button>
      </div>
    </form>
  );
}