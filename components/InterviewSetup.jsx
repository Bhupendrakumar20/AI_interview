"use client";

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

      if (result?.success && result.interviewId) {
        toast.success("Interview created! Starting now...");
        router.push(`/interview/${result.interviewId}`);
      } else {
        toast.error(result?.error || "Failed to create interview. Try again.");
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="w-full space-y-4 form"
      >
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

        <FormField
          control={form.control}
          name="techstack"
          label="Tech Stack (optional)"
          placeholder="e.g. React, Node.js, SQL"
          type="text"
        />

        {/* Difficulty */}
        <FormItem>
          <FormLabel className="label">Difficulty</FormLabel>
          <FormControl>
            <select
              className="input"
              {...form.register("difficulty")}
              defaultValue="Medium"
            >
              <option value="Easy">Easy</option>
              <option value="Medium">Medium</option>
              <option value="Hard">Hard</option>
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>

        {/* Type */}
        <FormItem>
          <FormLabel className="label">Interview Type</FormLabel>
          <FormControl>
            <select className="input" {...form.register("type")}>
              <option value="Technical">Technical</option>
              <option value="Behavioral">Behavioral</option>
              <option value="Mixed">Mixed</option>
            </select>
          </FormControl>
          <FormMessage />
        </FormItem>

        <Button className="btn" type="submit" disabled={isPending}>
          {isPending ? "Generating Questions..." : "Generate Interview"}
        </Button>
      </form>
    </Form>
  );
};

export default InterviewSetup;
