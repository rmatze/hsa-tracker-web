"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type NavItem = {
  label: string;
  href: string;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/" },
  { label: "Add Expense", href: "/expenses/new" },
  { label: "Summary", href: "/summary" },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-mark">H</div>
          <div className="sidebar-logo-text">
            <div className="sidebar-logo-title">HSA Tracker</div>
            <div className="sidebar-logo-subtitle">Reimburse later, easily</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${
                  active ? "sidebar-link--active" : ""
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <span className="sidebar-footer-label">Settings</span>
        </div>
      </aside>

      <div className="app-main">{children}</div>
    </div>
  );
}


