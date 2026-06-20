import { Link } from "@tanstack/react-router";
import { Home, Search, Library, BarChart3, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/library", label: "Library", icon: Library },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-border/50">
      <ul className="mx-auto grid max-w-md grid-cols-5 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              activeOptions={{ exact: to === "/" }}
              className="group relative flex flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-muted-foreground transition-all duration-200 data-[status=active]:text-primary"
            >
              <div className="relative grid place-items-center">
                <Icon className="relative z-10 h-5 w-5 transition-transform duration-200 group-data-[status=active]:scale-110" />
                <div className="absolute inset-0 scale-150 rounded-full bg-primary/20 opacity-0 blur-md transition-opacity duration-300 group-data-[status=active]:opacity-100" />
              </div>
              <span className="text-[10px] font-medium tracking-wide transition-colors">{label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
