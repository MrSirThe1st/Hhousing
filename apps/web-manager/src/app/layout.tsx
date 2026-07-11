import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../contexts/auth-context";

export const metadata: Metadata = {
  title: "Haraka Property — Gestionnaire",
  description: "Tableau de bord gestionnaire Haraka Property",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-foreground antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
