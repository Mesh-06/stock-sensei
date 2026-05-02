import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { Menu, X, Sun, Moon, Bell, LogOut, User as UserIcon, Briefcase, Heart, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useAlerts } from "@/hooks/useAlerts";
import { SearchBar } from "./SearchBar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV_LINKS = [
  { to: "/", label: "Home" },
  { to: "/learn", label: "Learn" },
  { to: "/chatbot", label: "Chatbot" },
  { to: "/compare", label: "Compare" },
  { to: "/sectors", label: "Sectors" },
];

export function Navbar() {
  const { user, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const { alerts } = useAlerts();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const triggeredCount = alerts.filter((a: any) => a.triggered).length;

  const initial = (user?.user_metadata?.name?.[0] || user?.email?.[0] || "U").toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 lg:px-6">
        <Link to="/" className="flex items-center gap-2">
          <div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-xl">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-extrabold tracking-tight">
            Stock<span className="gradient-text">Sense</span>
          </span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === "/"}
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}`
              }
            >
              {l.label}
            </NavLink>
          ))}
          {user && (
            <NavLink
              to="/portfolio"
              className={({ isActive }) =>
                `rounded-xl px-3 py-2 text-sm font-medium transition ${isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent/60"}`
              }
            >
              Portfolio
            </NavLink>
          )}
        </nav>

        <div className="ml-auto hidden md:block w-72">
          <SearchBar size="compact" placeholder="Search stocks…" />
        </div>

        <button
          onClick={toggle}
          className="hidden md:flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-accent transition"
          aria-label="Toggle theme"
        >
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {user && (
          <Link to="/profile" className="hidden md:flex relative h-9 w-9 items-center justify-center rounded-xl border border-border bg-card hover:bg-accent transition" aria-label="Notifications">
            <Bell size={16} />
            {triggeredCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
                {triggeredCount}
              </span>
            )}
          </Link>
        )}

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden md:flex h-9 w-9 items-center justify-center rounded-full gradient-primary text-sm font-bold text-white">
                {initial}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={() => navigate("/profile")}><UserIcon size={14} className="mr-2" />Profile</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/portfolio")}><Briefcase size={14} className="mr-2" />Portfolio</DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/watchlist")}><Heart size={14} className="mr-2" />Watchlist</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { signOut(); navigate("/"); }}><LogOut size={14} className="mr-2" />Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link
            to="/login"
            className="hidden md:flex gradient-primary text-white rounded-xl px-4 py-2 text-sm font-medium shadow-md hover:opacity-90 transition"
          >
            Sign in
          </Link>
        )}

        <button onClick={() => setMobileOpen(!mobileOpen)} className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl border border-border" aria-label="Menu">
          {mobileOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
      </div>

      {mobileOpen && (
        <div className="lg:hidden border-t border-border bg-background animate-slide-up">
          <div className="px-4 py-4 space-y-3">
            <SearchBar size="compact" placeholder="Search stocks…" />
            <nav className="flex flex-col gap-1">
              {NAV_LINKS.map((l) => (
                <NavLink
                  key={l.to}
                  to={l.to}
                  end={l.to === "/"}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-accent" : "hover:bg-accent/60"}`
                  }
                >
                  {l.label}
                </NavLink>
              ))}
              {user && (
                <>
                  <NavLink to="/portfolio" onClick={() => setMobileOpen(false)} className={({ isActive }) => `rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-accent" : "hover:bg-accent/60"}`}>Portfolio</NavLink>
                  <NavLink to="/watchlist" onClick={() => setMobileOpen(false)} className={({ isActive }) => `rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-accent" : "hover:bg-accent/60"}`}>Watchlist</NavLink>
                  <NavLink to="/profile" onClick={() => setMobileOpen(false)} className={({ isActive }) => `rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? "bg-accent" : "hover:bg-accent/60"}`}>Profile</NavLink>
                </>
              )}
            </nav>
            <div className="flex items-center gap-2 pt-2 border-t border-border">
              <button onClick={toggle} className="flex-1 rounded-xl border border-border px-3 py-2 text-sm flex items-center justify-center gap-2">
                {theme === "dark" ? <><Sun size={14} /> Light</> : <><Moon size={14} /> Dark</>}
              </button>
              {user ? (
                <button onClick={() => { signOut(); navigate("/"); setMobileOpen(false); }} className="flex-1 rounded-xl border border-border px-3 py-2 text-sm flex items-center justify-center gap-2">
                  <LogOut size={14} /> Sign out
                </button>
              ) : (
                <Link to="/login" onClick={() => setMobileOpen(false)} className="flex-1 gradient-primary text-white rounded-xl px-3 py-2 text-sm font-medium text-center">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
