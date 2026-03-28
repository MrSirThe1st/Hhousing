import type { ReactElement, ReactNode } from "react";
import { AuthStatus } from "./components/auth-status";
import "./globals.css";

export default function RootLayout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="topbar">
            <div className="brand">Hhousing</div>
            <nav className="nav">
              <a href="/">Feed</a>
              <a href="/listings/new">Create Listing</a>
              <a href="/review">Review Queue</a>
              <a href="/login">Login</a>
              <a href="/signup">Sign Up</a>
            </nav>
            <AuthStatus />
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
