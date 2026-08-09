// app/admin/roles/page.jsx
"use client";

import { useState, useEffect } from "react";
import { getSecurityLogs, getAllUsers, getRolePermissions, updateRolePermissions } from "@/lib/actions/admin.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, Key, AlertTriangle, Check, X, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

export default function RolesPermissionsPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [securityLogs, setSecurityLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Confirmation state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);

  // Default state before database load
  const [rolePermissions, setRolePermissions] = useState({
    user: [],
    premium: [],
    mentor: [],
    admin: [],
    super_admin: []
  });

  const rolesList = [
    { key: "user", label: "User", color: "text-slate-400 border-slate-500/20" },
    { key: "premium", label: "Premium User", color: "text-blue-400 border-blue-500/20" },
    { key: "mentor", label: "Mentor", color: "text-emerald-400 border-emerald-500/20" },
    { key: "admin", label: "Admin", color: "text-amber-400 border-amber-500/20" },
    { key: "super_admin", label: "Super Admin", color: "text-rose-400 border-rose-500/20" }
  ];

  const permissionsList = [
    { id: "create_content", label: "Create Content", desc: "Allows creation of jobs, internships, courses, etc." },
    { id: "edit_content", label: "Edit Content", desc: "Allows modification of existing entries." },
    { id: "delete_content", label: "Delete Content", desc: "Allows permanent removal of records." },
    { id: "manage_users", label: "Manage Users", desc: "Allows role modification, deletion, and creating users." },
    { id: "view_analytics", label: "View Analytics", desc: "Provides dashboard reports and statistics access." },
    { id: "manage_settings", label: "Manage Settings", desc: "Allows updating global system settings." }
  ];

  useEffect(() => {
    async function loadInitial() {
      const user = await getCurrentUser();
      setCurrentUser(user);
      const perms = await getRolePermissions();
      setRolePermissions(perms);
      loadLogs();
    }
    loadInitial();
  }, []);

  const loadLogs = async () => {
    setLoadingLogs(true);
    try {
      const res = await getSecurityLogs();
      if (res.success) {
        setSecurityLogs(res.logs);
      }
    } catch (e) {
      toast.error("Failed to load security audit logs");
    } finally {
      setLoadingLogs(false);
    }
  };

  const handleTogglePermission = (roleKey, permissionId) => {
    if (currentUser?.role !== "super_admin") {
      toast.error("Only Super Admin can change system-wide permissions matrix");
      return;
    }

    const hasPermission = (rolePermissions[roleKey] || []).includes(permissionId);
    setPendingChange({
      roleKey,
      permissionId,
      action: hasPermission ? "remove" : "add"
    });
    setShowConfirmDialog(true);
  };

  const confirmPermissionChange = async () => {
    if (!pendingChange) return;
    const { roleKey, permissionId, action } = pendingChange;
    
    const updatedPermissions = { ...rolePermissions };
    if (action === "add") {
      updatedPermissions[roleKey] = [...(updatedPermissions[roleKey] || []), permissionId];
    } else {
      updatedPermissions[roleKey] = (updatedPermissions[roleKey] || []).filter(id => id !== permissionId);
    }

    try {
      const res = await updateRolePermissions(updatedPermissions);
      if (res.success) {
        setRolePermissions(updatedPermissions);
        toast.success(`Permission matrix updated successfully for ${rolesList.find(r => r.key === roleKey)?.label}`);
        loadLogs();
      } else {
        toast.error("Failed to update role permissions in database");
      }
    } catch (e) {
      toast.error("Database error occurred while saving configuration");
    }

    setShowConfirmDialog(false);
    setPendingChange(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Roles & Permissions</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Configure security roles, manage access control parameters, and view audit trails.
        </p>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
        {["overview", "matrix", "audit"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 text-sm font-semibold capitalize transition-all border-b-2 cursor-pointer ${
              activeTab === tab
                ? "border-cyan-500 text-cyan-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-300"
            }`}
          >
            {tab === "audit" ? "Security Audit Logs" : tab === "matrix" ? "Permissions Matrix" : "Roles Overview"}
          </button>
        ))}
      </div>

      {/* Content Area */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-6">
          {rolesList.map((role) => (
            <Card key={role.key} className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-bold text-slate-400 uppercase tracking-wider">{role.label}</CardTitle>
                <CardDescription className="text-xs">System role configurations</CardDescription>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Status</span>
                    <p className="text-xs font-bold text-emerald-400">Active</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "matrix" && (
        <Card className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm overflow-hidden text-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Role Access Configuration Matrix</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Only system Super Admin accounts can configure default security settings.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <div className="min-w-[800px] divide-y divide-slate-100 dark:divide-slate-800/60">
              {/* Header */}
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 p-4 bg-slate-50/50 dark:bg-slate-900/80 font-bold text-slate-700 dark:text-slate-300">
                <div>Permission Parameter</div>
                {rolesList.map(r => (
                  <div key={r.key} className="text-center">{r.label}</div>
                ))}
              </div>
              
              {/* Rows */}
              {permissionsList.map((perm) => (
                <div key={perm.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-4 p-4 items-center hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{perm.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{perm.desc}</p>
                  </div>
                  {rolesList.map(role => {
                    const hasPerm = rolePermissions[role.key].includes(perm.id);
                    return (
                      <div key={role.key} className="flex justify-center">
                        <button
                          onClick={() => handleTogglePermission(role.key, perm.id)}
                          className={`size-8 rounded-full border flex items-center justify-center transition-all cursor-pointer ${
                            hasPerm
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                              : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                          }`}
                        >
                          {hasPerm ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "audit" && (
        <Card className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm overflow-hidden text-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Security Event Logging</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                Audit logs showing security parameters update and general DB queries history.
              </CardDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={loadLogs} className="cursor-pointer">
              <RefreshCw className={`h-4 w-4 ${loadingLogs ? "animate-spin" : ""}`} />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {/* Header */}
              <div className="grid grid-cols-[1.5fr_2fr_1fr_1fr] gap-4 p-4 bg-slate-50/50 dark:bg-slate-900/80 font-bold text-slate-700 dark:text-slate-300">
                <div>Timestamp</div>
                <div>Action Audit</div>
                <div>Admin Operator</div>
                <div>IP Address</div>
              </div>

              {/* Body */}
              {loadingLogs ? (
                <div className="text-center py-8 text-slate-400">Loading audit history...</div>
              ) : securityLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No logs found.</div>
              ) : (
                securityLogs.map((log) => (
                  <div key={log.id} className="grid grid-cols-[1.5fr_2fr_1fr_1fr] gap-4 p-4 items-center hover:bg-slate-100/30 dark:hover:bg-slate-900/30 transition-colors">
                    <div className="text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wide text-xs">{log.action}</p>
                      {log.notes && <p className="text-xs text-slate-400 mt-0.5">{log.notes}</p>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{log.adminId}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">{log.ip || "127.0.0.1"}</div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog Overlay */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white text-center mt-3">Confirm Security Update</DialogTitle>
            <DialogDescription className="text-xs text-slate-400 text-center mt-1">
              Do you really want to change this system-wide configuration rule? This will take effect immediately.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4 gap-2 flex justify-center">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="text-xs font-semibold cursor-pointer border-slate-200 dark:border-slate-800">
              Cancel
            </Button>
            <Button onClick={confirmPermissionChange} className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs cursor-pointer">
              Confirm Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
