// app/(root)/layout.jsx
import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();
  
  // If user is not logged in, redirect to sign-in
  if (!user) {
    redirect("/sign-in");
  }

  return (
    <div className="flex flex-col min-h-screen">
      <TopBar user={user} />
      <div className="flex flex-1">
        <Sidebar user={user} />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}