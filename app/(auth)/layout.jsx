// app/(auth)/layout.jsx
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";

export default async function AuthLayout({ children }) {
  const user = await getCurrentUser();
  
  const isLoggedIn = user && user.email !== "guest@example.com";
  
  // If user is already logged in, redirect to home
  if (isLoggedIn) {
    redirect("/");
  }

  return (
    <div className="auth-layout">
      {children}
    </div>
  );
}