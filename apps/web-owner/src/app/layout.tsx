import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hhousing — Owner",
  description: "Portail owner Hhousing"
};

export default function RootLayout({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <html lang="fr">
      <body className="bg-gray-50 text-[#010a19] antialiased">{children}</body>
    </html>
  );
}
