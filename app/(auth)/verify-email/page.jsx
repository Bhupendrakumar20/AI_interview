"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { auth } from "@/firebase/client";
import { applyActionCode, reload } from "firebase/auth";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const VerifyEmailPage = () => {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("Verifying your email...");
  const [errorDetails, setErrorDetails] = useState("");

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        // Get the verification code from URL
        const code = searchParams.get("oobCode");
        const mode = searchParams.get("mode");

        if (!code) {
          setStatus("error");
          setMessage("Invalid verification link");
          setErrorDetails("Verification code missing. Please try again.");
          return;
        }

        // Apply the verification code
        // This link can be for:
        // - Email verification (mode=verifyEmail)
        // - Password reset (mode=resetPassword)
        // - Email change (mode=verifyAndChangeEmail)
        await applyActionCode(auth, code);

        // Reload user to get updated email verification status
        const user = auth.currentUser;
        if (user) {
          await reload(user);
        }

        if (mode === "verifyEmail") {
          setStatus("success");
          setMessage("✅ Email verified successfully!");
          setErrorDetails("Your email has been confirmed. Redirecting...");

          setTimeout(() => {
            router.push("/");
          }, 3000);
        } else if (mode === "verifyAndChangeEmail") {
          setStatus("success");
          setMessage("✅ Email updated successfully!");
          setErrorDetails("Your email has been changed and verified. Redirecting...");

          setTimeout(() => {
            router.push("/profile");
          }, 3000);
        } else if (mode === "resetPassword") {
          // This shouldn't reach here, but just in case
          setStatus("success");
          setMessage("✅ Password reset link verified!");
          setErrorDetails("Redirecting to password reset page...");

          setTimeout(() => {
            router.push("/reset-password?code=" + code);
          }, 2000);
        } else {
          setStatus("success");
          setMessage("✅ Verification successful!");
          setErrorDetails("Your action has been completed. Redirecting...");

          setTimeout(() => {
            router.push("/");
          }, 3000);
        }

        toast.success(message);
      } catch (error) {
        console.error("Email verification error:", error);

        setStatus("error");

        // Handle specific Firebase error codes
        if (error.code === "auth/invalid-action-code") {
          setMessage("❌ Invalid or expired verification link");
          setErrorDetails("Please request a new verification email.");
        } else if (error.code === "auth/operation-not-allowed") {
          setMessage("❌ Operation not allowed");
          setErrorDetails("Email verification is not enabled for this account.");
        } else if (error.code === "auth/user-disabled") {
          setMessage("❌ This account has been disabled");
          setErrorDetails("Please contact support for more information.");
        } else if (error.code === "auth/expired-action-code") {
          setMessage("❌ Verification link has expired");
          setErrorDetails("Please request a new verification email.");
        } else {
          setMessage("❌ Verification failed");
          setErrorDetails(error.message || "An unexpected error occurred.");
        }

        toast.error(message);
      }
    };

    // Only verify if we have search params
    if (searchParams.size > 0) {
      verifyEmail();
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-100 p-4">
      <div className="card-border lg:min-w-[566px]">
        <div className="flex flex-col gap-6 card py-14 px-10">
          {/* Logo */}
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

          {/* Content */}
          <div className="text-center space-y-4">
            {status === "verifying" && (
              <>
                <div className="flex justify-center mb-4">
                  <div className="animate-spin">
                    <div className="w-12 h-12 border-4 border-primary-200/30 border-t-primary-200 rounded-full"></div>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-light-100">
                  {message}
                </h3>
                <p className="text-sm text-light-300">
                  Please wait while we verify your email...
                </p>
              </>
            )}

            {status === "success" && (
              <>
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <h3 className="text-lg font-semibold text-green-400 mb-2">
                    {message}
                  </h3>
                  <p className="text-sm text-light-200">{errorDetails}</p>
                </div>

                <div className="pt-4 space-y-3">
                  <p className="text-xs text-light-400">
                    Redirecting in a few seconds or click below to proceed
                  </p>
                  <Link href="/" className="block">
                    <Button className="btn w-full">
                      Continue to Dashboard
                    </Button>
                  </Link>
                </div>
              </>
            )}

            {status === "error" && (
              <>
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <h3 className="text-lg font-semibold text-red-400 mb-2">
                    {message}
                  </h3>
                  <p className="text-sm text-light-200">{errorDetails}</p>
                </div>

                <div className="pt-4 space-y-3">
                  <Link href="/settings" className="block">
                    <Button className="btn w-full">
                      Go to Settings
                    </Button>
                  </Link>
                  <Link href="/" className="block">
                    <Button className="btn-secondary w-full">
                      Back to Dashboard
                    </Button>
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Support */}
          <div className="pt-4 border-t border-dark-300 text-center">
            <p className="text-xs text-light-400">
              Still having trouble?{" "}
              <Link
                href="/support"
                className="text-primary-200 hover:text-primary-100 font-semibold"
              >
                Contact support
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmailPage;
