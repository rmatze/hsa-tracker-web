import "./globals.css";
import type { ReactNode } from "react";
import Providers from "../components/Providers";
import AppShell from "../components/AppShell";

export const metadata = {
  title: "HSA Tracker",
  description: "Track out-of-pocket medical expenses for HSA reimbursement",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}



