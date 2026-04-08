"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { alertSchema } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { Plus } from "lucide-react";
import { useState } from "react";

type AlertFormData = z.infer<typeof alertSchema>;

interface AlertFormProps {
  onSuccess?: () => void;
}

export function AlertForm({ onSuccess }: AlertFormProps) {
  const [recipientInput, setRecipientInput] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AlertFormData>({
    resolver: zodResolver(alertSchema),
    defaultValues: { trigger_type: "negative_article", channel: "email", recipients: [] },
  });

  const recipients = watch("recipients");

  const addRecipient = () => {
    if (recipientInput && recipientInput.includes("@")) {
      setValue("recipients", [...recipients, recipientInput]);
      setRecipientInput("");
    }
  };

  const removeRecipient = (idx: number) => {
    setValue("recipients", recipients.filter((_, i) => i !== idx));
  };

  const onSubmit = async (data: AlertFormData) => {
    try {
      const res = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create alert");
      toast.success("Alert rule created");
      reset();
      onSuccess?.();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm">Trigger Type</Label>
          <select
            {...register("trigger_type")}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="negative_article">Negative Article</option>
            <option value="competitor_positive">Competitor Positive</option>
            <option value="tier1_mention">Tier 1 Mention</option>
            <option value="executive_mention">Executive Mention</option>
            <option value="crisis_keyword">Crisis Keyword</option>
            <option value="mention_spike">Mention Spike</option>
          </select>
        </div>
        <div>
          <Label className="text-sm">Channel</Label>
          <select
            {...register("channel")}
            className="mt-1 w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="email">Email</option>
            <option value="slack">Slack</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="sms">SMS</option>
          </select>
        </div>
      </div>
      <div>
        <Label className="text-sm">Recipients</Label>
        <div className="flex gap-2 mt-1">
          <Input
            value={recipientInput}
            onChange={(e) => setRecipientInput(e.target.value)}
            placeholder="email@example.com"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addRecipient(); } }}
          />
          <Button type="button" variant="outline" onClick={addRecipient}>Add</Button>
        </div>
        {recipients.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {recipients.map((r, i) => (
              <span key={i} className="bg-gray-100 text-sm px-2 py-0.5 rounded-full flex items-center gap-1">
                {r}
                <button type="button" onClick={() => removeRecipient(i)} className="text-gray-400 hover:text-red-500">&times;</button>
              </span>
            ))}
          </div>
        )}
        {errors.recipients && <p className="text-xs text-red-500 mt-1">{errors.recipients.message}</p>}
      </div>
      <Button type="submit" disabled={isSubmitting} className="bg-brand-sky hover:bg-brand-sky/90 text-white">
        <Plus className="w-4 h-4 mr-1" /> Create Alert Rule
      </Button>
    </form>
  );
}
