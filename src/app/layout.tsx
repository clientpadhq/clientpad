import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClientPad",
  description: "WhatsApp-first CRM foundation for Nigerian service businesses",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
