"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus, Edit, Trash2, ExternalLink, Loader2, Save } from "lucide-react";
import { getCourseDetails, updateCourseResources } from "@/lib/actions/admin-resources.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function CourseResourcesAdminPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId;

  const [course, setCourse] = useState(null);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Dialog states
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null); // null means adding new
  const [formData, setFormData] = useState({
    name: "",
    desc: "",
    type: "Course",
    url: "",
  });

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoading(true);
        const res = await getCourseDetails(courseId);
        if (res.success && isMounted) {
          setCourse(res.course);
          setResources(res.course.resources || []);
        } else if (isMounted) {
          toast.error(res.error || "Failed to load course details");
        }
      } catch (err) {
        console.error(err);
        if (isMounted) toast.error("Error loading course details");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (courseId) {
      loadData();
    }
    return () => {
      isMounted = false;
    };
  }, [courseId]);

  const handleOpenCreate = () => {
    setEditingIndex(null);
    setFormData({
      name: "",
      desc: "",
      type: "Course",
      url: "",
    });
    setShowFormDialog(true);
  };

  const handleOpenEdit = (index) => {
    setEditingIndex(index);
    const item = resources[index];
    setFormData({
      name: item.name || "",
      desc: item.desc || "",
      type: item.type || "Course",
      url: item.url || "",
    });
    setShowFormDialog(true);
  };

  const handleDelete = (index) => {
    const confirm = window.confirm("Are you sure you want to remove this resource?");
    if (confirm) {
      const updated = resources.filter((_, idx) => idx !== index);
      setResources(updated);
      toast.success("Resource removed from list. Click 'Save Changes' to persist.");
    }
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!formData.name || !formData.url) {
      toast.error("Name and URL are required");
      return;
    }

    if (editingIndex !== null) {
      // Editing
      const updated = [...resources];
      updated[editingIndex] = { ...formData };
      setResources(updated);
      toast.success("Resource updated in list. Click 'Save Changes' to persist.");
    } else {
      // Adding new
      setResources([...resources, { ...formData }]);
      toast.success("Resource added to list. Click 'Save Changes' to persist.");
    }
    setShowFormDialog(false);
  };

  const handleSaveToFirestore = async () => {
    try {
      setSaving(true);
      const res = await updateCourseResources(courseId, resources);
      if (res.success) {
        toast.success("All resource changes saved successfully!");
      } else {
        toast.error(res.error || "Failed to save resource changes");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
        <p className="text-slate-400 text-sm">Loading course resources...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/courses")}
            className="border-slate-200 dark:border-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              {course?.title || "Course"} Resources
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Manage learning material items (Videos, Articles, Practice labs, etc.)
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSaveToFirestore}
            disabled={saving}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button onClick={handleOpenCreate} className="btn-primary font-bold">
            <Plus className="h-4 w-4 mr-2" />
            Add Resource
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl backdrop-blur-sm shadow-sm overflow-hidden text-sm">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-4 p-4 bg-slate-50/50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 items-center">
          <div className="col-span-3">Resource Name</div>
          <div className="col-span-4">Description</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">URL</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Table Body */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {resources.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              No resources configured for this course. Click &quot;Add Resource&quot; to begin.
            </div>
          ) : (
            resources.map((res, index) => (
              <div
                key={index}
                className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-slate-100/50 dark:hover:bg-slate-900/20 transition-colors"
              >
                <div className="col-span-3 font-semibold text-slate-800 dark:text-slate-100">
                  {res.name}
                </div>
                <div className="col-span-4 text-xs text-slate-500 dark:text-slate-400 truncate">
                  {res.desc || "N/A"}
                </div>
                <div className="col-span-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                    {res.type || "Course"}
                  </span>
                </div>
                <div className="col-span-2 truncate">
                  <a
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Link <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="col-span-1 text-right flex justify-end gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(index)}
                    className="h-8 w-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(index)}
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

      {/* Dialog for Add/Edit Resource */}
      <Dialog open={showFormDialog} onOpenChange={setShowFormDialog}>
        <DialogContent className="bg-slate-900 border border-slate-800 text-white">
          <DialogHeader>
            <DialogTitle>{editingIndex !== null ? "Edit" : "Add"} Resource</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Configure course resource details below.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Name</label>
              <Input
                type="text"
                placeholder="NeetCode Roadmap"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-950 border-slate-850 text-sm text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Description</label>
              <Input
                type="text"
                placeholder="Step-by-step algorithms map"
                value={formData.desc}
                onChange={(e) => setFormData({ ...formData, desc: e.target.value })}
                className="bg-slate-950 border-slate-850 text-sm text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded-md bg-slate-950 border border-slate-850 p-2 text-sm text-white focus:outline-none"
              >
                <option value="Course">Course</option>
                <option value="Video">Video</option>
                <option value="Article">Article</option>
                <option value="Practice">Practice</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-300">URL</label>
              <Input
                type="url"
                placeholder="https://example.com"
                value={formData.url}
                onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                className="bg-slate-950 border-slate-850 text-sm text-white"
              />
            </div>
            <DialogFooter className="mt-6">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowFormDialog(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button type="submit" className="btn-primary font-bold">
                {editingIndex !== null ? "Update" : "Add"} Resource
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
