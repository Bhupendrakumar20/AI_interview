"use client";

import { useState } from "react";
import { toast } from "sonner";

import { updateProfileAction } from "@/lib/actions/profile.action";
import { signOut } from "@/lib/actions/auth.action"; // ✅ use signOut directly

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export default function UpdateProfileForm({ user }) {
  const [name, setName] = useState(user?.name ?? "");
  const [resumeURL, setResumeURL] = useState(user?.resumeURL ?? "");

  const [bio, setBio] = useState(user?.bio ?? "");
  const [skills, setSkills] = useState(user?.skills ?? "");
  const [github, setGithub] = useState(user?.github ?? "");
  const [linkedin, setLinkedin] = useState(user?.linkedin ?? "");
  const [portfolio, setPortfolio] = useState(user?.portfolio ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const isValidURL = (url) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const payload = {
      name: name.trim(),
      resumeURL: resumeURL.trim(),
      bio: bio.trim(),
      skills: skills.trim(),
      github: github.trim(),
      linkedin: linkedin.trim(),
      portfolio: portfolio.trim(),
    };

    if (!payload.name) {
      toast.error("Name cannot be empty!");
      return;
    }

    if (!isValidURL(payload.resumeURL)) {
      toast.error("Please enter a valid resume URL!");
      return;
    }

    if (
      !isValidURL(payload.github) ||
      !isValidURL(payload.linkedin) ||
      !isValidURL(payload.portfolio)
    ) {
      toast.error("Please enter valid links (GitHub/LinkedIn/Portfolio)!");
      return;
    }

    if (payload.skills.length > 200) {
      toast.error("Skills too long! Please keep it short.");
      return;
    }

    setIsSaving(true);

    try {
      const res = await updateProfileAction(payload);

      if (!res?.success) {
        toast.error(res?.error || "Something went wrong.");
        return;
      }

      toast.success("✅ Profile updated successfully!");
    } catch (error) {
      toast.error("❌ Server error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setName(user?.name ?? "");
    setResumeURL(user?.resumeURL ?? "");
    setBio(user?.bio ?? "");
    setSkills(user?.skills ?? "");
    setGithub(user?.github ?? "");
    setLinkedin(user?.linkedin ?? "");
    setPortfolio(user?.portfolio ?? "");
    toast.success("✅ Reset to saved profile!");
  };

  // ✅ Logout
  const handleLogout = async () => {
    const ok = confirm("Do you want to logout?");
    if (!ok) return;

    setIsLoggingOut(true);

    try {
      await signOut(); // ✅ clears session cookie
      toast.success("✅ Logged out successfully!");
      window.location.href = "/sign-in";
    } catch (err) {
      toast.error("❌ Logout failed!");
    } finally {
      setIsLoggingOut(false);
    }
  };

  // ✅ Copy User ID
  const copyUserId = async () => {
    const userIdText = user?.id || "";
    
    try {
      // Try modern Clipboard API first
      if (typeof navigator !== "undefined" && navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(userIdText);
          toast.success("✅ User ID copied!");
          return;
        } catch (clipboardError) {
          console.error("Clipboard API failed:", clipboardError);
          // Fall through to fallback method
        }
      }

      // Fallback: Use deprecated method
      const textarea = document.createElement("textarea");
      textarea.value = userIdText;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      
      if (successful) {
        toast.success("✅ User ID copied!");
      } else {
        toast.error("❌ Failed to copy user ID");
      }
    } catch {
      toast.error("❌ Failed to copy user ID");
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-xl w-full">
      {/* ✅ User Info */}
      <div className="border rounded-lg p-4 flex flex-col gap-2">
        <p className="text-lg font-semibold">Account Info</p>

        <p className="text-sm text-light-100">
          <span className="font-medium">Name:</span> {user?.name || "Unknown"}
        </p>

        {user?.email && (
          <p className="text-sm text-light-100">
            <span className="font-medium">Email:</span> {user.email}
          </p>
        )}

        {user?.id && (
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-light-100">
              <span className="font-medium">User ID:</span>{" "}
              {String(user.id).slice(0, 10)}...
            </p>

            <Button type="button" variant="outline" onClick={copyUserId}>
              Copy ID
            </Button>
          </div>
        )}

        <div className="flex gap-3 flex-wrap mt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => toast.info("✅ You are logged in!")}
          >
            Check Profile
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>
      </div>

      {/* ✅ Update Profile Form */}
      <form onSubmit={handleSave} className="flex flex-col gap-6">
        {/* Name */}
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            Your Name <span className="text-red-500">*</span>
          </p>
          <Input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your display name"
            disabled={isSaving}
          />
        </div>

        {/* Bio */}
        <div className="flex flex-col gap-2">
          <p className="text-sm">Bio / About You</p>
          <Textarea
            className="input min-h-[90px]"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Short intro (e.g. CSE student | AI/ML | Web Dev)"
            disabled={isSaving}
          />
        </div>

        {/* Skills */}
        <div className="flex flex-col gap-2">
          <p className="text-sm">Skills / Tech Stack</p>
          <Input
            className="input"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g. React, Next.js, Firebase, DSA"
            disabled={isSaving}
          />
          <p className="text-xs text-light-100">
            Tip: Use comma separated skills.
          </p>
        </div>

        {/* Resume */}
        <div className="flex flex-col gap-2">
          <p className="text-sm">Resume Link (Google Drive / others)</p>
          <Input
            className="input"
            value={resumeURL}
            onChange={(e) => setResumeURL(e.target.value)}
            placeholder="Paste your resume link"
            disabled={isSaving}
          />

          <p className="text-xs text-light-100">
            Tip: Use a shareable link. If it’s private, you’ll see "request access".
          </p>

          {resumeURL?.trim() && (
            <a
              href={resumeURL}
              target="_blank"
              rel="noreferrer"
              className="text-primary-200 underline text-xs mt-1"
            >
              Preview Resume Link
            </a>
          )}
        </div>

        {/* GitHub */}
        <div className="flex flex-col gap-2">
          <p className="text-sm">GitHub Profile</p>
          <Input
            className="input"
            value={github}
            onChange={(e) => setGithub(e.target.value)}
            placeholder="https://github.com/username"
            disabled={isSaving}
          />
        </div>

        {/* LinkedIn */}
        <div className="flex flex-col gap-2">
          <p className="text-sm">LinkedIn Profile</p>
          <Input
            className="input"
            value={linkedin}
            onChange={(e) => setLinkedin(e.target.value)}
            placeholder="https://linkedin.com/in/username"
            disabled={isSaving}
          />
        </div>

        {/* Portfolio */}
        <div className="flex flex-col gap-2">
          <p className="text-sm">Portfolio Website</p>
          <Input
            className="input"
            value={portfolio}
            onChange={(e) => setPortfolio(e.target.value)}
            placeholder="https://yourportfolio.com"
            disabled={isSaving}
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 flex-wrap">
          <Button variant="default" className="w-fit" type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>

          <Button
            type="button"
            variant="outline"
            className="w-fit"
            onClick={handleReset}
            disabled={isSaving}
          >
            Reset
          </Button>
        </div>
      </form>
    </div>
  );
}
