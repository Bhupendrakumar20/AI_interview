
"use client";
import React, { useState } from "react";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";

import { Form, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import FormField from "@/components/FormField";
import { Button } from "@/components/ui/button";
import { createInterview } from "@/lib/actions/general.action";

const formSchema = z.object({
  role: z.string().min(2, "Please enter a job title."),
  company: z.string().min(2, "Please enter a company."),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  techstack: z.string().optional(),
  type: z.enum(["Technical", "Behavioral", "Mixed"]).default("Technical"),
});

const InterviewSetup = ({ userId }) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lastSubmitTime, setLastSubmitTime] = useState(0);
  const DEBOUNCE_MS = 3000; // 3 seconds debounce

  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      role: "",
      company: "",
      difficulty: "Medium",
      techstack: "",
      type: "Technical",
    },
  });

  const onSubmit = (values) => {
    if (!userId) {
      toast.error("User not found. Please sign in again.");
      return;
    }

    // Debounce: prevent rapid submissions
    const now = Date.now();
    if (now - lastSubmitTime < DEBOUNCE_MS) {
      toast.error("Please wait before submitting again.");
      return;
    }
    setLastSubmitTime(now);

    startTransition(async () => {
      const techstack = values.techstack
        ? values.techstack
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean)
        : [];

      const result = await createInterview({
        userId,
        role: values.role,
        company: values.company,
        difficulty: values.difficulty,
        techstack,
        type: values.type,
      });

      // Handle 429 Too Many Requests
      if (result?.error && result?.error.includes("429")) {
        toast.error("API rate limit exceeded. Please wait and try again.");
        return;
      }

      if (result?.success && result.interviewId) {
        toast.success("Interview created! Starting now...");
        router.push(`/interview/${result.interviewId}`);
      } else {
        toast.error(result?.error || "Failed to create interview. Try again.");
      }
    });
  };

  const difficultyOptions = ["Easy", "Medium", "Hard"];
  const typeOptions = ["Technical", "Behavioral", "Mixed"];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Setup Card */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-700/50 rounded-2xl p-8 backdrop-blur-sm transition-all duration-300 hover:border-slate-600/70 shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
            M
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">Set Up Your Mock Interview</h3>
            <p className="text-sm text-slate-400 mt-1">Configure role, company, and difficulty level for personalized questions</p>
          </div>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-5"
          >
            {/* Role and Company - Two Column */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="role"
                label="Job Title / Role"
                placeholder="e.g. Software Engineer"
                type="text"
              />
              <FormField
                control={form.control}
                name="company"
                label="Target Company"
                placeholder="e.g. Google, StartupX"
                type="text"
              />
            </div>

            {/* Tech Stack */}
            <FormField
              control={form.control}
              name="techstack"
              label="Tech Stack (optional)"
              placeholder="e.g. React, Node.js, SQL"
              type="text"
            />

            {/* Difficulty and Type - Two Column */}
            <div className="grid grid-cols-2 gap-4">
              {/* Difficulty Buttons */}
              <FormItem>
                <FormLabel className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 block">Difficulty Level</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-3 gap-2">
                    {difficultyOptions.map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => form.setValue("difficulty", level)}
                        className={`py-2 px-3 rounded-lg font-semibold text-sm transition-all duration-200 text-center ${
                          form.watch("difficulty") === level
                            ? level === "Easy"
                              ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-300"
                              : level === "Medium"
                              ? "bg-amber-500/20 border border-amber-500/50 text-amber-300"
                              : "bg-red-500/20 border border-red-500/50 text-red-300"
                            : "bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </FormControl>
              </FormItem>

              {/* Type Dropdown */}
              <FormItem>
                <FormLabel className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 block">Interview Type</FormLabel>
                <FormControl>
                  <select 
                    {...form.register("type")}
                    className="w-full px-4 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-sm font-medium focus:outline-none focus:border-blue-500/50 transition-colors"
                  >
                    {typeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </FormControl>
              </FormItem>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full mt-6 py-3 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5 hover:shadow-lg shadow-blue-500/20"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  Generating Questions...
                </span>
              ) : (
                "Generate Interview"
              )}
            </button>
          </form>
        </Form>
      </div>

      {/* How It Works */}
      <div className="bg-gradient-to-br from-slate-900/50 to-slate-900/30 border border-slate-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="p-6 border-b border-slate-700/50">
          <h4 className="text-base font-bold text-white">How It Works</h4>
        </div>
        <div className="p-6 space-y-4">
          {[
            { num: "1", title: "Configure Settings", desc: "Select your target role, company, and difficulty level" },
            { num: "2", title: "Get Tailored Questions", desc: "AI generates role-specific interview questions" },
            { num: "3", title: "Answer & Record", desc: "Respond to questions with camera and microphone" },
            { num: "4", title: "Receive Feedback", desc: "Get detailed performance report and improvement tips" },
          ].map((step) => (
            <div key={step.num} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 font-bold text-white text-sm">
                {step.num}
              </div>
              <div className="pt-1">
                <div className="font-semibold text-white text-sm">{step.title}</div>
                <div className="text-xs text-slate-400 mt-1">{step.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InterviewSetup;
