import { useEffect, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, Shield, Globe } from "lucide-react";
import { NAV } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { useI18n, LANGS } from "@/context/I18nContext";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

function UserMenu() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  if (!user) {
    return (
      <Link to="/login" data-testid="nav-login-btn" className="whitespace-nowrap text-[11px] sm:text-xs uppercase tracking-[0.15em] sm:tracking-[0.2em] font-semibold px-3 sm:px-4 py-2 bg-[#E87524] text-white hover:bg-[#cf661d] transition-colors">
        Sign in
      </Link>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger data-testid="nav-user-menu" className="flex items-center gap-2 text-sm font-medium">
        {user.picture ? <img src={user.picture} alt="" className="w-8 h-8 rounded-full object-cover" /> : <span className="w-8 h-8 rounded-full bg-[#252525] text-white grid place-items-center text-xs">{user.name?.[0]}</span>}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none w-48">
        <div className="px-2 py-1.5 text-sm font-semibold truncate">{user.name}</div>
        <DropdownMenuSeparator />
        <DropdownMenuItem data-testid="nav-profile-link" onClick={() => nav("/profile")}><User className="w-4 h-4 mr-2" />My bucket list</DropdownMenuItem>
        {user.role === "admin" && <DropdownMenuItem data-testid="nav-admin-link" onClick={() => nav("/admin")}><Shield className="w-4 h-4 mr-2" />Admin dashboard</DropdownMenuItem>}
        <DropdownMenuItem data-testid="nav-logout-btn" onClick={async () => { await logout(); nav("/"); }}><LogOut className="w-4 h-4 mr-2" />Sign out</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function LangMenu() {
  const { lang, setLang } = useI18n();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger data-testid="nav-lang-menu" aria-label="Language" className="flex items-center gap-1 text-xs uppercase tracking-widest"><Globe className="w-4 h-4" strokeWidth={1.5} />{lang}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="rounded-none">
        {LANGS.map((l) => (
          <DropdownMenuItem key={l.code} disabled={!l.ready} onClick={() => setLang(l.code)} data-testid={`lang-${l.code}`}>
            {l.label}{!l.ready && <span className="ml-2 text-[10px] uppercase tracking-wider text-stone-400">coming soon</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const overHero = (pathname === "/" || /^\/forts\/[^/]+$/.test(pathname) || /^\/stories\/[^/]+$/.test(pathname)) && !scrolled;

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener("scroll", on);
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  if (pathname.startsWith("/admin")) return null;

  const tone = overHero ? "text-white" : "text-[#252525]";
  return (
    <header data-testid="site-header" className={`fixed top-0 inset-x-0 z-[45] transition-[background-color,box-shadow] duration-500 ${overHero ? "bg-gradient-to-b from-black/50 to-transparent" : "bg-white/85 backdrop-blur-xl border-b border-black/5"}`}>
      <div className={`flex items-center justify-between px-6 md:px-12 lg:px-16 h-16 ${tone}`}>
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-3">
          <svg width="26" height="26" viewBox="0 0 32 32" aria-hidden><path d="M3 28V14l4-3 3 3V9l3-3 3 3 3-3 3 3v5l3-3 4 3v14z" fill="none" stroke="#E87524" strokeWidth="2" /><path d="M13 28v-6a3 3 0 0 1 6 0v6" fill="none" stroke="#E87524" strokeWidth="2" /></svg>
          <span className="font-display text-[15px] sm:text-lg tracking-wide leading-none whitespace-nowrap">Forts <em className="text-[#E87524] not-italic">of</em> Maharashtra</span>
        </Link>
        <nav className="hidden lg:flex items-center gap-7">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} data-testid={`nav-${n.label.toLowerCase().replace(/\s/g, "-")}`}
              className={({ isActive }) => `text-[13px] font-medium link-reveal pb-0.5 ${isActive ? "text-[#E87524]" : ""}`}>{n.label}</NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="hidden md:block"><LangMenu /></div>
          <Link to="/contribute" data-testid="nav-contribute" className="hidden md:inline text-[13px] font-medium link-reveal">Contribute</Link>
          <UserMenu />
          <button className="lg:hidden" onClick={() => setOpen(!open)} aria-label="Menu" data-testid="nav-mobile-toggle">{open ? <X /> : <Menu />}</button>
        </div>
      </div>
      {open && (
        <div className="lg:hidden bg-white text-[#252525] border-t px-6 py-6 space-y-4" data-testid="nav-mobile-menu">
          {[...NAV, { to: "/contribute", label: "Contribute" }].map((n) => (
            <Link key={n.to} to={n.to} className="block font-display text-2xl">{n.label}</Link>
          ))}
        </div>
      )}
    </header>
  );
}
