import SalaryNegotiationChat from "@/components/SalaryNegotiationChat";

export default function SalaryNegotiationPage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="blue-gradient-dark rounded-3xl px-8 py-8 md:px-10 md:py-10">
        <h1 className="text-3xl md:text-4xl font-semibold mb-3">
          Salary Negotiation Practice
        </h1>
        <p className="text-light-100 max-w-2xl text-sm md:text-base">
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
