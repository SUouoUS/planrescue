import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "PlanRescue — 오늘의 계획 복구",
  description: "틀어진 하루 계획을 KEEP, REDUCE, POSTPONE, DROP으로 재조정하는 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="min-h-screen antialiased flex flex-col">
        <header className="border-b border-border bg-background sticky top-0 z-10">
          <div className="max-w-[1180px] mx-auto px-4 md:px-6 lg:px-8 xl:px-10 h-14 flex items-center justify-between">
            <div className="flex items-center gap-6 md:gap-8">
              <Link href="/" className="text-base font-bold tracking-tight text-foreground hover:opacity-80 transition-opacity">
                PlanRescue
              </Link>
              <nav className="flex items-center gap-4 md:gap-6 text-sm font-medium">
                <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  오늘
                </Link>
                <Link href="/tasks" className="text-muted-foreground hover:text-foreground transition-colors">
                  할 일 관리
                </Link>
                <Link href="/help" className="text-muted-foreground hover:text-foreground transition-colors">
                  도움말
                </Link>
              </nav>
            </div>
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
