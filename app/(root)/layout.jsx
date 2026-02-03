// app/(root)/layout.jsx
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();
  
  // If user is not logged in, redirect to sign-in
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto px-4 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}