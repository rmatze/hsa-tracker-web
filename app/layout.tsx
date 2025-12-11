import "./globals.css";
import type { ReactNode } from "react";
import Providers from "../components/Providers";

export const metadata = {
  title: "HSA Tracker",
  description: "Track out-of-pocket medical expenses for HSA reimbursement",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}



