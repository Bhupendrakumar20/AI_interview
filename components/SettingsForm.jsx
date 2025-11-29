"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  deleteAccountAction,
  clearHistoryAction,
  updateSettingsAction,
} from "@/lib/actions/settings.action";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function SettingsForm({ user }) {
  const [camera, setCamera] = useState(user?.camera || true);
  const [notifications, setNotifications] = useState(user?.notifications || true);

  const handleSave = async () => {
    const res = await updateSettingsAction({ camera, notifications });
    if (res?.success) toast.success("Settings saved!");
  };

  const clearHistory = async () => {
    if (!confirm("Are you sure? This cannot be undone.")) return;

    const res = await clearHistoryAction();
    if (res?.success) toast.success("History cleared");
  };

  const deleteAccount = async () => {
    if (!confirm("Delete account permanently?")) return;

    const res = await deleteAccountAction();
    if (res?.success) toast.success("Account deleted");
  };

  return (
    <div className="flex flex-col gap-6">

      <div className="flex items-center justify-between">
        <p className="text-sm">Enable Camera</p>
        <input
          type="checkbox"
          checked={camera}
          onChange={(e) => setCamera(e.target.checked)}
        />
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm">Enable Notifications</p>
        <input
          type="checkbox"
          checked={notifications}
          onChange={(e) => setNotifications(e.target.checked)}
        />
      </div>

      <Button className="btn-primary w-fit" onClick={handleSave}>
        Save Settings
      </Button>

      <Button className="btn-secondary w-fit mt-6" onClick={clearHistory}>
        Clear Interview History
      </Button>

      <Button className="btn-secondary bg-red-500 text-white w-fit" onClick={deleteAccount}>
        Delete Account
      </Button>
    </div>
  );
}
