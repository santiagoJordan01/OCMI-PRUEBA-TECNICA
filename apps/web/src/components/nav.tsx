"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/employees", label: "Employees" },
  { href: "/time-entries", label: "Time Entries" },
  { href: "/weekly-summary", label: "Weekly Summary" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-md px-3.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-white/10 text-white"
                : "text-slate-300 hover:bg-white/5 hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
