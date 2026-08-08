import { Suspense } from "react";
import AuthForm from "@/components/AuthForm";

const Page = () => {
  return (
    <Suspense fallback={<div className="text-foreground p-8 text-center">Loading sign in portal...</div>}>
      <AuthForm type="sign-in" />
    </Suspense>
  );
};

export default Page;
