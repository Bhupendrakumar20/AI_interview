// app/admin/settings/page.jsx
"use client";

import { useState, useEffect } from "react";
import { getGlobalSettings, updateGlobalSettings } from "@/lib/actions/admin.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, Save, AlertTriangle, ShieldCheck, Mail, Sliders } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    rateLimit: 100,
    enableAiEval: true,
    enableDsaSandbox: true,
    emailAlerts: true
  });
  const [loading, setLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await getGlobalSettings();
      setSettings(res);
    } catch (e) {
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  const handlePreSave = (e) => {
    e.preventDefault();
    setShowConfirm(true);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await updateGlobalSettings(settings);
      if (res.success) {
        toast.success("Global configuration saved successfully");
        setShowConfirm(false);
      } else {
        toast.error("Failed to save configuration details");
      }
    } catch (e) {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-20 text-slate-400">
        Loading system configuration settings...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Global Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Modify core system properties, set rate-limits, toggle module feature flags, and update credentials.
        </p>
      </div>

      <form onSubmit={handlePreSave} className="space-y-6 max-w-3xl">
        {/* Maintenance Controls */}
        <Card className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Sliders className="h-5 w-5 text-cyan-400" />
              System Behavior
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Configure system uptime features and traffic throttle metrics.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Maintenance Mode */}
            <div className="flex items-center justify-between p-4 bg-slate-900/10 dark:bg-slate-950/20 rounded-xl border border-slate-200 dark:border-slate-850/40">
              <div>
                <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">Maintenance Mode</p>
                <p className="text-xs text-slate-400 mt-0.5">Toggle maintenance screen and reject client mutations.</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            {/* Rate Limit */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Max API Requests (per minute)
              </label>
              <Input
                type="number"
                value={settings.rateLimit}
                onChange={(e) => setSettings({ ...settings, rateLimit: parseInt(e.target.value) || 10 })}
                min={10}
                max={5000}
                required
                className="bg-white dark:bg-slate-955 border-slate-200 dark:border-slate-800 text-sm max-w-xs focus-visible:ring-cyan-500/20"
              />
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              Module Toggles
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Turn individual platform operations on or off dynamically.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                key: "enableAiEval",
                title: "AI Evaluate Service",
                desc: "Send user resume evaluations and mock tests to GPT/Claude engines."
              },
              {
                key: "enableDsaSandbox",
                title: "DSA Execution Sandbox",
                desc: "Run active Docker code compilers for language syntax checking."
              },
              {
                key: "emailAlerts",
                title: "Platform Email Alerts",
                desc: "Send system alert updates and role toggle logs to configured SMTP receivers."
              }
            ].map((flag) => (
              <div key={flag.key} className="flex items-center justify-between p-4 bg-slate-900/10 dark:bg-slate-950/20 rounded-xl border border-slate-200 dark:border-slate-850/40">
                <div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{flag.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{flag.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings[flag.key]}
                    onChange={(e) => setSettings({ ...settings, [flag.key]: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="flex justify-end">
          <Button type="submit" className="btn-primary font-bold px-6 py-2">
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      </form>

      {/* Security Confirmation Pop up Overlay */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Settings className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white text-center mt-3">
              Confirm Configuration Change
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 text-center mt-1">
              Do you really want to change this system configuration? This will modify server parameters in Firestore settings immediately.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4 gap-2 flex justify-center">
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => setShowConfirm(false)}
              className="text-xs font-semibold cursor-pointer border-slate-200 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={saving}
              className="btn-primary font-bold text-xs cursor-pointer min-w-[100px]"
            >
              {saving ? "Saving..." : "Proceed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
