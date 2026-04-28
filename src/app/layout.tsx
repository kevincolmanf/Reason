/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reason — Criterio clínico aplicado",
  description: "Reason traduce evidencia en decisiones de consultorio. Para kinesiólogos que ya están atendiendo y quieren decidir mejor.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500&family=Geist+Mono:wght@400;500&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="antialiased font-sans text-text-primary bg-bg-primary">
        {children}
      </body>
    </html>
  );
}
