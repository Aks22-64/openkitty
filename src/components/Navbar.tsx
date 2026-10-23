"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Compass, 
  TrendingUp, 
  Sparkles, 
  Eye, 
  CreditCard, 
  BarChart2,
  PieChart,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  if (pathname === "/login") return null;

  const navItems = [
    { name: "Explore", href: "/", icon: Compass },
    { name: "Catalog", href: "/charts", icon: PieChart },
    { name: "Trending", href: "/trending", icon: TrendingUp },
    { name: "Releases", href: "/rising", icon: Sparkles },
    { name: "Ad Libraries", href: "/ads", icon: Eye },
    { name: "Screenshots", href: "/onboarding", icon: CreditCard },
    { name: "Keywords", href: "/aso", icon: BarChart2 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-800/80 bg-black/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 border border-zinc-700 group-hover:border-white transition-colors duration-200">
              <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-bold text-lg tracking-tight text-white group-hover:opacity-90 transition">
                openkitty
              </span>
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
                intel
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    isActive
                      ? "bg-zinc-800 text-white border border-zinc-700 shadow-sm"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-900"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Status */}
        <div className="flex items-center gap-3">
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="rounded-lg px-2 py-1 text-xs text-zinc-400 hover:text-white focus-visible:outline focus-visible:outline-white">Sign out</button>
          </form>
          <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1 text-xs text-zinc-400">
            <span className="flex h-1.5 w-1.5 rounded-full bg-white" />
            <span className="hidden sm:inline">Free store data</span>
            <span className="text-zinc-700 hidden sm:inline">|</span>
            <span className="text-zinc-200 font-mono text-[11px]">US · iOS</span>
          </div>
        </div>
      </div>

      {/* Mobile Horizontal Nav Strip */}
      <div className="flex lg:hidden overflow-x-auto border-t border-zinc-800/60 px-3 py-2 gap-1.5 scrollbar-none bg-black/95">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex shrink-0 items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition ${
                isActive
                  ? "bg-zinc-800 text-white border border-zinc-700 font-semibold"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.name}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
