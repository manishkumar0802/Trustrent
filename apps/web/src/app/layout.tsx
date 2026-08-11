import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "TrustRent — Your deposit. Locked fairly. Released transparently.",
    template: "%s · TrustRent",
  },
  description:
    "Rental security deposits escrowed on Stellar Soroban. Tenants lock their deposit, landlords get transparent move-out settlement, disputes stay fair.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-dvh bg-background font-sans text-ink-900 antialiased">
        {children}
      </body>
    </html>
  );
}
