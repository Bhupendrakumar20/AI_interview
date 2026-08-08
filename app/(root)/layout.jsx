import { getCurrentUser } from "@/lib/actions/auth.action";
import { redirect } from "next/navigation";
import ResponsiveLayoutWrapper from "@/components/ResponsiveLayoutWrapper";
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
    <ResponsiveLayoutWrapper user={user}>
      {children}
    </ResponsiveLayoutWrapper>
  );
}