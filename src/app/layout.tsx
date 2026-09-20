import type { Metadata } from "next";
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
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
