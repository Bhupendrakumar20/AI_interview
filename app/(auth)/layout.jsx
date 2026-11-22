// app/(auth)/layout.jsx
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

export default async function AuthLayout({ children }) {
  const user = await getCurrentUser();
  
  const isLoggedIn = user && user.email !== "guest@example.com";
  
  // If user is already logged in, redirect to home
  if (isLoggedIn) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center text-foreground p-4 sm:p-6 md:p-10 relative overflow-hidden">
      {/* Top right theme toggle for convenience on auth screens */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Background noise and decoration blobs */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15 pointer-events-none" style={{ backgroundImage: "var(--bg-pattern)" }}></div>
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>
      
      <div className="w-full max-w-[500px] z-10 transition-all duration-300">
        {children}
      </div>
    </div>
  );
}