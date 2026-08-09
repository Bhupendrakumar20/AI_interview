import AdminSidebar from "@/components/admin/AdminSidebar";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { serializeFirebaseData } from "@/lib/firebase-helpers";
import { redirect } from "next/navigation";

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();

  if (!user || (user.role !== "admin" && user.role !== "super_admin")) {
    redirect("/admin/login");
  }

  // ✅ Make user 100% safe before passing to Client Component
  const safeUser = serializeFirebaseData(user);

  return (
    <div className="flex">
      <AdminSidebar user={safeUser} />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
