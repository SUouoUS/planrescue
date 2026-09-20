import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PlanRescue",
  description: "틀어진 하루 계획을 KEEP, REDUCE, POSTPONE, DROP으로 재조정하는 앱",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={`${inter.className} min-h-screen bg-slate-50/50 text-slate-900 antialiased`}>
        {children}
      </body>
    </html>
  );
}
