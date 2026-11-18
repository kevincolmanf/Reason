/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import BackNavigationLoader from "@/components/BackNavigationLoader";
import PullToRefreshLoader from "@/components/PullToRefreshLoader";
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
        {/* El router de Next intercepta el "popstate" (atrás del navegador,
            y el swipe-back de celu/tablet que dispara lo mismo) y corta la
            propagación antes de que nuestro propio listener de React lo
            reciba — confirmado probando contra el build real. Este script
            se registra ANTES que el bundle de Next (se ejecuta en el parseo
            del head, antes de cualquier JS diferido), así que siempre llega
            primero y ya hizo su trabajo —reenviar el aviso por un evento
            propio— para cuando Next corta la propagación del original. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `window.addEventListener('popstate', function () { window.dispatchEvent(new Event('reason:popstate')); });`,
          }}
        />
      </head>
      <body className="antialiased font-sans text-text-primary bg-bg-primary">
        {/* Señal visual de que la app está trabajando al navegar entre
            pantallas — antes, en una consulta lenta, no había ninguna
            indicación de que algo estuviera pasando. Barra arriba de todo +
            spinner circular, en el color de acento de la app. */}
        <NextTopLoader color="#C25A2C" height={3} showSpinner={true} shadow={false} />
        <BackNavigationLoader />
        <PullToRefreshLoader />
        {children}
      </body>
    </html>
  );
}
