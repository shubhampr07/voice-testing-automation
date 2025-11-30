import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Home, MessageSquare } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Voice Agent Testing Platform",
  description: "AI-Powered Automated Testing & Self-Correction for Voice Agents",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-black`}>
        {/* Navigation */}
        <nav className="fixed left-0 top-0 h-full w-20 bg-zinc-900 border-r border-zinc-800 flex flex-col items-center py-8 gap-6 z-50">
          <Link
            href="/"
            className="w-12 h-12 bg-zinc-800 hover:bg-white hover:text-black border border-zinc-700 rounded-xl flex items-center justify-center transition-all group"
            title="Home"
          >
            <Home className="w-6 h-6 text-white group-hover:text-black group-hover:scale-110 transition-all" />
          </Link>
          <Link
            href="/conversations"
            className="w-12 h-12 bg-zinc-800 hover:bg-white hover:text-black border border-zinc-700 rounded-xl flex items-center justify-center transition-all group"
            title="Voice Testing"
          >
            <MessageSquare className="w-6 h-6 text-white group-hover:text-black group-hover:scale-110 transition-all" />
          </Link>
        </nav>

        {/* Main Content */}
        <div className="ml-20">
          {children}
        </div>
      </body>
    </html>
  );
}
