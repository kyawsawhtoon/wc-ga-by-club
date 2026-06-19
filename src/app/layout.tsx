import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "World Cup 2026 | Goals & Assists by Club",
  description: "Track World Cup 2026 goals and assists — grouped by football club",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="relative overflow-hidden px-4 py-5 shadow-xl" style={{ background: "linear-gradient(135deg, #003DA5 0%, #1a1a6e 40%, #C41E3A 100%)" }}>
          {/* decorative blobs */}
          <div className="pointer-events-none absolute -top-6 -left-6 h-32 w-32 rounded-full bg-white/5 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-4 right-10 h-24 w-24 rounded-full bg-white/5 blur-xl" />

          <div className="relative mx-auto max-w-7xl flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-xl">
                🏆
              </div>
              <div>
                <div className="text-xl font-black tracking-tight text-white leading-tight">
                  World Cup 2026
                </div>
                <div className="text-xs font-medium text-white/60 leading-tight">Goals &amp; Assists by Club</div>
              </div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden sm:inline rounded-full bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold text-white/90">
                🇺🇸 🇨🇦 🇲🇽 &nbsp;USA · Canada · Mexico
              </span>
              <span className="rounded-full bg-[#D4A017]/80 border border-[#D4A017] px-3 py-1 text-xs font-bold text-white">
                LIVE
              </span>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>

        <footer className="border-t border-gray-200/60 py-5 text-center text-xs text-gray-400">
          Data from{" "}
          <a href="https://www.football-data.org" className="underline hover:text-gray-600" target="_blank" rel="noreferrer">
            football-data.org
          </a>
          {" · "}Stats refresh every 30 min
        </footer>
      </body>
    </html>
  );
}
