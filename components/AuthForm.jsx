"use client";

import { z } from "zod";
import Link from "next/link";
import Image from "next/image";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useEffect } from "react";

import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import FormField from "./FormField";

import { signIn, signUp, sendEmailOTP } from "@/lib/actions/auth.action";

const authFormSchema = (type, showOtp) => {
  return z.object({
    name: type === "sign-up" ? z.string().min(3, "Name must be at least 3 characters") : z.string().optional(),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    otp: showOtp 
      ? z.string().min(6, "OTP must be 6 digits").max(6, "OTP must be 6 digits") 
      : z.string().optional(),
  });
};

const AuthForm = ({ type }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showOtp, setShowOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);

  useEffect(() => {
    const errorParam = searchParams?.get("error");
    if (errorParam) {
      let friendlyMessage = "An error occurred during authentication.";
      if (errorParam === "token_exchange_failed") {
        friendlyMessage = "Google OAuth connection failed. Redirect URI mismatch or bad request.";
      } else if (errorParam === "google_oauth_not_configured_use_mock_for_dev") {
        friendlyMessage = "Google OAuth keys are not set. Use Developer Quick Sign-In.";
      } else if (errorParam === "email_not_provided_by_google") {
        friendlyMessage = "Could not get email from Google Account.";
      } else {
        friendlyMessage = decodeURIComponent(errorParam);
      }
      toast.error(friendlyMessage);
      
      // Clean query parameter from address bar
      router.replace(type === "sign-in" ? "/sign-in" : "/sign-up");
    }
  }, [searchParams, type]);

  const formSchema = authFormSchema(type, showOtp);
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      otp: "",
    },
  });

  const onSubmit = async (data) => {
    try {
      if (type === "sign-up") {
        const { name, email, password, otp } = data;

        if (!showOtp) {
          // Send OTP code first
          setIsSendingOtp(true);
          const otpResult = await sendEmailOTP(email);
          setIsSendingOtp(false);

          if (otpResult.success) {
            setShowOtp(true);
            toast.success("OTP verification code sent. Please check your email and enter the code below.");
          } else {
            toast.error(otpResult.message || "Failed to send OTP. Please try again.");
          }
          return;
        }

        // Complete register verification with OTP
        const result = await signUp({
          name,
          email,
          password,
          otp,
        });

        if (!result.success) {
          toast.error(result.message);
          return;
        }

        toast.success("Account created successfully. Please sign in.");
        router.push("/sign-in");
      } else {
        const { email, password, otp } = data;

        const result = await signIn({
          email,
          password,
          otp,
        });

        if (!result.success) {
          toast.error(result.message || "Sign in failed");
          return;
        }

        if (result.requiresMfa) {
          setShowOtp(true);
          toast.success(result.message || "2-Factor Authentication Code sent to your email.");
          return;
        }

        toast.success("Signed in successfully.");
        router.refresh();
        if (result.isAdmin) {
          router.push("/admin");
        } else {
          router.push("/");
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(`There was an error: ${error.message || error}`);
    }
  };

  const handleGoogleSignIn = () => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
    const redirectUri = `${window.location.origin}/api/auth/google`;
    
    if (!clientId) {
      // If client ID is not configured, show error or guide developer
      toast.error("Google Client ID is not configured. Setting mock login instead.");
      handleDevMockLogin();
      return;
    }

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=email%20profile&prompt=select_account`;
    
    window.location.href = authUrl;
  };

  const handleDevMockLogin = async () => {
    const email = form.getValues("email") || "dev.user@example.com";
    const name = form.getValues("name") || "Developer User";
    
    toast.info("Logging in with simulated Dev credentials...");
    window.location.href = `/api/auth/google?mock_email=${encodeURIComponent(
      email
    )}&mock_name=${encodeURIComponent(name)}`;
  };

  const isSignIn = type === "sign-in";

  return (
    <div className="card-border w-full">
      <div className="flex flex-col gap-6 card py-10 px-6 sm:px-10">
        <div className="flex flex-col gap-3 justify-center items-center">
          <Image src="/logo_icon.png" alt="logo" height={40} width={40} className="object-contain" />
          <div className="text-center">
            <h2 className="text-foreground font-bold text-xl">PrepWise</h2>
            <p className="text-xs text-muted-foreground">Career Platform</p>
          </div>
        </div>

        <h3 className="text-foreground">Practice job interviews with AI</h3>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="w-full space-y-6 mt-4 form"
          >
            {!isSignIn && (
              <FormField
                control={form.control}
                name="name"
                label="Name"
                placeholder="Your Name"
                type="text"
              />
            )}

            <FormField
              control={form.control}
              name="email"
              label="Email"
              placeholder="Your email address"
              type="email"
            />

            <FormField
              control={form.control}
              name="password"
              label="Password"
              placeholder="Enter your password"
              type="password"
            />

            {showOtp && (
              <FormField
                control={form.control}
                name="otp"
                label="OTP Verification Code"
                placeholder="Enter 6-digit code"
                type="text"
              />
            )}

            {isSignIn && (
              <div className="text-right">
                <Link
                  href="/forgot-password"
                  className="text-xs text-primary hover:text-primary/80 font-semibold transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <Button className="btn cursor-pointer w-full" type="submit" disabled={isSendingOtp}>
                {isSendingOtp 
                  ? "Sending OTP..." 
                  : isSignIn 
                    ? (showOtp ? "Verify and Sign In" : "Sign In") 
                    : showOtp 
                      ? "Verify and Register" 
                      : "Send OTP and Register"}
              </Button>

              <div className="flex items-center my-2">
                <hr className="flex-1 border-muted-foreground/20" />
                <span className="px-3 text-xs text-muted-foreground">OR</span>
                <hr className="flex-1 border-muted-foreground/20" />
              </div>

              <Button
                className="btn-google cursor-pointer border border-muted-foreground/30 flex items-center justify-center gap-2 w-full py-2 bg-transparent hover:bg-muted-foreground/5 text-foreground transition-colors"
                onClick={handleGoogleSignIn}
                type="button"
              >
                Sign In with Google
              </Button>

              {process.env.NODE_ENV === "development" && (
                <Button
                  className="btn-mock cursor-pointer bg-amber-600/90 text-white flex items-center justify-center gap-2 hover:bg-amber-700 w-full"
                  onClick={handleDevMockLogin}
                  type="button"
                >
                  Developer Quick Sign-In
                </Button>
              )}
            </div>
          </form>
        </Form>

        <p className="text-center text-muted-foreground text-sm">
          {isSignIn ? "No account yet?" : "Have an account already?"}
          <Link
            href={!isSignIn ? "/sign-in" : "/sign-up"}
            className="font-bold text-primary ml-1"
          >
            {!isSignIn ? "Sign In" : "Sign Up"}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
