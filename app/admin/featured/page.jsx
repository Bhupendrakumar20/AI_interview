"use client";

import React, { useState, useEffect } from "react";
import { getFeaturedItems, addFeaturedItem, deleteFeaturedItem } from "@/lib/actions/featured.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Trash2, Plus, Star } from "lucide-react";
import { toast } from "sonner";

export default function ManageFeatured() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("internship");
  const [buttonText, setButtonText] = useState("Apply Now");
  const [badge, setBadge] = useState("");
  const [prize, setPrize] = useState("");
  const [statsInput, setStatsInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    setLoading(true);
    const data = await getFeaturedItems();
    setItems(data);
    setLoading(false);
  }

  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this featured card?")) return;
    
    const res = await deleteFeaturedItem(id);
    if (res.success) {
      toast.success("Featured card deleted successfully");
      loadItems();
    } else {
      toast.error(res.error || "Failed to delete card");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title || !description || !buttonText) {
      toast.error("Please fill in all required fields (Title, Description, Button Text)");
      return;
    }

    setIsSubmitting(true);

    // Process stats input (comma separated values into array)
    const stats = statsInput
      ? statsInput.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    const newItemData = {
      title,
      description,
      type,
      buttonText,
      ...(company && { company }),
      ...(badge && { badge }),
      ...(prize && { prize }),
      ...(stats.length > 0 && { stats }),
    };

    const res = await addFeaturedItem(newItemData);
    setIsSubmitting(false);

    if (res.success) {
      toast.success("New featured card added successfully!");
      // Reset form
      setTitle("");
      setCompany("");
      setDescription("");
      setType("internship");
      setButtonText("Apply Now");
      setBadge("");
      setPrize("");
      setStatsInput("");
      
      // Reload items
      loadItems();
    } else {
      toast.error(res.error || "Failed to add featured card");
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Back button & Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => window.location.href = "/admin"}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Manage Featured Cards</h1>
            <p className="text-gray-500 dark:text-light-100">
              Add or remove dynamic promotional cards on the home page.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-indigo-600" />
                Add New Card
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. One Day Internship"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company / Subtitle</Label>
                  <Input
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. with Ankit or PrepWise"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the opportunity..."
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <select
                      id="type"
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="internship">Internship</option>
                      <option value="competition">Competition</option>
                      <option value="award">Award</option>
                      <option value="general">General</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="badge">Badge</Label>
                    <Input
                      id="badge"
                      value={badge}
                      onChange={(e) => setBadge(e.target.value)}
                      placeholder="e.g. New or One Day"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="prize">Prize Amount</Label>
                    <Input
                      id="prize"
                      value={prize}
                      onChange={(e) => setPrize(e.target.value)}
                      placeholder="e.g. ₹2,00,000+"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="buttonText">Button Text *</Label>
                    <Input
                      id="buttonText"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="e.g. Apply Now"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="statsInput">Bullet points / Stats (comma-separated)</Label>
                  <Input
                    id="statsInput"
                    value={statsInput}
                    onChange={(e) => setStatsInput(e.target.value)}
                    placeholder="e.g. 2 Lacs+ runners-up, 1.6 Lacs+ overviews"
                  />
                  <p className="text-[11px] text-gray-400">Separate stats using a comma (,)</p>
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Adding..." : "Add Featured Card"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Existing Cards */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Active Featured Cards ({items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-12 text-gray-500">Loading active featured cards...</div>
              ) : items.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No active cards. Create one using the form!</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {items.map((item) => (
                    <div key={item.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4 relative group flex flex-col justify-between h-[230px] bg-slate-50 dark:bg-slate-900">
                      <div>
                        {/* Type Badge & Badge */}
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300">
                            {item.type}
                          </span>
                          {item.badge && (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        {/* Title & Company */}
                        <h3 className="font-semibold text-lg leading-tight line-clamp-1">{item.title}</h3>
                        {item.company && <p className="text-sm text-indigo-600 font-medium">{item.company}</p>}

                        {/* Description */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 line-clamp-2">{item.description}</p>
                        
                        {/* Prize */}
                        {item.prize && (
                          <div className="mt-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                            Prize: {item.prize}
                          </div>
                        )}
                      </div>

                      {/* Footer & Delete Action */}
                      <div className="flex justify-between items-center mt-4">
                        <span className="text-xs text-indigo-500 font-semibold border border-indigo-500 rounded px-3 py-1 bg-white dark:bg-slate-950">
                          {item.buttonText}
                        </span>
                        
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
