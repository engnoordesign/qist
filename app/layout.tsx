import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Qist | قسط — Debt Manager",
  description: "Simple bilingual debt and installment tracking.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head><script dangerouslySetInnerHTML={{__html: `(function(){try{var t=localStorage.getItem('qist-theme');var d=t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`}} /></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
