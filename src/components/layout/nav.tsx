"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/clients", label: "Clients" },
  { href: "/deals", label: "Deals" },
  { href: "/quotes", label: "Quotes" },
  { href: "/invoices", label: "Invoices" },
  { href: "/jobs", label: "Jobs" },
  { href: "/tasks", label: "Tasks" },
  { href: "/reports", label: "Reports" },
  { href: "/review", label: "Review" },
  { href: "/pilots", label: "Pilots" },
  { href: "/insights", label: "Insights" },
  { href: "/ai/history", label: "AI History" },
  { href: "/settings", label: "Settings" },
];

function linkClass(active: boolean) {
  return `rounded-md px-3 py-2 text-sm font-medium ${
    active ? "bg-emerald-100 text-emerald-900" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden w-56 shrink-0 border-r border-slate-200 bg-white p-4 md:block">
      <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-slate-500">ClientPad</p>
      <ul className="space-y-1">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link className={linkClass(pathname.startsWith(item.href))} href={item.href}>
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function BottomNav() {
  const pathname = usePathname();

  const mobileItems = [
    { href: "/dashboard", label: "Home" },
    { href: "/leads", label: "Leads" },
    { href: "/deals", label: "Deals" },
    { href: "/jobs", label: "Jobs" },
    { href: "/tasks", label: "Tasks" },
    { href: "/reports", label: "Reports" },
    { href: "/review", label: "Review" },
    { href: "/pilots", label: "Pilots" },
    { href: "/invoices", label: "Invoices" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white p-2 md:hidden">
      <ul className="grid grid-cols-9 gap-1">
        {mobileItems.map((item) => (
          <li key={item.href}>
            <Link
              className={`block text-center text-xs ${pathname.startsWith(item.href) ? "text-emerald-700" : "text-slate-500"}`}
              href={item.href}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
