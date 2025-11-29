"use client";

import { useState } from "react";
import { toast } from "sonner";

import { updateProfileAction } from "@/lib/actions/profile.action";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function UpdateProfileForm({ user }) {
  const [name, setName] = useState(user?.name || "");
  const [resumeURL, setResumeURL] = useState(user?.resumeURL || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    const res = await updateProfileAction({ name, resumeURL });

    setIsSaving(false);

    if (!res?.success) {
      toast.error(res?.error || "Something went wrong.");
      return;
    }

    toast.success("Profile updated!");
  };

  return (
    <form
      onSubmit={handleSave}
      className="flex flex-col gap-6 max-w-xl w-full"
    >
      {/* Name */}
      <div className="flex flex-col gap-2">
        <p className="text-sm">Your Name</p>
        <Input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your display name"
        />
      </div>

      {/* Resume Link */}
      <div className="flex flex-col gap-2">
        <p className="text-sm">Resume Link (Google Drive / others)</p>
        <Input
          className="input"
          value={resumeURL}
          onChange={(e) => setResumeURL(e.target.value)}
          placeholder="Paste your resume link (e.g. Google Drive)"
        />
        <p className="text-xs text-light-100">
          Tip: Use a shareable link. If it’s private, you’ll see &quot;request
          access&quot; when opening it.
        </p>

        {user?.resumeURL && (
          <a
            href={user.resumeURL}
            target="_blank"
            className="text-primary-200 underline text-xs mt-1"
          >
            Open current resume link
          </a>
        )}
      </div>

      <Button className="btn-primary w-fit" type="submit" disabled={isSaving}>
        {isSaving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
