import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import Image from "next/image";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "vietnamese"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Club Insights",
  description: "How your club is doing: active players, sessions held and no-shows.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full min-w-[360px] flex-col bg-background text-foreground">
        <TopNav />
        <div className="flex-1">{children}</div>
        <Footer />
      </body>
    </html>
  );
}

// Mirrors reclub.co's nav: white bar with a soft shadow, bold links, yellow underline on the active one.
function TopNav() {
  return (
    <nav className="sticky top-0 z-40 bg-white/95 px-4 py-3 shadow-card backdrop-blur sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <a href="https://reclub.co" className="flex items-center">
          <Image src="/brand/reclub-full-blue.svg" alt="Reclub" width={106} height={28} priority className="h-7 w-auto" />
        </a>
        <span className="border-b-4 border-reclub-yellow pb-1 text-sm font-bold text-gray-800">Club Insights</span>
      </div>
    </nav>
  );
}

// Mirrors reclub.co's slate-900 footer.
function Footer() {
  return (
    <footer className="mt-12 bg-slate-900 px-4 py-8 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex items-center gap-3">
          <Image src="/brand/reclub-symbol-yellow.svg" alt="Reclub" width={56} height={64} className="h-14 w-auto" />
          <div>
            <p className="text-2xl font-bold">Club Insights</p>
            <p className="text-sm font-semibold text-gray-400">For the love of the game</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
