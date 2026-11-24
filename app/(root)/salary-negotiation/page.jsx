import SalaryNegotiationChat from "@/components/SalaryNegotiationChat";

export default function SalaryNegotiationPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="soft-indigo-header rounded-3xl px-8 py-8 md:px-10 md:py-10">
        <h1 className="mb-3 text-3xl font-semibold text-slate-900 dark:text-white md:text-4xl">
          Salary Negotiation Practice
        </h1>
        <p className="max-w-2xl text-sm text-slate-700 dark:text-slate-300 md:text-base">
          Role-play a salary negotiation with an AI hiring manager and build
          confidence before your real conversations.
        </p>
      </section>

      <section className="card-border">
        <div className="card p-6">
          <SalaryNegotiationChat />
        </div>
      </section>
    </div>
  );
}
