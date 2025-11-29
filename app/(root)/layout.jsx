import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";

import { isAuthenticated } from "@/lib/actions/auth.action";

const Layout = async ({ children }) => {
  const isUserAuthenticated = await isAuthenticated();
  if (!isUserAuthenticated) redirect("/sign-in");

  return (
    <div className="root-layout">
      <nav className="flex items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.svg" alt="PrepWise Logo" width={38} height={32} />
          <h2 className="text-primary-100 font-semibold">PrepWise</h2>
        </Link>

        <div className="flex items-center gap-6 text-sm text-light-100">
          <Link href="/" className="hover:text-primary-200">
            Dashboard
          </Link>
          <Link href="/interview" className="hover:text-primary-200">
            Practice
          </Link>
          <Link href="/analytics" className="hover:text-primary-200">
            Analytics
          </Link>
          <Link href="/upgrade" className="hover:text-primary-200">
            Upgrade
          </Link>
        </div>
      </nav>

      {children}
    </div>
  );
};

export default Layout;
