// app/layout.jsx
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "CareerLens AI - Internships",
  description: "Find your dream internship",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground dark`}>
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}