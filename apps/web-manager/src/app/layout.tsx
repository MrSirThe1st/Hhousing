import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../contexts/auth-context";
import { BookDemoProvider } from "../contexts/book-demo-context";
import { ThemeProvider } from "../contexts/theme-context";
import TawkToWidget from "../components/tawk-to-widget";

export const metadata: Metadata = {
  title: "Haraka Property — Gestionnaire",
  description: "Tableau de bord gestionnaire Haraka Property",
};

const THEME_INIT_SCRIPT = `(function () {
  try {
    var path = window.location.pathname || "/";
    // Public landing page is always light — never flash dark from stored preference.
    if (path === "/") {
      document.documentElement.classList.remove("dark");
      return;
    }
    var stored = localStorage.getItem("hhousing.theme");
    var theme = stored === "dark" || stored === "light"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="bg-gray-50 text-foreground antialiased dark:bg-[#0a1120] dark:text-slate-100" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <BookDemoProvider>{children}</BookDemoProvider>
          </AuthProvider>
        </ThemeProvider>
        <TawkToWidget />
      </body>
    </html>
  );
}
