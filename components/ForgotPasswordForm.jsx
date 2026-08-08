"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import FormField from "./FormField";
import { sendPasswordResetEmailCustom } from "@/lib/actions/auth.action";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const ForgotPasswordForm = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sentEmail, setSentEmail] = useState("");

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      setIsLoading(true);

      const result = await sendPasswordResetEmailCustom(data.email);

      if (!result.success) {
        toast.error(result.message);
        return;
      }

      setSentEmail(data.email);
      setEmailSent(true);
      
      toast.success(
        `Password reset link sent to ${data.email}. Check your inbox!`
      );

      // Redirect to sign-in after 5 seconds
      setTimeout(() => {
        router.push("/sign-in");
      }, 5000);
    } catch (error) {
      console.error("Password reset error:", error);
      toast.error(`Error: ${error.message || error}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="card-border w-full">
        <div className="flex flex-col gap-6 card py-10 px-6 sm:px-10">
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

          <div className="text-center space-y-4">
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <h3 className="text-lg font-semibold text-green-400 mb-2">
                Reset Link Sent!
              </h3>
              <p className="text-sm text-light-200 mb-3">
                We've sent a password reset link to:
              </p>
              <p className="text-sm font-medium text-green-300 mb-4">
                {sentEmail}
              </p>
              <p className="text-xs text-light-300">
                Check your inbox and spam folder. The link expires in 1 hour.
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <p className="text-sm text-light-200">
                Redirecting to sign-in in a few seconds...
              </p>
              <Link href="/sign-in" className="block">
                <Button className="btn w-full">
                  Back to Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-border w-full">
      <div className="flex flex-col gap-6 card py-10 px-6 sm:px-10">
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
          <h3 className="text-xl font-semibold mb-2">Reset Your Password</h3>
          <p className="text-sm text-light-300">
            Enter your email address and we'll send you a link to reset your password
          </p>
        </div>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6 mt-4 form"
          >
            <FormField
              control={form.control}
              name="email"
              label="Email"
              placeholder="Your email address"
              type="email"
            />

            <Button
              className="btn w-full"
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Sending..." : "Send Reset Link"}
            </Button>
          </form>
        </Form>

        <div className="flex gap-2 justify-center text-sm">
          <p className="text-light-300">Remember your password?</p>
          <Link href="/sign-in" className="font-semibold text-primary-200 hover:text-primary-100">
            Sign In
          </Link>
        </div>

        <div className="pt-4 border-t border-dark-300">
          <p className="text-xs text-light-400 text-center">
            Don't have an account?{" "}
            <Link href="/sign-up" className="text-primary-200 hover:text-primary-100 font-semibold">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;
