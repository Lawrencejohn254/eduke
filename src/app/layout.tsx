import type { Metadata } from "next";
import NextTopLoader from "nextjs-toploader";
import PoweredByBadge from "@/components/PoweredByBadge";
import "./globals.css";

export const metadata: Metadata = {
  title: "EduKe",
  description: "School Management System",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <NextTopLoader color="#f9a825" height={3} showSpinner={false} />
        {children}
        <PoweredByBadge />
      </body>
    </html>
  );
}