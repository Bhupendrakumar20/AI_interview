"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { negotiateSalaryTurn } from "@/lib/actions/general.action";

const SalaryNegotiationChat = () => {
  const [jobTitle, setJobTitle] = useState("");
  const [initialOffer, setInitialOffer] = useState("");
  const [targetSalary, setTargetSalary] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();

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
      {/* Setup */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs text-light-100">Job Title</p>
          <Input
            className="input"
            placeholder="e.g. Senior Software Engineer"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-light-100">Initial Offer</p>
          <Input
            className="input"
            placeholder="e.g. ₹18 LPA or $120k"
            value={initialOffer}
            onChange={(e) => setInitialOffer(e.target.value)}
          />
        </div>

        <div className="space-y-1">
          <p className="text-xs text-light-100">Your Target (optional)</p>
          <Input
            className="input"
            placeholder="e.g. ₹24 LPA or $150k"
            value={targetSalary}
            onChange={(e) => setTargetSalary(e.target.value)}
          />
        </div>
      </div>

      {/* Chat box */}
      <div className="border-gradient p-0.5 rounded-2xl">
        <div className="dark-gradient rounded-2xl min-h-[260px] max-h-[420px] overflow-y-auto p-4 flex flex-col gap-3">
          {messages.length === 0 ? (
            <p className="text-sm text-light-100">
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
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary-200 text-dark-100"
                      : "bg-dark-200 text-light-100"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="flex flex-row items-center gap-3 w-full"
      >
        <Input
          className="input flex-1"
          placeholder="Type your next line in the negotiation..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <Button
          type="submit"
          className="btn-primary"
          disabled={isPending || !input.trim()}
        >
          {isPending ? "Thinking..." : "Send"}
        </Button>
        <Button
          type="button"
          className="btn-secondary"
          onClick={handleReset}
          disabled={isPending}
        >
          Reset
        </Button>
      </form>
    </div>
  );
};

export default SalaryNegotiationChat;
