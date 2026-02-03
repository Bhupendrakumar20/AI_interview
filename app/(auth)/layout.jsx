// app/(auth)/layout.jsx
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }) {
  const user = await getCurrentUser();
  
  // If user is already logged in, redirect to home
  if (user) {
    redirect("/");
  }

  return (
    <div className="auth-layout">
      {children}
    </div>
  );
}