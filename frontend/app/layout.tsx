import type { Metadata } from "next";
import "./globals.css";
import AuthProvider from "./providers/AuthProvider";

export const metadata: Metadata = { title: "App" };

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
