import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Presidential Battle // 9router Edition",
  description: "11 Autonomous AI politicians battle for the presidency of the AI Republic, powered exclusively by 9router.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-[#07090e] text-slate-100 selection:bg-cyan-500 selection:text-slate-950">
        {children}
      </body>
    </html>
  );
}
