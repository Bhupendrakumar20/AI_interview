// app/admin/users/page.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAllUsers, updateUserRole, deleteUser, createUser } from "@/lib/actions/admin.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  UserPlus,
  Edit,
  Trash2,
  Shield,
  Mail,
  Calendar,
  Filter,
  Download,
  MoreVertical
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    role: "user",
    permissions: []
  });

  const roles = [
    { value: "user", label: "User", color: "bg-gray-100 text-gray-800" },
    { value: "premium", label: "Premium User", color: "bg-blue-100 text-blue-800" },
    { value: "mentor", label: "Mentor", color: "bg-green-100 text-green-800" },
    { value: "admin", label: "Admin", color: "bg-yellow-100 text-yellow-800" },
    { value: "super_admin", label: "Super Admin", color: "bg-red-100 text-red-800" }
  ];

  const permissionsList = [
    { id: "create_content", label: "Create Content" },
    { id: "edit_content", label: "Edit Content" },
    { id: "delete_content", label: "Delete Content" },
    { id: "manage_users", label: "Manage Users" },
    { id: "view_analytics", label: "View Analytics" },
    { id: "manage_settings", label: "Manage Settings" }
  ];

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

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      const result = await updateUserRole(userId, {
        role: newRole,
        permissions: getDefaultPermissions(newRole),
        notes: `Role changed to ${newRole} by admin`
      });
      
      if (result.success) {
        toast.success("User role updated");
        loadUsers();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to update role");
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    
    try {
      const result = await deleteUser(
        selectedUser.id,
        "admin_001", // Replace with actual admin ID from session
        "User deleted by admin via dashboard"
      );
      
      if (result.success) {
        toast.success("User deleted successfully");
        setShowDeleteDialog(false);
        setSelectedUser(null);
        loadUsers();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Failed to delete user");
    }
  };

  const handleCreateUser = async () => {
    try {
      const result = await createUser(newUser);
      
      if (result.success) {
        toast.success("User created successfully");
        setShowCreateDialog(false);
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
      }
    } catch (error) {
      toast.error("Failed to create user");
    }
  };

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
    return roleObj ? roleObj.color : "bg-gray-100 text-gray-800";
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Management</h1>
          <p className="text-gray-500 dark:text-light-100">
            Manage all users and their permissions
          </p>
        </div>
        <div className="flex gap-3">
          <Button className="btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export Users
          </Button>
          <Button className="btn-primary" onClick={() => setShowCreateDialog(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <form onSubmit={handleSearch} className="md:col-span-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search by email or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </form>
        
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-white dark:bg-dark-300 border border-gray-200 dark:border-dark-400 rounded-lg px-3 py-2"
        >
          <option value="all">All Roles</option>
          {roles.map(role => (
            <option key={role.value} value={role.value}>{role.label}</option>
          ))}
        </select>
        
        <Button className="btn-secondary" onClick={loadUsers}>
          <Filter className="h-4 w-4 mr-2" />
          Apply Filters
        </Button>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-dark-200 rounded-lg border border-gray-200 dark:border-dark-300">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Email Status</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Loading users...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-primary-200 rounded-full size-10 flex items-center justify-center">
                        <span className="font-bold text-dark-100">
                          {user.name?.charAt(0) || user.email?.charAt(0) || "U"}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{user.name || "No Name"}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <select
                      value={user.role || "user"}
                      onChange={(e) => handleRoleUpdate(user.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role || "user")}`}
                    >
                      {roles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {user.emailVerified ? (
                        <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                          Verified
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-600 text-xs rounded-full">
                          Unverified
                        </span>
                      )}
                      {user.disabled && (
                        <span className="px-2 py-1 bg-red-100 text-red-600 text-xs rounded-full">
                          Disabled
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {user.lastSignInTime ? formatDate(user.lastSignInTime) : "Never"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      {formatDate(user.createdAt || user.creationTime)}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}`)}>
                          <Edit className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleRoleUpdate(user.id, user.role === "admin" ? "user" : "admin")}>
                          <Shield className="h-4 w-4 mr-2" />
                          {user.role === "admin" ? "Remove Admin" : "Make Admin"}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          className="text-red-600"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pagination.page === 1}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={pagination.page === pagination.pages}
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New User</DialogTitle>
            <DialogDescription>
              Add a new user to the platform with specific role and permissions.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Email Address</label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Password</label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                placeholder="Minimum 8 characters"
                required
                minLength={8}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Full Name</label>
              <Input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="John Doe"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Role</label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ 
                  ...newUser, 
                  role: e.target.value,
                  permissions: getDefaultPermissions(e.target.value)
                })}
                className="w-full bg-white dark:bg-dark-300 border border-gray-200 dark:border-dark-400 rounded-lg px-3 py-2"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            
            {newUser.role === "admin" && (
              <div>
                <label className="block text-sm font-medium mb-2">Permissions</label>
                <div className="space-y-2">
                  {permissionsList.map(permission => (
                    <label key={permission.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newUser.permissions.includes(permission.id)}
                        onChange={(e) => {
                          const newPermissions = e.target.checked
                            ? [...newUser.permissions, permission.id]
                            : newUser.permissions.filter(p => p !== permission.id);
                          setNewUser({ ...newUser, permissions: newPermissions });
                        }}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">{permission.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} className="btn-primary">
              Create User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              This action cannot be undone. This will permanently delete the user account and all associated data.
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-red-100 rounded-full size-12 flex items-center justify-center">
                  <Trash2 className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold">{selectedUser.name || selectedUser.email}</p>
                  <p className="text-sm text-gray-500">User ID: {selectedUser.id}</p>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <label className="block text-sm font-medium">Reason for deletion (optional)</label>
            <Input
              type="text"
              placeholder="Enter reason for deletion..."
              className="w-full"
            />
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteUser}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete User Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}