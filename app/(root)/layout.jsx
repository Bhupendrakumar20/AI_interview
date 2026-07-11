import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";
import { headers } from "next/headers";

export default async function RootLayout({ children }) {
  const user = await getCurrentUser();
  const headerList = await headers();
  const pathname = headerList.get("x-pathname") || "/";

  const isLoggedIn = user && user.email !== "guest@example.com";

  if (!isLoggedIn) {
    if (pathname === "/") {
      return <>{children}</>;
    } else {
      redirect("/sign-in");
    }
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-h-screen">
        <TopBar user={user} />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-4 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}