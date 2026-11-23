// app/layout.jsx
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ToastProvider";
import { ThemeProvider } from "@/lib/theme-context";
import { Analytics } from "@vercel/analytics/next";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "PrepWise - Your Ultimate Guide to Acing Coding Interviews",
  description: "PrepWise is your ultimate companion for mastering coding interviews. With a comprehensive collection of 1000+ questions, detailed solutions, and AI-powered practice sessions, PrepWise helps you build confidence and excel in your job interviews. Whether you're a beginner or an experienced coder, PrepWise provides the tools and resources you need to succeed in your career journey.",
  icons: {
    icon: "/logo_icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground`}>
        <ThemeProvider>
          {children}
          <ToastProvider />
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}