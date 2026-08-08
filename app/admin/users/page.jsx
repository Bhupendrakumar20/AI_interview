// app/admin/users/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllUsers, updateUserRole, deleteUser, createUser, updateUserProfile } from "@/lib/actions/admin.action";
import { getCurrentUser, sendSuperAdminOTP, verifySuperAdminOTP } from "@/lib/actions/auth.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Calendar,
  Filter,
  Download,
  AlertTriangle,
  Key
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    role: "user",
    permissions: []
  });

  const [editUser, setEditUser] = useState({
    name: "",
    email: "",
    role: "user",
    permissions: []
  });

  const [currentUser, setCurrentUser] = useState(null);

  // Global Confirmation Popup State
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null
  });

  // OTP Validation Popup State
  const [otpDialog, setOtpDialog] = useState({
    show: false,
    otp: "",
    verifying: false,
    onVerify: null,
    onCancel: null
  });

  useEffect(() => {
    async function fetchCurrentUser() {
      const user = await getCurrentUser();
      setCurrentUser(user);
    }
    fetchCurrentUser();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [pagination.page, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await getAllUsers({
        page: pagination.page,
        limit: pagination.limit,
        search,
        role: roleFilter === "all" ? "" : roleFilter
      });
      
      setUsers(result.users);
      setPagination(result.pagination);
    } catch (error) {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    loadUsers();
  };

  // Reusable confirmation interceptor
  const requestConfirmation = (title, message, onConfirmAction, onCancelAction = null) => {
    setConfirmDialog({
      show: true,
      title,
      message,
      onConfirm: onConfirmAction,
      onCancel: onCancelAction
    });
  };

  // Trigger OTP check
  const requestOtpVerification = (onVerifySuccess, onCancelAction = null) => {
    sendSuperAdminOTP();
    toast.success("Security OTP code dispatched to Super Admin email");
    setOtpDialog({
      show: true,
      otp: "",
      verifying: false,
      onVerify: onVerifySuccess,
      onCancel: onCancelAction
    });
  };

  const handleRoleUpdate = (userId, newRole) => {
    if (currentUser?.role !== "super_admin") {
      toast.error("Only Super Admin can change user roles");
      return;
    }

    requestConfirmation(
      "Confirm Role Change",
      `Are you sure you want to change this user's role to "${newRole}"?`,
      () => {
        requestOtpVerification(async () => {
          try {
            const result = await updateUserRole(userId, {
              role: newRole,
              permissions: getDefaultPermissions(newRole),
              notes: `Role changed to ${newRole} by admin`
            });
            
            if (result.success) {
              toast.success("User role updated successfully");
              loadUsers();
            } else {
              toast.error(result.error);
            }
          } catch (error) {
            toast.error("Failed to update role");
          }
        });
      }
    );
  };

  const handleOpenEdit = (user) => {
    setSelectedUser(user);
    setEditUser({
      name: user.name || "",
      email: user.email || "",
      role: user.role || "user",
      permissions: user.permissions || []
    });
    setShowEditDialog(true);
  };

  const handleEditUser = () => {
    if (!selectedUser) return;

    // Temporarily close edit dialog to prevent focus trapping with confirm card
    setShowEditDialog(false);

    requestConfirmation(
      "Confirm Profile Updates",
      "Do you really want to save changes to this user's profile?",
      async () => {
        const roleChanged = editUser.role !== selectedUser.role;

        if (roleChanged) {
          if (currentUser?.role !== "super_admin") {
            toast.error("Only Super Admin can change user roles");
            setShowEditDialog(true); // reopen edit
            return;
          }
          requestOtpVerification(
            async () => {
              await executeEditRequest();
            },
            () => {
              // OTP cancelled, reopen edit dialog
              setShowEditDialog(true);
            }
          );
        } else {
          await executeEditRequest();
        }
      },
      () => {
        // Confirmation cancelled, reopen edit dialog
        setShowEditDialog(true);
      }
    );
  };

  const executeEditRequest = async () => {
    try {
      const roleResult = await updateUserRole(selectedUser.id, {
        role: editUser.role,
        permissions: editUser.permissions,
        notes: `Profile updated by admin`
      });

      const profileResult = await updateUserProfile(selectedUser.id, {
        name: editUser.name,
        email: editUser.email
      });

      if (roleResult.success && profileResult.success) {
        toast.success("User updated successfully");
        setShowEditDialog(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        toast.error(roleResult.error || profileResult.error || "Failed to update user");
        setShowEditDialog(true); // reopen edit
      }
    } catch (error) {
      toast.error("Failed to save changes");
      setShowEditDialog(true); // reopen edit
    }
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    setShowDeleteDialog(false); // Temporarily close delete dialog
    
    requestConfirmation(
      "Confirm Permanent Deletion",
      "Are you absolutely sure you want to permanently delete this user? This action is irreversible.",
      async () => {
        try {
          const result = await deleteUser(selectedUser.id);
          
          if (result.success) {
            toast.success("User deleted successfully");
            setSelectedUser(null);
            loadUsers();
          } else {
            toast.error(result.error);
            setShowDeleteDialog(true); // restore delete dialog on fail
          }
        } catch (error) {
          toast.error("Failed to delete user");
          setShowDeleteDialog(true);
        }
      },
      () => {
        setShowDeleteDialog(true); // restore delete dialog on cancel
      }
    );
  };

  const handleCreateUser = () => {
    setShowCreateDialog(false); // Temporarily close create dialog
    requestConfirmation(
      "Confirm User Creation",
      "Do you really want to register this new user account?",
      async () => {
        try {
          const result = await createUser(newUser);
          
          if (result.success) {
            toast.success("User created successfully");
            setNewUser({
              email: "",
              password: "",
              name: "",
              role: "user",
              permissions: []
            });
            loadUsers();
          } else {
            toast.error(result.error);
            setShowCreateDialog(true); // restore
          }
        } catch (error) {
          toast.error("Failed to create user");
          setShowCreateDialog(true);
        }
      },
      () => {
        setShowCreateDialog(true); // restore
      }
    );
  };

  const handleVerifyOtp = async () => {
    if (!otpDialog.otp || otpDialog.otp.length < 6) {
      toast.error("Please enter a valid 6-digit OTP code");
      return;
    }
    setOtpDialog(prev => ({ ...prev, verifying: true }));
    try {
      const res = await verifySuperAdminOTP(otpDialog.otp);
      if (res.success) {
        toast.success("OTP Verified successfully.");
        setOtpDialog(prev => ({ ...prev, show: false }));
        if (otpDialog.onVerify) {
          await otpDialog.onVerify();
        }
      } else {
        toast.error("Incorrect or expired OTP verification code.");
      }
    } catch (e) {
      toast.error("OTP validation error occurred");
    } finally {
      setOtpDialog(prev => ({ ...prev, verifying: false }));
    }
  };

  // CSV Users List Export Function
  const handleExportUsers = () => {
    if (users.length === 0) {
      toast.error("No users to export");
      return;
    }
    try {
      const headers = ["ID", "Name", "Email", "Role", "Email Verified", "Last Active", "Created"];
      const rows = users.map(user => [
        `"${user.id}"`,
        `"${user.name || 'No Name'}"`,
        `"${user.email}"`,
        `"${user.role || 'user'}"`,
        user.emailVerified ? "Yes" : "No",
        user.lastSignInTime ? `"${new Date(user.lastSignInTime).toLocaleString()}"` : "Never",
        user.createdAt || user.creationTime ? `"${new Date(user.createdAt || user.creationTime).toLocaleString()}"` : "N/A"
      ]);

      const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `prepwise_users_export_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success("Users list exported to CSV successfully!");
    } catch (error) {
      toast.error("Failed to compile CSV export file");
    }
  };

  const roles = [
    { value: "user", label: "User", color: "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300" },
    { value: "premium", label: "Premium User", color: "bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/30 text-blue-600 dark:text-blue-400" },
    { value: "mentor", label: "Mentor", color: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400" },
    { value: "admin", label: "Admin", color: "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30 text-amber-600 dark:text-amber-400" },
    { value: "super_admin", label: "Super Admin", color: "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/30 text-rose-600 dark:text-rose-400" }
  ];

  const permissionsList = [
    { id: "create_content", label: "Create Content" },
    { id: "edit_content", label: "Edit Content" },
    { id: "delete_content", label: "Delete Content" },
    { id: "manage_users", label: "Manage Users" },
    { id: "view_analytics", label: "View Analytics" },
    { id: "manage_settings", label: "Manage Settings" }
  ];

  const getDefaultPermissions = (role) => {
    switch (role) {
      case "super_admin":
        return ["*"];
      case "admin":
        return ["create_content", "edit_content", "manage_users", "view_analytics"];
      case "mentor":
        return ["create_content", "edit_content"];
      default:
        return [];
    }
  };

  const getRoleColor = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj ? roleObj.color : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">User Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Manage all platform users, assign roles, and update permissions
          </p>
        </div>
        <div className="flex gap-3">
          <Button className="btn-secondary font-bold" onClick={handleExportUsers}>
            <Download className="h-4 w-4 mr-2" />
            Export Users
          </Button>
          <Button className="btn-primary font-bold" onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl backdrop-blur-sm shadow-sm">
        <form onSubmit={handleSearch} className="md:col-span-2 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm focus-visible:ring-cyan-500/20"
          />
        </form>
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-cyan-500/50 transition-colors cursor-pointer"
        >
          <option value="all" className="bg-white dark:bg-slate-900">All Roles</option>
          {roles.map(role => (
            <option key={role.value} value={role.value} className="bg-white dark:bg-slate-900">{role.label}</option>
          ))}
        </select>
        
        <Button className="btn-secondary font-bold" onClick={loadUsers}>
          <Filter className="h-4 w-4 mr-2" />
          Apply Filters
        </Button>
      </div>

      {/* Users Grid Table */}
      <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl backdrop-blur-sm shadow-sm overflow-hidden text-sm">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1.2fr_0.5fr] gap-4 p-4 bg-slate-50/50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 items-center">
          <div>User</div>
          <div>Role</div>
          <div>Email Status</div>
          <div>Last Active</div>
          <div>Created</div>
          <div className="text-right pr-4">Options</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {loading ? (
            <div className="text-center py-10 text-slate-400">
              Loading users...
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              No users found.
            </div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="grid grid-cols-[2fr_1.2fr_1.2fr_1.2fr_1.2fr_0.5fr] gap-4 p-4 items-center hover:bg-slate-100/50 dark:hover:bg-slate-905/30 transition-colors">
                {/* User Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-full size-9 flex items-center justify-center font-bold text-sm uppercase shrink-0">
                    {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                  </div>
                  <div className="truncate">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 truncate">{user.name || "No Name"}</p>
                    <p className="text-xs text-slate-400 mt-0.5 truncate">{user.email}</p>
                  </div>
                </div>

                {/* Role Badge */}
                <div className="flex">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRoleColor(user.role || "user")}`}>
                    {roles.find(r => r.value === (user.role || "user"))?.label || "User"}
                  </span>
                </div>

                {/* Email Verification Status */}
                <div className="flex items-center gap-2 flex-wrap">
                  {user.emailVerified ? (
                    <span className="px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-full">
                      Verified
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 text-amber-600 dark:text-amber-400 text-xs font-semibold rounded-full">
                      Unverified
                    </span>
                  )}
                  {user.disabled && (
                    <span className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/30 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-full">
                      Disabled
                    </span>
                  )}
                </div>

                {/* Last Active */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Calendar className="h-3.5 w-3.5 opacity-60" />
                  {user.lastSignInTime ? new Date(user.lastSignInTime).toLocaleDateString() : "Never"}
                </div>

                {/* Created */}
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Calendar className="h-3.5 w-3.5 opacity-60" />
                  {user.createdAt || user.creationTime ? new Date(user.createdAt || user.creationTime).toLocaleDateString() : "N/A"}
                </div>

                {/* Actions Inline Buttons */}
                <div className="text-right flex justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(user)}
                    title="Edit details"
                    className="h-8 w-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRoleUpdate(user.id, user.role === "admin" ? "user" : "admin")}
                    title={user.role === "admin" ? "Remove Admin" : "Make Admin"}
                    className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 cursor-pointer"
                  >
                    <Shield className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedUser(user);
                      setShowDeleteDialog(true);
                    }}
                    title="Delete User"
                    className="h-8 w-8 text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-400 font-medium">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              className="text-xs font-semibold cursor-pointer border-slate-250 dark:border-slate-800"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              className="text-xs font-semibold cursor-pointer border-slate-250 dark:border-slate-800"
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={(val) => {
        setShowCreateDialog(val);
        if (!val) setSelectedUser(null);
      }}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white">Create New User</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Add a new user to the platform with a specific role and permissions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 my-3">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@example.com"
                required
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-visible:ring-cyan-500/20 focus-visible:border-cyan-500/50 text-sm py-2.5 px-3 transition-all text-slate-900 dark:text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
                className="bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus-visible:ring-cyan-500/20 focus-visible:border-cyan-500/50 text-sm py-2.5 px-3 transition-all text-slate-900 dark:text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
              <Input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="John Doe"
                required
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-visible:ring-cyan-500/20 focus-visible:border-cyan-500/50 text-sm py-2.5 px-3 transition-all text-slate-900 dark:text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ 
                  ...newUser, 
                  role: e.target.value,
                  permissions: getDefaultPermissions(e.target.value)
                })}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-cyan-500/50 transition-all cursor-pointer text-slate-900 dark:text-white"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value} className="bg-white dark:bg-slate-900">{role.label}</option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="text-xs font-semibold cursor-pointer border-slate-200 dark:border-slate-800">
              Cancel
            </Button>
            <Button onClick={handleCreateUser} className="btn-primary font-bold text-xs cursor-pointer">
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={(val) => {
        setShowEditDialog(val);
        if (!val) setSelectedUser(null);
      }}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white">Edit User</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Update details, roles, and permissions for the selected user profile.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 my-3">
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
              <Input
                type="email"
                value={editUser.email}
                onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                placeholder="user@example.com"
                required
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-visible:ring-cyan-500/20 focus-visible:border-cyan-500/50 text-sm py-2.5 px-3 transition-all text-slate-900 dark:text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Full Name</label>
              <Input
                type="text"
                value={editUser.name}
                onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                placeholder="John Doe"
                required
                className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus-visible:ring-cyan-500/20 focus-visible:border-cyan-500/50 text-sm py-2.5 px-3 transition-all text-slate-900 dark:text-white"
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</label>
              <select
                value={editUser.role}
                disabled={currentUser?.role !== "super_admin"}
                onChange={(e) => setEditUser({ 
                  ...editUser, 
                  role: e.target.value,
                  permissions: getDefaultPermissions(e.target.value)
                })}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:border-cyan-500/50 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed text-slate-900 dark:text-white"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value} className="bg-white dark:bg-slate-900">{role.label}</option>
                ))}
              </select>
            </div>
            
            {editUser.role === "admin" && (
              <div className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  {permissionsList.map(permission => (
                    <label key={permission.id} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editUser.permissions.includes(permission.id)}
                        onChange={(e) => {
                          const newPermissions = e.target.checked
                            ? [...editUser.permissions, permission.id]
                            : editUser.permissions.filter(p => p !== permission.id);
                          setEditUser({ ...editUser, permissions: newPermissions });
                        }}
                        className="rounded border-slate-350 dark:border-slate-800 text-cyan-500 focus:ring-cyan-500/20 bg-slate-950"
                      />
                      <span className="text-xs text-slate-655 dark:text-slate-400 font-medium">{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowEditDialog(false)} className="text-xs font-semibold cursor-pointer border-slate-200 dark:border-slate-800">
              Cancel
            </Button>
            <Button onClick={handleEditUser} className="btn-primary font-bold text-xs cursor-pointer">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={(val) => {
        setShowDeleteDialog(val);
        if (!val) setSelectedUser(null);
      }}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white">Delete User</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              This action cannot be undone. This will permanently delete the user account and all associated logs/data.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl my-2">
              <div className="flex items-center gap-3">
                <div className="bg-rose-500/15 border border-rose-500/30 rounded-full size-11 flex items-center justify-center">
                  <Trash2 className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{selectedUser.name || selectedUser.email}</p>
                  <p className="text-xs text-slate-400 mt-0.5">User ID: {selectedUser.id}</p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="text-xs font-semibold cursor-pointer border-slate-200 dark:border-slate-800">
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteUser}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
            >
              Delete User Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reusable General Action Confirmation Overlay Dialog (Middle Pop up Card) */}
      <Dialog open={confirmDialog.show} onOpenChange={(val) => {
        setConfirmDialog(prev => ({ ...prev, show: val }));
        if (!val && confirmDialog.onCancel) confirmDialog.onCancel();
      }}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white text-center mt-3">
              {confirmDialog.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 text-center mt-1">
              {confirmDialog.message}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2 flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialog(prev => ({ ...prev, show: false }));
                if (confirmDialog.onCancel) confirmDialog.onCancel();
              }}
              className="text-xs font-semibold cursor-pointer border-slate-200 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                setConfirmDialog(prev => ({ ...prev, show: false }));
                if (confirmDialog.onConfirm) confirmDialog.onConfirm();
              }}
              className="btn-primary font-bold text-xs cursor-pointer"
            >
              Proceed
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* OTP Verification Modal (Middle Pop up Card) */}
      <Dialog open={otpDialog.show} onOpenChange={(val) => {
        setOtpDialog(prev => ({ ...prev, show: val }));
        if (!val && otpDialog.onCancel) otpDialog.onCancel();
      }}>
        <DialogContent className="max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Key className="h-6 w-6" />
            </div>
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white text-center mt-3">
              Security Verification Required
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400 text-center mt-1">
              Assigning a role requires OTP authorization. Enter the 6-digit verification code sent to the Super Admin's email address.
            </DialogDescription>
          </DialogHeader>
          
          <div className="my-4">
            <Input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit OTP code"
              value={otpDialog.otp}
              onChange={(e) => setOtpDialog({ ...otpDialog, otp: e.target.value })}
              className="text-center font-bold text-lg tracking-widest bg-white dark:bg-slate-950 border-slate-255 dark:border-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <DialogFooter className="gap-2 flex justify-center">
            <Button
              variant="outline"
              disabled={otpDialog.verifying}
              onClick={() => {
                setOtpDialog(prev => ({ ...prev, show: false }));
                if (otpDialog.onCancel) otpDialog.onCancel();
              }}
              className="text-xs font-semibold cursor-pointer border-slate-255 dark:border-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handleVerifyOtp}
              disabled={otpDialog.verifying}
              className="btn-primary font-bold text-xs cursor-pointer min-w-[90px]"
            >
              {otpDialog.verifying ? "Verifying..." : "Verify Code"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}