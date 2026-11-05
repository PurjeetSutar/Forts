import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Share2, Link2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

export function FavButton({ slug, dark }) {
  const { user, setUser } = useAuth();
  const fav = !!user && (user.favorites || []).includes(slug);
  const [busy, setBusy] = useState(false);
  const toggle = async () => {
    if (!user) return toast("Sign in to save forts to your bucket list", { action: { label: "Sign in", onClick: () => (window.location.href = "/login") } });
    setBusy(true);
    const { data } = await api.post(`/me/favorites/${slug}`);
    setUser({ ...user, favorites: data.favorited ? [...(user.favorites || []), slug] : user.favorites.filter((s) => s !== slug) });
    toast.success(data.favorited ? "Added to your bucket list" : "Removed from your bucket list");
    setBusy(false);
  };
  return (
    <button onClick={toggle} disabled={busy} data-testid="fort-favorite-btn" aria-pressed={fav}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-[0.2em] font-semibold border transition-colors ${dark ? "border-white/40 text-white hover:bg-white hover:text-[#252525]" : "border-[#252525] hover:bg-[#252525] hover:text-white"}`}>
      <Heart className={`w-4 h-4 ${fav ? "fill-[#E87524] text-[#E87524]" : ""}`} /> {fav ? "In bucket list" : "Add to bucket list"}
    </button>
  );
}

export function ShareButtons({ title, dark }) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  const enc = encodeURIComponent;
  const links = [
    { k: "whatsapp", label: "WhatsApp", href: `https://wa.me/?text=${enc(title + " " + url)}` },
    { k: "x", label: "X", href: `https://twitter.com/intent/tweet?text=${enc(title)}&url=${enc(url)}` },
    { k: "facebook", label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
  ];
  const cls = dark ? "text-white/80 hover:text-white" : "text-stone-600 hover:text-[#E87524]";
  return (
    <div className="flex items-center gap-4 text-xs uppercase tracking-[0.18em]" data-testid="share-buttons">
      <Share2 className={`w-4 h-4 ${dark ? "text-white/60" : "text-stone-400"}`} />
      {links.map((l) => <a key={l.k} href={l.href} target="_blank" rel="noopener noreferrer" data-testid={`share-${l.k}`} className={`${cls} transition-colors`}>{l.label}</a>)}
      <button data-testid="share-copy" className={`${cls} inline-flex items-center gap-1`} onClick={() => { navigator.clipboard?.writeText(url); toast.success("Link copied"); }}><Link2 className="w-3.5 h-3.5" />Copy</button>
    </div>
  );
}

export const SignInPrompt = ({ text = "Sign in to join the discussion" }) => (
  <div className="border border-dashed border-stone-300 p-6 text-sm text-stone-600 flex items-center justify-between gap-4" data-testid="signin-prompt">
    <span>{text}. Browsing is open to everyone.</span>
    <Link to="/login" className="px-4 py-2 bg-[#E87524] text-white text-xs uppercase tracking-[0.2em] hover:bg-[#cf661d]" data-testid="signin-prompt-btn">Sign in</Link>
  </div>
);
