"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  deleteAccountAction,
  clearHistoryAction,
  updateSettingsAction,
} from "@/lib/actions/profile.action";

import { Button } from "./ui/button";

export default function SettingsForm({ user }) {
  const [camera, setCamera] = useState(user?.camera ?? true);
  const [notifications, setNotifications] = useState(user?.notifications ?? true);

  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async (e) => {
    e?.preventDefault();

    try {
      setSaving(true);

      const res = await updateSettingsAction({ camera, notifications });

      if (!res?.success) {
        toast.error(res?.error || "Failed to save settings!");
        return;
      }

      toast.success("✅ Settings saved successfully!");
    } catch (error) {
      toast.error("❌ Something went wrong while saving!");
    } finally {
      setSaving(false);
    }
  };

  const clearHistory = async () => {
    const ok = confirm("Are you sure? This cannot be undone.");
    if (!ok) return;

    try {
      setClearing(true);

      const res = await clearHistoryAction();

      if (!res?.success) {
        toast.error(res?.error || "Failed to clear history!");
        return;
      }

      toast.success("✅ Interview history cleared!");
    } catch (error) {
      toast.error("❌ Something went wrong while clearing history!");
    } finally {
      setClearing(false);
    }
  };

  const deleteAccount = async () => {
    const ok = confirm("Delete account permanently?");
    if (!ok) return;

    try {
      setDeleting(true);

      const res = await deleteAccountAction();

      if (!res?.success) {
        toast.error(res?.error || "Failed to delete account!");
        return;
      }

      toast.success("✅ Account deleted successfully!");
      // ✅ If you want redirect after delete:
      // window.location.href = "/";
    } catch (error) {
      toast.error("❌ Something went wrong while deleting account!");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="flex flex-col gap-6">
      {/* Camera */}
      <div className="flex items-center justify-between border rounded-lg p-3">
        <p className="text-sm font-medium">Enable Camera</p>

        <input
          type="checkbox"
          checked={camera}
          onChange={(e) => setCamera(e.target.checked)}
          className="w-5 h-5 cursor-pointer"
          disabled={saving}
        />
      </div>

      {/* Notifications */}
      <div className="flex items-center justify-between border rounded-lg p-3">
        <p className="text-sm font-medium">Enable Notifications</p>

        <input
          type="checkbox"
          checked={notifications}
          onChange={(e) => setNotifications(e.target.checked)}
          className="w-5 h-5 cursor-pointer"
          disabled={saving}
        />
      </div>

      {/* Save Settings */}
      <Button className="btn-primary w-fit" type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Settings"}
      </Button>

      {/* Clear History */}
      <Button
        type="button"
        className="btn-secondary w-fit mt-4"
        onClick={clearHistory}
        disabled={clearing}
      >
        {clearing ? "Clearing..." : "Clear Interview History"}
      </Button>

      {/* Delete Account */}
      <Button
        type="button"
        className="btn-secondary bg-red-500 text-white w-fit"
        onClick={deleteAccount}
        disabled={deleting}
      >
        {deleting ? "Deleting..." : "Delete Account"}
      </Button>
    </form>
  );
}
