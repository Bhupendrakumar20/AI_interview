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
    <div className="flex min-h-screen w-full items-center justify-center bg-[#09090B] p-4 sm:p-6 md:p-10 relative overflow-hidden">
      {/* Background noise and decoration blobs */}
      <div className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-25 pointer-events-none" style={{ backgroundImage: "var(--bg-pattern)" }}></div>
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-violet-600/10 blur-[120px] pointer-events-none"></div>
      
      <div className="w-full max-w-[500px] z-10 transition-all duration-300">
        {children}
      </div>
    </div>
  );
}