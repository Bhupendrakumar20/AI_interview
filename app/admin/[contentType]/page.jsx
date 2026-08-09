// app/admin/[contentType]/page.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { io } from "socket.io-client";
import { getDynamicContent, saveDynamicContent, deleteContent } from "@/lib/actions/admin.action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Calendar,
  Filter,
  Download,
  MoreVertical,
  Activity,
  Database,
  Shield,
  Settings,
  ArrowLeft
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
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function DynamicAdminContentPage() {
  const params = useParams();
  const router = useRouter();
  const contentType = params.contentType || "";
  
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0, pages: 0 });
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({});

  const socketRef = useRef(null);

  useEffect(() => {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const socketUrl = isLocal ? 'http://localhost:4002' : (process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:4002');
    
    console.log(`🔌 Admin connecting to socket server: ${socketUrl}`);
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Admin connected to socket server');
    });
    
    return () => {
      socket.disconnect();
    };
  }, []);

  // Dynamic configurations based on the requested page content type
  const config = {
    jobs: {
      title: "Jobs Management",
      subtitle: "Add, update, and manage job listings on PrepWise",
      headers: ["Job Title", "Company", "Location", "Salary", "Created"],
      fields: [
        { name: "title", label: "Job Title", type: "text", placeholder: "Software Engineer" },
        { name: "company", label: "Company", type: "text", placeholder: "Google" },
        { name: "location", label: "Location", type: "text", placeholder: "Remote / NY" },
        { name: "salary", label: "Salary Budget", type: "text", placeholder: "$120,000 - $150,000" },
        { name: "description", label: "Description", type: "textarea", placeholder: "Job description details..." }
      ],
      renderRow: (item) => [
        <span key="title" className="font-semibold text-slate-800 dark:text-slate-100">{item.title || "Untitled Job"}</span>,
        <span key="company" className="text-slate-600 dark:text-slate-300">{item.company || "N/A"}</span>,
        <span key="location" className="text-xs text-slate-400">{item.location || "Remote"}</span>,
        <span key="salary" className="text-xs text-emerald-500 font-semibold">{item.salary || "Negotiable"}</span>,
        <span key="createdAt" className="text-xs text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "N/A"}</span>
      ]
    },
    internships: {
      title: "Internships Management",
      subtitle: "Add, update, and manage internship listings on PrepWise",
      headers: ["Internship Title", "Company", "Duration", "Stipend", "Created"],
      fields: [
        { name: "title", label: "Internship Title", type: "text", placeholder: "Frontend Intern" },
        { name: "company", label: "Company", type: "text", placeholder: "Meta" },
        { name: "duration", label: "Duration", type: "text", placeholder: "3 Months" },
        { name: "stipend", label: "Stipend / Month", type: "text", placeholder: "$3,000 / Mo" },
        { name: "description", label: "Description", type: "textarea", placeholder: "Internship requirements..." }
      ],
      renderRow: (item) => [
        <span key="title" className="font-semibold text-slate-800 dark:text-slate-100">{item.title || "Untitled Intern"}</span>,
        <span key="company" className="text-slate-600 dark:text-slate-300">{item.company || "N/A"}</span>,
        <span key="duration" className="text-xs text-slate-400">{item.duration || "N/A"}</span>,
        <span key="stipend" className="text-xs text-emerald-500 font-semibold">{item.stipend || "Unpaid"}</span>,
        <span key="createdAt" className="text-xs text-slate-400">{item.createdAt ? new Date(item.createdAt).toLocaleDateString() : "N/A"}</span>
      ]
    },
    interviews: {
      title: "Interviews Log",
      subtitle: "Review mock interview sessions and performance scores",
      headers: ["User Email", "Role / Topic", "Trust Score", "Status", "Timestamp"],
      fields: [
        { name: "email", label: "User Email", type: "text", placeholder: "user@example.com" },
        { name: "role", label: "Role / Category", type: "text", placeholder: "React Developer" },
        { name: "score", label: "Assessment Score", type: "text", placeholder: "85%" },
        { name: "status", label: "Status", type: "text", placeholder: "Completed" }
      ],
      renderRow: (item) => [
        <span key="email" className="font-semibold text-slate-800 dark:text-slate-100">{item.email || item.userId || "Anonymous User"}</span>,
        <span key="role" className="text-slate-600 dark:text-slate-300">{item.role || item.topic || "N/A"}</span>,
        <span key="score" className="text-xs text-cyan-400 font-bold">{item.score || item.atsScore || "N/A"}</span>,
        <span key="status" className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400 text-xs rounded-full text-center inline-block">{item.status || "Completed"}</span>,
        <span key="timestamp" className="text-xs text-slate-400">{item.timestamp ? new Date(item.timestamp).toLocaleDateString() : "N/A"}</span>
      ]
    },
    competitions: {
      title: "Competitions Management",
      subtitle: "Configure public hackathons and coding contests",
      headers: ["Contest Title", "Prize Pool", "Category", "Deadline"],
      fields: [
        { name: "title", label: "Contest Title", type: "text", placeholder: "Algorithmic Showdown" },
        { name: "prizePool", label: "Prize Pool", type: "text", placeholder: "$5,000" },
        { name: "category", label: "Category", type: "text", placeholder: "DSA / Competitive" },
        { name: "deadline", label: "Registration Deadline", type: "text", placeholder: "2026-09-01" }
      ],
      renderRow: (item) => [
        <span key="title" className="font-semibold text-slate-800 dark:text-slate-100">{item.title || "Untitled Contest"}</span>,
        <span key="prizePool" className="text-xs text-emerald-500 font-semibold">{item.prizePool || "N/A"}</span>,
        <span key="category" className="text-xs text-slate-400">{item.category || "General"}</span>,
        <span key="deadline" className="text-xs text-slate-400">{item.deadline || "N/A"}</span>
      ]
    },
    mentors: {
      title: "Mentors Roster",
      subtitle: "Approve and manage system mentor profiles",
      headers: ["Name", "Specialization", "Rating", "Email"],
      fields: [
        { name: "name", label: "Mentor Name", type: "text", placeholder: "Dr. Alice" },
        { name: "specialization", label: "Specialization", type: "text", placeholder: "Machine Learning" },
        { name: "rating", label: "Average Rating", type: "text", placeholder: "4.9" },
        { name: "email", label: "Email Address", type: "text", placeholder: "alice@prepwise.ai" }
      ],
      renderRow: (item) => [
        <span key="name" className="font-semibold text-slate-800 dark:text-slate-100">{item.name || "N/A"}</span>,
        <span key="specialization" className="text-xs text-slate-400">{item.specialization || "General Mentor"}</span>,
        <span key="rating" className="text-xs text-amber-500 font-bold">★ {item.rating || "5.0"}</span>,
        <span key="email" className="text-xs text-slate-400">{item.email || "N/A"}</span>
      ]
    },
    courses: {
      title: "Courses Catalogue",
      subtitle: "Manage learning paths and curriculum resources",
      headers: ["Badge", "Course Title", "Subtitle", "Resources Count"],
      fields: [
        { name: "badge", label: "Badge (e.g. DSA)", type: "text", placeholder: "DSA" },
        { name: "title", label: "Course Title", type: "text", placeholder: "Data Structures and Algorithms" },
        { name: "subtitle", label: "Subtitle", type: "text", placeholder: "Pattern recognition and practice..." },
        { name: "color", label: "Color (e.g. cyan, violet)", type: "text", placeholder: "cyan" }
      ],
      renderRow: (item, router) => [
        <span key="badge" className="px-2 py-0.5 bg-primary-200/20 text-primary-100 text-xs font-semibold rounded-full border border-primary-200/40 inline-block">{item.badge || "N/A"}</span>,
        <span key="title" className="font-semibold text-slate-800 dark:text-slate-100">{item.title || "Untitled Course"}</span>,
        <span key="subtitle" className="text-xs text-slate-400 max-w-[200px] truncate block">{item.subtitle || "N/A"}</span>,
        <button
          key="resources"
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/admin/courses/${item.id}/resources`);
          }}
          className="text-xs font-bold text-emerald-500 hover:underline hover:text-emerald-400 cursor-pointer text-left"
        >
          {item.resources?.length || 0} Resources
        </button>
      ]
    }
  };

  const activeConfig = config[contentType] || null;

  useEffect(() => {
    if (activeConfig) {
      loadData();
    }
  }, [contentType, pagination.page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getDynamicContent(contentType, {
        page: pagination.page,
        limit: pagination.limit,
        search
      });
      if (result.success) {
        setData(result.data);
        setPagination(result.pagination);
      } else {
        toast.error("Failed to load records");
      }
    } catch (e) {
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const handleSaveItem = async () => {
    try {
      const result = await saveDynamicContent(contentType, selectedItem?.id, formData);
      if (result.success) {
        toast.success(`Record ${selectedItem ? "updated" : "created"} successfully`);
        
        // Emit update event via socket
        if (socketRef.current) {
          socketRef.current.emit("admin-content-update", { contentType });
        }

        setShowCreateDialog(false);
        setSelectedItem(null);
        setFormData({});
        loadData();
      } else {
        toast.error(result.error || "Save failed");
      }
    } catch (e) {
      toast.error("Failed to save");
    }
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    try {
      const result = await deleteContent(contentType, selectedItem.id);
      if (result.success) {
        toast.success("Record deleted successfully");

        // Emit update event via socket
        if (socketRef.current) {
          socketRef.current.emit("admin-content-update", { contentType });
        }

        setShowDeleteDialog(false);
        setSelectedItem(null);
        loadData();
      } else {
        toast.error(result.error || "Delete failed");
      }
    } catch (e) {
      toast.error("Failed to delete record");
    }
  };

  const handleOpenEdit = (item) => {
    setSelectedItem(item);
    const initialForm = {};
    activeConfig.fields.forEach(field => {
      initialForm[field.name] = item[field.name] || "";
    });
    setFormData(initialForm);
    setShowCreateDialog(true);
  };

  const handleOpenCreate = () => {
    setSelectedItem(null);
    const initialForm = {};
    activeConfig.fields.forEach(field => {
      initialForm[field.name] = "";
    });
    setFormData(initialForm);
    setShowCreateDialog(true);
  };

  // Render analytics dashboards or system controllers if not standard CRUD
  if (!activeConfig) {
    if (contentType === "analytics") {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} className="border-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Platform Analytics</h1>
              <p className="text-sm text-slate-500">Real-time usage metrics and system logs</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
              <CardHeader><CardTitle className="text-sm font-semibold">User Growth</CardTitle></CardHeader>
              <CardContent><div className="h-[200px] flex items-center justify-center text-slate-500">Chart Loading...</div></CardContent>
            </Card>
            <Card className="bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
              <CardHeader><CardTitle className="text-sm font-semibold">Interview Buddy Traffic</CardTitle></CardHeader>
              <CardContent><div className="h-[200px] flex items-center justify-center text-slate-500">Chart Loading...</div></CardContent>
            </Card>
            <Card className="bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
              <CardHeader><CardTitle className="text-sm font-semibold">ATS Resume uploads</CardTitle></CardHeader>
              <CardContent><div className="h-[200px] flex items-center justify-center text-slate-500">Chart Loading...</div></CardContent>
            </Card>
          </div>
        </div>
      );
    }

    if (contentType === "database") {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} className="border-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Database Control Room</h1>
              <p className="text-sm text-slate-500">Perform maintenance runs and backup Firestore schemas</p>
            </div>
          </div>
          <Card className="bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
            <CardHeader><CardTitle>Maintenance Actions</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Button className="btn-secondary mr-2">Backup Database</Button>
              <Button className="btn-secondary mr-2">Clear Cache</Button>
              <Button className="btn-primary">Re-index Schemas</Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    if (contentType === "settings") {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => router.push("/admin")} className="border-slate-800">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">System Settings</h1>
              <p className="text-sm text-slate-500">Configure global features and maintenance toggles</p>
            </div>
          </div>
          <Card className="bg-white/50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
            <CardHeader><CardTitle>Global Configuration</CardTitle></CardHeader>
            <CardContent className="space-y-4 text-sm text-slate-400">
              <p>System is operating in standard dev mode. Settings can be updated dynamically.</p>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold text-lg">404 - Admin section not found</p>
        <Button onClick={() => router.push("/admin")} className="mt-4 btn-primary">Back to Dashboard</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white capitalize">{activeConfig.title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{activeConfig.subtitle}</p>
        </div>
        <div className="flex gap-3">
          <Button className="btn-secondary font-bold">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button className="btn-primary font-bold" onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 p-4 rounded-xl backdrop-blur-sm shadow-sm">
        <form onSubmit={handleSearchSubmit} className="md:col-span-3 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            type="search"
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-sm focus-visible:ring-cyan-500/20"
          />
        </form>
        
        <Button className="btn-secondary font-bold" onClick={loadData}>
          <Filter className="h-4 w-4 mr-2" />
          Search
        </Button>
      </div>

      {/* Dynamic Data Table (Grid Layout) */}
      <div className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl backdrop-blur-sm shadow-sm overflow-hidden text-sm">
        {/* Header Row */}
        <div 
          className="grid gap-4 p-4 bg-slate-50/50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 font-semibold text-slate-700 dark:text-slate-300 items-center"
          style={{ gridTemplateColumns: `repeat(${activeConfig.headers.length}, 1fr) 80px` }}
        >
          {activeConfig.headers.map((h, i) => (
            <div key={i}>{h}</div>
          ))}
          <div className="text-right pr-4">Options</div>
        </div>

        {/* Body Rows */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {loading ? (
            <div className="text-center py-10 text-slate-400">
              Loading records...
            </div>
          ) : data.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              No records found.
            </div>
          ) : (
            data.map((item, idx) => (
              <div 
                key={`${item.id || idx}-${idx}`} 
                className="grid gap-4 p-4 items-center hover:bg-slate-100/50 dark:hover:bg-slate-905/30 transition-colors"
                style={{ gridTemplateColumns: `repeat(${activeConfig.headers.length}, 1fr) 80px` }}
              >
                {activeConfig.renderRow(item, router).map((element, idx) => (
                  <div key={idx} className="truncate">{element}</div>
                ))}
                <div className="text-right flex justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(item)}
                    title="Edit Record"
                    className="h-8 w-8 text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 cursor-pointer"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedItem(item);
                      setShowDeleteDialog(true);
                    }}
                    title="Delete Record"
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
            Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} records
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

      {/* Create / Edit Record Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white">{selectedItem ? "Edit Record" : "Create Record"}</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              Configure fields for the selected database record.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-5 my-3">
            {activeConfig.fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{field.label}</label>
                {field.type === "textarea" ? (
                  <textarea
                    rows={4}
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm p-3 outline-none focus:border-cyan-500/50 text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-cyan-500/20 transition-all"
                  />
                ) : (
                  <Input
                    type={field.type}
                    value={formData[field.name] || ""}
                    onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                    placeholder={field.placeholder}
                    className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-cyan-500/20 focus-visible:border-cyan-500/50 text-sm py-2.5 px-3 transition-all"
                  />
                )}
              </div>
            ))}
          </div>
          
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="text-xs font-semibold cursor-pointer border-slate-200 dark:border-slate-800">
              Cancel
            </Button>
            <Button onClick={handleSaveItem} className="btn-primary font-bold text-xs cursor-pointer">
              Save Record
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-800 dark:text-white">Delete Record</DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              This action cannot be undone. This will permanently delete the entry from the database.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)} className="text-xs font-semibold cursor-pointer border-slate-200 dark:border-slate-800">
              Cancel
            </Button>
            <Button 
              onClick={handleDeleteItem}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs cursor-pointer"
            >
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
