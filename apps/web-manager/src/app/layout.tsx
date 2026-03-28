import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hhousing — Gestionnaire",
  description: "Tableau de bord gestionnaire Hhousing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
