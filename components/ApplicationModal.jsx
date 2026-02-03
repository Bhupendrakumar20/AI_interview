// components/ApplicationModal.jsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { applyForInternship } from "@/lib/actions/general.action";

export default function ApplicationModal({ internship, userId, userEmail, onClose }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    resumeUrl: "",
    coverLetter: "",
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!userId) {
      toast.error("Please login to apply");
      return;
    }

    setLoading(true);
    try {
      const result = await applyForInternship({
        internshipId: internship.id,
        userId,
        userEmail,
        resumeUrl: formData.resumeUrl,
        coverLetter: formData.coverLetter,
      });

      if (result.success) {
        toast.success("Application submitted successfully!");
        onClose();
      } else {
        toast.error(result.error || "Failed to submit application");
      }
    } catch (error) {
      toast.error("An error occurred");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-300 rounded-lg max-w-md w-full p-6">
        <h2 className="text-2xl font-bold mb-2">Apply for {internship.title}</h2>
        <p className="text-light-100 mb-6">at {internship.company}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Resume URL *
            </label>
            <Input
              type="url"
              value={formData.resumeUrl}
              onChange={(e) => setFormData({...formData, resumeUrl: e.target.value})}
              placeholder="https://drive.google.com/your-resume"
              required
            />
            <p className="text-xs text-light-100 mt-1">
              Provide a link to your resume (Google Drive, Dropbox, etc.)
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Cover Letter
            </label>
            <Textarea
              value={formData.coverLetter}
              onChange={(e) => setFormData({...formData, coverLetter: e.target.value})}
              placeholder="Tell us why you're a great fit for this position..."
              rows={4}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="btn-primary">
              {loading ? "Submitting..." : "Submit Application"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}