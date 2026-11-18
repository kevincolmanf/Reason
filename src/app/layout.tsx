/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://reason.com.ar"),
  title: "Reason — Criterio clínico aplicado",
  description: "Reason traduce evidencia en decisiones de consultorio. Para kinesiólogos que ya están atendiendo y quieren decidir mejor.",
  openGraph: {
    title: "Reason — Criterio clínico aplicado",
    description: "Reason traduce evidencia en decisiones de consultorio. Para kinesiólogos que ya están atendiendo y quieren decidir mejor.",
    url: "https://reason.com.ar",
    siteName: "Reason",
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reason — Criterio clínico aplicado",
    description: "Reason traduce evidencia en decisiones de consultorio. Para kinesiólogos que ya están atendiendo y quieren decidir mejor.",
  },
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
        {/* Señal visual de que la app está trabajando al navegar entre
            pantallas — antes, en una consulta lenta, no había ninguna
            indicación de que algo estuviera pasando. Barra arriba de todo +
            spinner circular, en el color de acento de la app. */}
        <NextTopLoader color="#C25A2C" height={3} showSpinner={true} shadow={false} />
        {children}
      </body>
    </html>
  );
}
