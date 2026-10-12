"use client";

import { useEffect, useState } from "react";
import Modal from "./Modal";
import { Bell, Send, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "./Toast";
import type { NotificationSettings } from "@/lib/types";

export default function NotificationSettingsModal({
  isOpen,
  onClose,
  householdId,
  householdName,
}: {
  isOpen: boolean;
  onClose: () => void;
  householdId: string;
  householdName: string;
}) {
  const { success, error: toastError } = useToast();
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [daysBefore, setDaysBefore] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const supabase = createClient();
      const { data } = await supabase
        .from("notification_settings")
        .select("*")
        .eq("household_id", householdId)
        .maybeSingle();

      if (data) {
        setWebhookUrl(data.webhook_url || "");
        setWebhookEnabled(data.webhook_enabled || false);
        setDaysBefore(data.remind_days_before || 1);
      }
      setLoading(false);
    }

    if (isOpen) {
      loadSettings();
    }
  }, [householdId, isOpen]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const supabase = createClient();

    const { error } = await supabase.from("notification_settings").upsert({
      household_id: householdId,
      webhook_url: webhookUrl.trim(),
      webhook_enabled: webhookEnabled,
      remind_days_before: daysBefore,
      updated_at: new Date().toISOString(),
    });

    setSaving(false);
    if (error) {
      toastError(error.message);
      return;
    }

    success("Notification preferences updated");
    onClose();
  }

  async function handleTestWebhook() {
    if (!webhookUrl) return;
    setTesting(true);

    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: `🧹 **${householdName} Chore Divider Alert**: Webhook integration connected successfully! Upcoming cleaning reminders will be posted here.`,
        }),
      });

      if (res.ok) {
        success("Test notification dispatched to webhook!");
      } else {
        toastError(`Webhook test failed: status ${res.status}`);
      }
    } catch (err: any) {
      toastError(`Connection failed: ${err.message}`);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Modal open={isOpen} onClose={onClose} title="Chore Reminder Webhooks">
      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted">
            Broadcast cleaning reminders to your household&apos;s Discord channel, Slack, or webhook endpoint before each rotation closes.
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading preferences...</p>
        ) : (
          <form onSubmit={handleSave} className="space-y-4">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-line bg-surface2 cursor-pointer">
              <input
                type="checkbox"
                checked={webhookEnabled}
                onChange={(e) => setWebhookEnabled(e.target.checked)}
                className="h-4 w-4 accent-pine rounded"
              />
              <div className="text-sm">
                <span className="font-semibold block">Enable Webhook Reminders</span>
                <span className="text-xs text-muted block">
                  Send automated cleaning reminders to external chat
                </span>
              </div>
            </label>

            <label className="block">
              <span className="block text-xs font-semibold mb-1">
                Discord / Slack / Generic Webhook URL
              </span>
              <input
                type="url"
                placeholder="https://discord.com/api/webhooks/..."
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-pine"
              />
            </label>

            <label className="block">
              <span className="block text-xs font-semibold mb-1">
                Reminder Lead Time
              </span>
              <select
                value={daysBefore}
                onChange={(e) => setDaysBefore(Number(e.target.value))}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2 text-sm outline-none focus:border-pine"
              >
                <option value={1}>1 day before target weekend (Friday)</option>
                <option value={2}>2 days before target weekend (Thursday)</option>
                <option value={3}>3 days before target weekend (Wednesday)</option>
              </select>
            </label>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={!webhookUrl || testing}
                onClick={handleTestWebhook}
                className="flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-xs font-semibold hover:border-ink disabled:opacity-50"
              >
                <Send className="h-3 w-3" />
                {testing ? "Sending..." : "Test Webhook"}
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold hover:border-ink"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-pine px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
