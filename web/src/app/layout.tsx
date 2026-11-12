import type { Metadata, Viewport } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";

const mono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Narsil Studio — Tech Art & Game Dev",
  description: "Narsil Studio: Tech Art, Graphics Programming & Game Development. New build deploying.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#080808",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${mono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
