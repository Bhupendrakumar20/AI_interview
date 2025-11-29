import QuestionBank from "@/components/QuestionBank";

const QuestionBankPage = () => {
  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2>Interview Question Bank</h2>
        <p className="text-sm text-light-100 max-w-2xl">
          Browse frequently asked interview questions grouped by job field. You
          can copy any question for practice, or use these as a base when you
          start an AI-powered mock interview.
        </p>
      </section>

      <QuestionBank />
    </div>
  );
};

export default QuestionBankPage;
