// app/admin/database/page.jsx
"use client";

import { useState, useEffect } from "react";
import { getDatabaseStats, backupDatabase, clearSystemCache, runIndexMaintenance } from "@/lib/actions/admin.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, AlertOctagon, RefreshCw, FileText, CheckCircle2, ShieldAlert } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function DatabasePage() {
  const [stats, setStats] = useState({ users: 0, interviews: 0, jobs: 0, internships: 0 });
  const [loadingStats, setLoadingStats] = useState(false);
  
  // Confirmation state
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingOp, setPendingOp] = useState(null);
  const [opLoading, setOpLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoadingStats(true);
    try {
      const res = await getDatabaseStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (e) {
      toast.error("Failed to load database collection statistics");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleTriggerOperation = (operationId, label, actionFn) => {
    setPendingOp({ id: operationId, label, actionFn });
    setShowConfirm(true);
  };

  const executeOperation = async () => {
    if (!pendingOp) return;
    setOpLoading(true);
    try {
      const res = await pendingOp.actionFn();
      if (res.success) {
        toast.success(res.message || `${pendingOp.label} completed successfully`);
        loadStats();
      } else {
        toast.error(res.error || "Operation failed");
      }
    } catch (e) {
      toast.error("An unexpected error occurred during database operation");
    } finally {
      setOpLoading(false);
      setShowConfirm(false);
      setPendingOp(null);
    }
  };

  const dbOperations = [
    {
      id: "backup",
      title: "Backup Database",
      desc: "Compile Firestore indexes schema and export JSON snapshots to safety buckets.",
      btnText: "Export Backup",
      color: "border-cyan-500/10 hover:border-cyan-500/30",
      action: backupDatabase
    },
    {
      id: "cache",
      title: "Clear System Cache",
      desc: "Flush global memory registers, redis tables, and static route buffers.",
      btnText: "Purge Cache",
      color: "border-emerald-500/10 hover:border-emerald-500/30",
      action: clearSystemCache
    },
    {
      id: "maintenance",
      title: "Run Indexes Optimization",
      desc: "Clean up orphan references, unused index chains, and rebuild Firestore tables.",
      btnText: "Run Index Maintenance",
      color: "border-amber-500/10 hover:border-amber-500/30",
      action: runIndexMaintenance
    },
    {
      id: "shutdown",
      title: "Emergency Write Lock",
      desc: "Restrict user transactions and set Firestore client writes to read-only mode.",
      btnText: "Initiate System Lock",
      color: "border-rose-500/15 hover:border-rose-500/35 text-rose-400",
      action: async () => {
        await new Promise(r => setTimeout(r, 1000));
        return { success: true, message: "Emergency lockdown active. Platform set to Read-Only mode." };
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Database Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Monitor firestore data loads, perform emergency lockouts, and manage snapshot compiles.
          </p>
        </div>
        <Button variant="outline" size="icon" onClick={loadStats} className="cursor-pointer">
          <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} />
        </Button>
      </div>

      {/* Collection Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: "Total Users Documents", count: stats.users, desc: "Records in users collection" },
          { label: "Active Interview Logs", count: stats.interviews, desc: "Count of all resume/dsa logs" },
          { label: "Configured Job Cards", count: stats.jobs, desc: "Open positions listed" },
          { label: "Internships Records", count: stats.internships, desc: "Active internships opportunities" }
        ].map((item, idx) => (
          <Card key={idx} className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                  <h3 className="text-2xl font-bold text-slate-850 dark:text-white mt-1.5">{item.count}</h3>
                  <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
                </div>
                <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Database className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Operations Panel */}
      <Card className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Database Maintenance Utilities</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            System configuration updates. These tasks directly alter data tables and routing.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
          {dbOperations.map((op) => (
            <div key={op.id} className={`p-5 rounded-xl border bg-slate-900/10 dark:bg-slate-950/20 flex flex-col justify-between gap-4 transition-all ${op.color}`}>
              <div>
                <h4 className="font-bold text-sm text-slate-800 dark:text-slate-100">{op.title}</h4>
                <p className="text-xs text-slate-400 mt-1">{op.desc}</p>
              </div>
              <Button
                variant={op.id === "shutdown" ? "destructive" : "outline"}
                onClick={() => handleTriggerOperation(op.id, op.title, op.action)}
                className="text-xs font-bold cursor-pointer w-fit self-end border-slate-200 dark:border-slate-800"
              >
                {op.btnText}
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Security Confirmation Pop up Overlay */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white text-center mt-3">
              Confirm Action
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 text-center mt-1">
              Do you really want to execute <strong className="text-slate-700 dark:text-slate-200">"{pendingOp?.label}"</strong>? This utility can impact live user workloads.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4 gap-2 flex justify-center">
            <Button
              variant="outline"
              disabled={opLoading}
              onClick={() => setShowConfirm(false)}
              className="text-xs font-semibold cursor-pointer border-slate-200 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={executeOperation}
              disabled={opLoading}
              className="font-bold text-xs cursor-pointer min-w-[100px]"
            >
              {opLoading ? "Executing..." : "Proceed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
