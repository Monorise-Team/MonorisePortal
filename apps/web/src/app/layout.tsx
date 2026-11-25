import { appearanceInitScript } from "@monorise-team/ui";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "MonorisePortal: panel klienta Monorise",
  description: "Panel klienta Monorise: zarządzanie firmą, pracownikami, strukturą, rolami i dostępem do aplikacji.",
};

export const viewport: Viewport = { colorScheme: "dark light" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pl" className="dark" data-theme="mono" suppressHydrationWarning>
      <head>
        {/* Zapisany tryb, motyw i tło przed pierwszym malowaniem, bez mignięcia (jak w TimoTime) */}
        <script dangerouslySetInnerHTML={{ __html: appearanceInitScript }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
