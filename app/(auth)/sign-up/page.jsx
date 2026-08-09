import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

const Page = () => {
  return (
    <Suspense fallback={<div className="text-foreground p-8 text-center">Loading registration portal...</div>}>
      <AuthForm type="sign-up" />
    </Suspense>
  );
};

export default Page;
