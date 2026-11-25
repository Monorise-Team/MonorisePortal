import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MonorisePortal: panel klienta Monorise",
  description: "Panel klienta Monorise: zarządzanie firmą, pracownikami, strukturą, rolami i dostępem do aplikacji.",
};

export const viewport: Viewport = { themeColor: "#071826", colorScheme: "dark" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className="dark" data-theme="moonlight">
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
