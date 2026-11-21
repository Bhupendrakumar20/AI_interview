"use client";

import React, { useState, useEffect } from "react";
import { auth, db } from "@/firebase/client";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { Check, Sparkles, Zap, ShieldCheck } from "lucide-react";

export default function UpgradePage() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // 1. Listen for user auth state
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userDoc = await getDoc(doc(db, "users", currentUser.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (err) {
          console.error("Error fetching user data:", err);
        }
      }
    });

    // 2. Dynamically load Razorpay checkout script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    return () => {
      unsubscribe();
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handlePayment = async (planId, voiceCredits) => {
    if (!user) {
      toast.error("Please sign in first to upgrade your account.");
      return;
    }

    if (!window.Razorpay) {
      toast.error("Razorpay SDK is loading. Please try again in 2 seconds.");
      return;
    }

    setLoading(true);

    try {
      // Step 1: Create Order via server API
      const res = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const orderData = await res.json();

      if (!res.ok || orderData.error) {
        throw new Error(orderData.error || "Failed to create payment order");
      }

      // Step 2: Open Razorpay Checkout Modal
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "PrepWise",
        description: orderData.planName,
        order_id: orderData.orderId,
        prefill: {
          name: user.displayName || "",
          email: user.email || "",
        },
        theme: {
          color: "#2563eb",
        },
        handler: async function (response) {
          // Step 3: Verify payment signature on backend
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                userId: user.uid,
                planId,
                voiceCredits,
              }),
            });

            const verifyData = await verifyRes.json();

            if (verifyRes.ok && verifyData.success) {
              toast.success("Payment successful! Your account has been upgraded.");
              // Reload page to refresh credits
              setTimeout(() => window.location.reload(), 1500);
            } else {
              toast.error(verifyData.error || "Payment verification failed.");
            }
          } catch (err) {
            console.error("Verification error:", err);
            toast.error("Network error during payment verification.");
          }
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();
    } catch (error) {
      console.error("Payment initiation error:", error);
      toast.error(error.message || "Failed to initiate payment.");
    } finally {
      setLoading(false);
    }
  };

  const isPro = userData?.plan === "pro";
  const remainingCredits = userData?.voiceCreditsRemaining ?? 1;

  return (
    <div className="flex flex-col gap-10 max-w-6xl mx-auto px-4 py-8">
      {/* Hero Header */}
      <section className="text-center flex flex-col items-center gap-3">
        <span className="text-xs uppercase font-bold tracking-wider px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          Supercharge Your Prep
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white">
          Simple, Transparent Pricing
        </h1>
        <p className="text-gray-400 max-w-xl text-sm md:text-base">
          Accelerate your interview readiness with real-time AI voice feedback,
          unlimited resume ATS optimization, and code execution.
        </p>
        {user && (
          <div className="mt-2 text-xs text-gray-400 flex items-center gap-2">
            <span>Status: <strong>{isPro ? "Pro Active ⭐" : "Free Plan"}</strong></span>
            <span>•</span>
            <span>Voice Sessions Left: <strong>{remainingCredits}</strong></span>
          </div>
        )}
      </section>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free Plan */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Starter</h3>
            <p className="text-xs text-gray-400 mb-4">For exploring the platform</p>
            <div className="text-3xl font-extrabold text-white mb-6">
              ₹0 <span className="text-xs font-normal text-gray-400">/ forever</span>
            </div>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" /> 1 Free Voice Mock Interview
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" /> 1 Full Resume ATS Analysis
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" /> Public DSA Practice Rooms
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" /> 100 Days of Code Challenges
              </li>
            </ul>
          </div>
          <button
            disabled
            className="w-full mt-8 py-2.5 rounded-xl text-sm font-semibold bg-white/10 text-gray-400 cursor-not-allowed"
          >
            {isPro ? "Included" : "Current Plan"}
          </button>
        </div>

        {/* Pro Plan (Highlighted) */}
        <div className="rounded-2xl border-2 border-blue-500 bg-gradient-to-b from-blue-950/40 to-black/60 p-6 flex flex-col justify-between relative shadow-xl shadow-blue-500/10">
          <div className="absolute -top-3 right-6 bg-blue-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full">
            Most Popular
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Pro Monthly</h3>
            </div>
            <p className="text-xs text-gray-400 mb-4">Complete interview mastery</p>
            <div className="text-3xl font-extrabold text-white mb-6">
              ₹999 <span className="text-xs font-normal text-gray-400">/ month</span>
            </div>
            <ul className="space-y-3 text-sm text-gray-200">
              <li className="flex items-center gap-2 font-medium text-white">
                <Check className="w-4 h-4 text-blue-400" /> 5 Full AI Voice Interviews (15 min)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-400" /> Unlimited Resume Scans &amp; ATS Score
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-400" /> Multi-Language Code Runner (Piston)
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-400" /> Deep Behavioral &amp; Tech Diagnostics
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-blue-400" /> Priority Low-Latency AI Server
              </li>
            </ul>
          </div>
          <button
            onClick={() => handlePayment("pro_monthly", 5)}
            disabled={loading || isPro}
            className="w-full mt-8 py-3 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 disabled:opacity-60"
          >
            <Zap className="w-4 h-4" />
            {isPro ? "Active Plan" : loading ? "Processing..." : "Upgrade to Pro"}
          </button>
        </div>

        {/* Credit Pack */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-1">Voice Credit Pack</h3>
            <p className="text-xs text-gray-400 mb-4">Top-up voice interviews anytime</p>
            <div className="text-3xl font-extrabold text-white mb-6">
              ₹399 <span className="text-xs font-normal text-gray-400">/ one-time</span>
            </div>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-center gap-2 font-medium text-white">
                <Check className="w-4 h-4 text-green-400" /> +3 Voice AI Mock Interviews
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" /> Full audio transcript &amp; metrics
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" /> Credits never expire
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" /> Works with or without Pro
              </li>
            </ul>
          </div>
          <button
            onClick={() => handlePayment("credits_3", 3)}
            disabled={loading}
            className="w-full mt-8 py-2.5 rounded-xl text-sm font-semibold bg-white/10 hover:bg-white/20 text-white transition disabled:opacity-60"
          >
            {loading ? "Processing..." : "Buy 3 Voice Credits"}
          </button>
        </div>
      </div>

      {/* Security Guarantee Banner */}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-green-400" />
          <span>Secured with 256-bit encryption. Supports UPI, Google Pay, PhonePe, and all Indian Debit/Credit cards.</span>
        </div>
        <div className="flex items-center gap-4">
          <a href="/terms" className="hover:underline">Terms</a>
          <a href="/privacy" className="hover:underline">Privacy</a>
          <a href="/refund" className="hover:underline">Refund Policy</a>
        </div>
      </section>
    </div>
  );
}
