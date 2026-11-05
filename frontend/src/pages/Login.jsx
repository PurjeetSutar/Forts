import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { api, formatErr } from "@/lib/api";
import { ART } from "@/lib/constants";
import { useAuth, googleLogin } from "@/context/AuthContext";
import { SEO } from "@/components/common";
import { Input } from "@/components/ui/input";

export default function Login() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (user) nav("/profile", { replace: true }); }, [user, nav]);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setErr(""); setBusy(true);
    try {
      if (mode === "forgot") { await api.post("/auth/forgot-password", { email: form.email }); toast.success("If the email exists, a reset link has been issued."); setMode("login"); }
      else {
        const { data } = await api.post(mode === "login" ? "/auth/login" : "/auth/register", mode === "login" ? { email: form.email, password: form.password } : form);
        setUser(data); toast.success(`Welcome, ${data.name}`); window.history.length > 2 ? nav(-1) : nav("/profile");
      }
    } catch (e2) { setErr(formatErr(e2)); }
    setBusy(false);
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2" data-testid="login-page">
      <SEO title="Sign in" />
      <div className="hidden lg:block relative bg-[#F7F5F2] overflow-hidden">
        <img src={ART.hill} alt="Ink illustration of a hill fort" className="absolute inset-0 w-full h-full object-cover art-wash" />
        <p className="absolute bottom-6 left-6 text-[10px] uppercase tracking-widest text-stone-500 bg-white/80 px-2 py-1">Illustration · AI-generated artwork</p>
      </div>
      <div className="flex items-center px-6 md:px-16 pt-28 pb-16">
        <div className="w-full max-w-md">
          <p className="eyebrow text-[#E87524] mb-4">{mode === "register" ? "Join the community" : mode === "forgot" ? "Reset password" : "Welcome back"}</p>
          <h1 className="font-display text-4xl sm:text-5xl">{mode === "register" ? "Create an account" : mode === "forgot" ? "Forgot password" : "Sign in"}</h1>
          <p className="text-stone-600 mt-3 text-sm">Sign in to comment, save forts to your bucket list, plan trips and contribute. Browsing is always open.</p>
          <button onClick={googleLogin} data-testid="google-login-btn" className="mt-8 w-full flex items-center justify-center gap-3 border border-[#252525] py-3.5 text-sm font-medium hover:bg-[#252525] hover:text-white transition-colors">
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
            Continue with Google
          </button>
          <div className="flex items-center gap-4 my-8 text-xs text-stone-400"><span className="flex-1 h-px bg-stone-200" />or with email<span className="flex-1 h-px bg-stone-200" /></div>
          <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
            {mode === "register" && <Input required placeholder="Display name" value={form.name} onChange={set("name")} className="rounded-none h-12" data-testid="auth-name" />}
            <Input required type="email" placeholder="Email" value={form.email} onChange={set("email")} className="rounded-none h-12" data-testid="auth-email" />
            {mode !== "forgot" && <Input required type="password" minLength={6} placeholder="Password" value={form.password} onChange={set("password")} className="rounded-none h-12" data-testid="auth-password" />}
            {err && <p className="text-sm text-red-600" data-testid="auth-error">{err}</p>}
            <button disabled={busy} className="w-full py-3.5 bg-[#E87524] text-white text-xs uppercase tracking-[0.2em] hover:bg-[#cf661d] disabled:opacity-50" data-testid="auth-submit">{busy ? "…" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}</button>
          </form>
          <div className="flex justify-between mt-6 text-sm">
            <button onClick={() => { setMode(mode === "register" ? "login" : "register"); setErr(""); }} className="text-[#E87524] link-reveal" data-testid="auth-toggle-mode">{mode === "register" ? "I already have an account" : "Create an account"}</button>
            {mode === "login" && <button onClick={() => setMode("forgot")} className="text-stone-500 hover:text-[#252525]" data-testid="auth-forgot">Forgot password?</button>}
          </div>
        </div>
      </div>
    </div>
  );
}
