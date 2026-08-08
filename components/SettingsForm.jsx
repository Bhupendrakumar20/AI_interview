"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import {
  deleteAccountAction,
  clearHistoryAction,
  updateSettingsAction,
} from "@/lib/actions/profile.action";
import { logout, changePassword } from "@/lib/actions/auth.action";
import {
  changeUserEmail,
  sendVerificationEmail,
  checkEmailVerification,
} from "@/lib/actions/email.action";

import { Button } from "./ui/button";
import { Input } from "./ui/input";

export default function SettingsForm({ user }) {
  const router = useRouter();

  // Settings state
  const [camera, setCamera] = useState(user?.camera ?? true);
  const [notifications, setNotifications] = useState(user?.notifications ?? true);

  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // Email change state
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailVerified, setEmailVerified] = useState(false);

  // Loading states
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);
  const [sendingVerification, setSendingVerification] = useState(false);

  // ✅ SAVE SETTINGS
  const handleSave = async (e) => {
    e?.preventDefault();

    try {
      setSaving(true);

      const res = await updateSettingsAction({ camera, notifications });

      if (!res?.success) {
        toast.error(res?.error || "Failed to save settings!");
        return;
      }

      toast.success("Settings saved successfully!");
    } catch (error) {
      toast.error("❌ Something went wrong while saving!");
    } finally {
      setSaving(false);
    }
  };

  // ✅ CHANGE PASSWORD
  const handleChangePassword = async (e) => {
    e?.preventDefault();
    setPasswordError("");

    // Validation
    if (!newPassword || !confirmPassword) {
      setPasswordError("Please fill in all password fields");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      setChangingPassword(true);

      const res = await changePassword(newPassword);

      if (!res?.success) {
        setPasswordError(res?.error || "Failed to change password");
        return;
      }

      toast.success("Password changed successfully!");
      setShowPasswordForm(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError("❌ Something went wrong while changing password!");
    } finally {
      setChangingPassword(false);
    }
  };

  // ✅ CHANGE EMAIL
  const handleChangeEmail = async (e) => {
    e?.preventDefault();
    setEmailError("");

    // Validation
    if (!newEmail) {
      setEmailError("Please enter a new email address");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    if (newEmail === user?.email) {
      setEmailError("New email must be different from current email");
      return;
    }

    try {
      setChangingEmail(true);

      const res = await changeUserEmail(newEmail);

      if (!res?.success) {
        setEmailError(res?.error || "Failed to change email");
        return;
      }

      toast.success("Verification link sent to your new email!");
      toast.message("📧 Please check " + newEmail + " and click the verification link");
      setShowEmailForm(false);
      setNewEmail("");
    } catch (error) {
      setEmailError("❌ Something went wrong while changing email!");
    } finally {
      setChangingEmail(false);
    }
  };

  // ✅ SEND VERIFICATION EMAIL
  const handleSendVerification = async (e) => {
    e?.preventDefault();

    try {
      setSendingVerification(true);

      const res = await sendVerificationEmail();

      if (!res?.success) {
        toast.error(res?.error || "Failed to send verification email");
        return;
      }

      toast.success(res?.message || "Verification email sent!");
    } catch (error) {
      toast.error("❌ Something went wrong while sending verification email!");
    } finally {
      setSendingVerification(false);
    }
  };

  // ✅ LOGOUT
  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      await logout();

      toast.success("Logged out successfully!");
      
      // Redirect to sign-in page
      setTimeout(() => {
        router.push("/sign-in");
      }, 500);
    } catch (error) {
      toast.error("❌ Failed to logout!");
    } finally {
      setLoggingOut(false);
    }
  };

  // ✅ CLEAR HISTORY
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

      toast.success("Interview history cleared!");
    } catch (error) {
      toast.error("❌ Something went wrong while clearing history!");
    } finally {
      setClearing(false);
    }
  };

  // ✅ DELETE ACCOUNT
  const deleteAccount = async () => {
    const ok = confirm(
      "⚠️ Are you sure you want to permanently delete your account? This action cannot be undone and will delete all your data."
    );
    if (!ok) return;

    const confirmed = confirm("Type 'DELETE' to confirm account deletion.");
    if (!confirmed) return;

    try {
      setDeleting(true);

      const res = await deleteAccountAction();

      if (!res?.success) {
        toast.error(res?.error || "Failed to delete account!");
        return;
      }

      toast.success("Account deleted successfully!");
      
      // Redirect after deletion
      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error) {
      toast.error("❌ Something went wrong while deleting account!");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* ========================================
          ACCOUNT SETTINGS
      ======================================== */}
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-light-100">Account Settings</h2>
          <p className="text-sm text-light-400 mb-6">
            Manage your app preferences and notifications
          </p>
        </div>

        {/* Camera Setting */}
        <div className="flex items-center justify-between border border-dark-300 rounded-lg p-4 bg-dark-200/50 hover:bg-dark-200 transition">
          <div>
            <p className="font-medium text-light-100">Enable Camera</p>
            <p className="text-sm text-light-400">Allow camera access during interviews</p>
          </div>
          <input
            type="checkbox"
            checked={camera}
            onChange={(e) => setCamera(e.target.checked)}
            className="w-5 h-5 cursor-pointer accent-primary-200"
            disabled={saving}
          />
        </div>

        {/* Notifications Setting */}
        <div className="flex items-center justify-between border border-dark-300 rounded-lg p-4 bg-dark-200/50 hover:bg-dark-200 transition">
          <div>
            <p className="font-medium text-light-100">Enable Notifications</p>
            <p className="text-sm text-light-400">Receive updates and reminders</p>
          </div>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
            className="w-5 h-5 cursor-pointer accent-primary-200"
            disabled={saving}
          />
        </div>

        <Button
          variant="default"
          className="w-full md:w-fit"
          type="submit"
          disabled={saving}
        >
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </form>

      {/* ========================================
          PASSWORD SECTION
      ======================================== */}
      <div className="border-t border-dark-300 pt-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-light-100">Security</h2>
          <p className="text-sm text-light-400 mb-6">
            Update your password to keep your account secure
          </p>
        </div>

        {!showPasswordForm ? (
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-fit"
            onClick={() => setShowPasswordForm(true)}
            disabled={changingPassword}
          >
            Change Password
          </Button>
        ) : (
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            {/* Current Password */}
            <div>
              <label className="text-sm font-medium text-light-100 block mb-2">
                Current Password
              </label>
              <Input
                type="password"
                placeholder="Enter your current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={changingPassword}
              />
            </div>

            {/* New Password */}
            <div>
              <label className="text-sm font-medium text-light-100 block mb-2">
                New Password
              </label>
              <Input
                type="password"
                placeholder="Enter new password (min. 6 characters)"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError("");
                }}
                disabled={changingPassword}
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label className="text-sm font-medium text-light-100 block mb-2">
                Confirm New Password
              </label>
              <Input
                type="password"
                placeholder="Confirm your new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setPasswordError("");
                }}
                disabled={changingPassword}
              />
            </div>

            {/* Error Message */}
            {passwordError && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-md">
                <p className="text-sm text-red-400">{passwordError}</p>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="default"
                disabled={changingPassword}
              >
                {changingPassword ? "Updating..." : "Update Password"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowPasswordForm(false);
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                  setPasswordError("");
                }}
                disabled={changingPassword}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* ========================================
          EMAIL SECTION
      ======================================== */}
      <div className="border-t border-dark-300 pt-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-light-100">Email Management</h2>
          <p className="text-sm text-light-400 mb-6">
            Update your email address or verify your current email
          </p>
        </div>

        {/* Current Email Display */}
        <div className="mb-6 p-4 bg-dark-200/50 rounded-lg border border-dark-300">
          <p className="text-sm text-light-400">Current Email</p>
          <p className="text-light-100 font-medium">{user?.email}</p>
        </div>

        {!showEmailForm ? (
          <Button
            type="button"
            variant="outline"
            className="w-full md:w-fit"
            onClick={() => setShowEmailForm(true)}
            disabled={changingEmail || sendingVerification}
          >
            Change Email Address
          </Button>
        ) : (
          <form onSubmit={handleChangeEmail} className="space-y-4 max-w-md">
            {/* New Email */}
            <div>
              <label className="text-sm font-medium text-light-100 block mb-2">
                New Email Address
              </label>
              <Input
                type="email"
                placeholder="Enter your new email address"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  setEmailError("");
                }}
                disabled={changingEmail}
              />
            </div>

            {/* Error Message */}
            {emailError && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-md">
                <p className="text-sm text-red-400">{emailError}</p>
              </div>
            )}

            {/* Info Message */}
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-md">
              <p className="text-sm text-blue-300">
                📧 A verification link will be sent to your new email. You must click it to confirm the change.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="default"
                disabled={changingEmail}
              >
                {changingEmail ? "Sending..." : "Send Verification Email"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowEmailForm(false);
                  setNewEmail("");
                  setEmailError("");
                }}
                disabled={changingEmail}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* ========================================
          LOGOUT SECTION
      ======================================== */}
      <div className="border-t border-dark-300 pt-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-light-100">Session</h2>
          <p className="text-sm text-light-400 mb-6">
            Sign out from this device
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full md:w-fit text-blue-500 border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-600"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </Button>
      </div>

      {/* ========================================
          DATA MANAGEMENT SECTION
      ======================================== */}
      <div className="border-t border-dark-300 pt-8">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-light-100">Data Management</h2>
          <p className="text-sm text-light-400 mb-6">
            Manage your data and interview history
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full md:w-fit text-amber-500 border-amber-500/30 hover:bg-amber-500/10 hover:text-amber-600"
          onClick={clearHistory}
          disabled={clearing}
        >
          {clearing ? "Clearing..." : "Clear Interview History"}
        </Button>
      </div>

      {/* ========================================
          DELETE ACCOUNT SECTION
      ======================================== */}
      <div className="border-t border-dark-300 pt-8">
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <h2 className="text-xl font-semibold mb-2 text-red-400">Danger Zone</h2>
          <p className="text-sm text-light-400">
            Permanently delete your account and all associated data
          </p>
        </div>

        <Button
          type="button"
          variant="destructive"
          className="w-full md:w-fit"
          onClick={deleteAccount}
          disabled={deleting}
        >
          {deleting ? "Deleting..." : "⚠️ Delete Account Permanently"}
        </Button>
      </div>
    </div>
  );
}
