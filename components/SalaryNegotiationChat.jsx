"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Send, RotateCcw } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { negotiateSalaryTurn } from "@/lib/actions/general.action";
import { TypingDots, EqualizerBars } from "@/components/ui/LoadingAnimations";
import { ParticleBurst } from "@/components/ui/MicroInteractions";

const SalaryNegotiationChat = () => {
  const [jobTitle, setJobTitle] = useState("");
  const [initialOffer, setInitialOffer] = useState("");
  const [targetSalary, setTargetSalary] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isSending, setIsSending] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    if (!jobTitle || !initialOffer) {
      toast.error("Please fill job title and initial offer first.");
      return;
    }

    const userMessage = {
      role: "user",
      content: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsSending(true);
    setTimeout(() => setIsSending(false), 700);

    startTransition(async () => {
      const res = await negotiateSalaryTurn({
        jobTitle,
        initialOffer,
        targetSalary,
        messages: newMessages,
      });

      if (!res?.success || !res.reply) {
        toast.error(res?.error || "Something went wrong. Try again.");
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply },
      ]);
    });
  };

  const handleReset = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Setup Inputs */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1.5">
          <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold tracking-wide">Job Title</p>
          <Input
            className="input bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 text-sm transition-all duration-200"
            placeholder="e.g. Senior Software Engineer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold tracking-wide">Initial Offer</p>
          <Input
            className="input bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 text-sm transition-all duration-200"
            placeholder="e.g. ₹18 LPA or $120k"
            value={initialOffer}
            onChange={(e) => setInitialOffer(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs text-slate-800 dark:text-slate-200 font-semibold tracking-wide">Your Target (optional)</p>
          <Input
            className="input bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 text-sm transition-all duration-200"
            placeholder="e.g. ₹24 LPA or $150k"
            value={targetSalary}
            onChange={(e) => setTargetSalary(e.target.value)}
          />
        </div>
      </div>

      {/* Chat box */}
      <div className="border-gradient p-0.5 rounded-2xl shadow-lg">
        <div className="dark-gradient rounded-2xl min-h-[260px] max-h-[420px] overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Start by filling the details above and sending your first message,
              for example: &quot;Thanks for the offer, but I was expecting
              closer to...&quot;
            </p>
          ) : (
            messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm transition-all ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground font-medium rounded-tr-xs"
                      : "bg-secondary text-foreground rounded-tl-xs border border-border/60"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}

          {/* AI typing response indicator */}
          {isPending && (
            <div className="flex justify-start">
              <div className="bg-secondary/70 border border-border/60 rounded-2xl rounded-tl-xs px-4 py-3 flex items-center gap-3">
                <TypingDots color="#6366f1" />
                <span className="text-xs text-muted-foreground font-medium">
                  AI recruiter formulating counter-offer...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSend}
        className="flex flex-row items-center gap-3 w-full"
      >
        <Input
          className="input flex-1 bg-card/60 backdrop-blur-md border border-border/70 focus:border-primary/80 focus:ring-2 focus:ring-primary/25 text-sm py-2.5 transition-all duration-200"
          placeholder="Type your next line in the negotiation..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button
          type="submit"
          variant="liquid-glass"
          className="relative overflow-visible font-bold px-5"
          disabled={isPending || !input.trim()}
        >
          <ParticleBurst active={isSending} count={6} color="#6366f1" />
          <Send className={`w-4 h-4 mr-1.5 ${isSending ? "animate-plane-takeoff" : ""}`} />
          <span>{isPending ? "Analyzing..." : "Send"}</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          className="hover:bg-secondary transition-all"
          onClick={handleReset}
          disabled={isPending}
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1 text-muted-foreground" />
          Reset
        </Button>
      </form>
    </div>
  );
};

export default SalaryNegotiationChat;
