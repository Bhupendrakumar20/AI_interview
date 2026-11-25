"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Camera, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { updateProfileAction } from "@/lib/actions/profile.action";
import { signOut } from "@/lib/actions/auth.action"; // ✅ use signOut directly

import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import CheckProfileModal from "./CheckProfileModal";

function resizeImageToDataUrl(file, maxSize = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("Invalid image file"));
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas unavailable"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/webp", 0.85));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function UpdateProfileForm({ user }) {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name ?? "");
  const [photoURL, setPhotoURL] = useState(user?.photoURL ?? "");
  const [resumeURL, setResumeURL] = useState(user?.resumeURL ?? "");

  const [bio, setBio] = useState(user?.bio ?? "");
  const [skills, setSkills] = useState(user?.skills ?? "");
  const [github, setGithub] = useState(user?.github ?? "");
  const [linkedin, setLinkedin] = useState(user?.linkedin ?? "");
  const [portfolio, setPortfolio] = useState(user?.portfolio ?? "");

  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCheckProfileOpen, setIsCheckProfileOpen] = useState(false);

  const isValidURL = (url) => {
    if (!url) return true;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  const handlePhotoFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file (PNG, JPG, WEBP, GIF).");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Image must be smaller than 8 MB.");
      return;
    }
    try {
      const dataUrl = await resizeImageToDataUrl(file, 256);
      setPhotoURL(dataUrl);
      toast.success("Photo ready! Click Save Changes to apply.");
    } catch {
      toast.error("Could not process that image.");
    } finally {
      e.target.value = "";
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();

    const trimmedPhoto = photoURL.trim();
    const isDataImage = /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(trimmedPhoto);

    const payload = {
      name: name.trim(),
      photoURL: trimmedPhoto,
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

    if (trimmedPhoto && !isDataImage && !isValidURL(trimmedPhoto)) {
      toast.error("Please enter a valid profile image URL or upload a photo!");
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

      toast.success("Profile updated successfully!");
      router.refresh();
    } catch (error) {
      toast.error("❌ Server error. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setName(user?.name ?? "");
    setPhotoURL(user?.photoURL ?? "");
    setResumeURL(user?.resumeURL ?? "");
    setBio(user?.bio ?? "");
    setSkills(user?.skills ?? "");
    setGithub(user?.github ?? "");
    setLinkedin(user?.linkedin ?? "");
    setPortfolio(user?.portfolio ?? "");
    toast.success("Reset to saved profile!");
  };

  // ✅ Logout
  const handleLogout = async () => {
    const ok = confirm("Do you want to logout?");
    if (!ok) return;

    setIsLoggingOut(true);

    try {
      await signOut(); // ✅ clears session cookie
      toast.success("Logged out successfully!");
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
          toast.success("User ID copied!");
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
        toast.success("User ID copied!");
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
            onClick={() => setIsCheckProfileOpen(true)}
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
        {/* Profile Photo */}
        <div className="flex flex-col gap-2.5">
          <p className="text-sm font-medium">Profile Image</p>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="w-16 h-16 rounded-full p-[2px] bg-linear-to-br from-indigo-400 via-blue-500 to-purple-500 shrink-0">
              <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt={name || "Profile preview"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-base font-bold text-indigo-600 dark:text-indigo-300">
                    {(name || user?.email || "PW").slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2 flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isSaving}
                  onClick={() => fileInputRef.current?.click()}
                  className="gap-1.5"
                >
                  <Camera className="h-4 w-4" />
                  {photoURL ? "Change Photo" : "Upload Photo"}
                </Button>
                {photoURL && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isSaving}
                    onClick={() => setPhotoURL("")}
                    className="text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 gap-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove
                  </Button>
                )}
              </div>
              <Input
                className="input"
                value={photoURL.startsWith("data:image/") ? "" : photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                placeholder={
                  photoURL.startsWith("data:image/")
                    ? "Uploaded photo ready (or paste https:// image URL)"
                    : "Or paste an image URL (https://...)"
                }
                disabled={isSaving}
              />
            </div>
          </div>
        </div>

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
            id="profile-bio-input"
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
            id="profile-skills-input"
            className="input"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            placeholder="e.g. React, Next.js, Firebase, DSA, Python"
            disabled={isSaving}
          />
          <p className="text-xs text-light-100">
            Tip: Use comma-separated skills (up to 5 show on your Profile Card).
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

      <CheckProfileModal
        open={isCheckProfileOpen}
        onClose={() => setIsCheckProfileOpen(false)}
      />
    </div>
  );
}
