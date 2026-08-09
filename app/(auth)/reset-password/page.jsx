"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, Suspense } from "react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import FormField from "@/components/FormField";
import { resetPasswordWithToken } from "@/lib/actions/auth.action";

const resetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const ResetPasswordForm = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data) => {
    if (!token) {
      toast.error("Reset token is missing. Please request a new link.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await resetPasswordWithToken(token, data.password);

      if (result.success) {
        toast.success("Password updated successfully! Please sign in.");
        router.push("/sign-in");
      } else {
        toast.error(result.message || "Failed to reset password");
      }
    } catch (error) {
      console.error(error);
      toast.error(`Error: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="card-border lg:min-w-[566px]">
        <div className="flex flex-col gap-6 card py-14 px-10 text-center">
          <h2 className="text-red-500 font-bold text-xl">Invalid Password Reset Link</h2>
          <p className="text-sm text-light-300">
            The password reset token is missing or invalid. Please request a new password reset link.
          </p>
          <Link href="/forgot-password">
            <Button className="btn w-full">Request New Link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="card-border lg:min-w-[566px]">
      <div className="flex flex-col gap-6 card py-14 px-10">
        <div className="flex flex-col gap-3 justify-center items-center">
          <Image
            src="/logo_icon.png"
            alt="logo"
            height={40}
            width={40}
            className="object-contain"
          />
          <div className="text-center">
            <h2 className="text-primary-100 font-bold text-xl">PrepWise</h2>
            <p className="text-xs text-light-300">Career Platform</p>
          </div>
        </div>

        <div className="text-center">
          <h3 className="text-xl font-semibold mb-2">Create New Password</h3>
          <p className="text-sm text-light-300">
            Please enter your new secure password below
          </p>
          <p className="text-xs text-primary-100 font-semibold mt-1">
            Note: Password must be at least 6 characters long.
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6 mt-4 form"
          >
            <FormField
              control={form.control}
              name="password"
              label="New Password"
              placeholder="Enter new password"
              type="password"
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              label="Confirm New Password"
              placeholder="Confirm your password"
              type="password"
            />

            <Button
              className="btn w-full"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Updating..." : "Reset Password"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default function Page() {
  return (
    <Suspense fallback={<div className="text-foreground p-8 text-center">Loading reset context...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
