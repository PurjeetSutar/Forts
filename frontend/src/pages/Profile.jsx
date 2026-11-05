import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { FortCard, Loader, SEO } from "@/components/common";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Profile() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [favs, setFavs] = useState([]);
  const [its, setIts] = useState([]);
  const [subs, setSubs] = useState([]);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (user === false) nav("/login", { replace: true });
    if (!user) return;
    setName(user.name); setBio(user.bio || "");
    api.get("/me/favorites").then((r) => setFavs(r.data));
    api.get("/me/itineraries").then((r) => setIts(r.data));
    api.get("/me/submissions").then((r) => setSubs(r.data));
  }, [user, nav]);
  if (!user) return <div className="pt-24"><Loader /></div>;

  const saveProfile = async () => {
    try { const { data } = await api.put("/me/profile", { name, bio }); setUser(data); toast.success("Profile updated"); } catch (e) { toast.error(formatErr(e)); }
  };
  const delIt = async (id) => { await api.delete(`/me/itineraries/${id}`); setIts((x) => x.filter((i) => i.itinerary_id !== id)); };

  return (
    <div className="pt-28 px-6 md:px-12 lg:px-24 pb-24" data-testid="profile-page">
      <SEO title="My profile" />
      <div className="grid lg:grid-cols-12 gap-12">
        <aside className="lg:col-span-4 border border-stone-200 p-8 self-start space-y-4">
          {user.picture ? <img src={user.picture} alt="" className="w-16 h-16 rounded-full" /> : <span className="w-16 h-16 rounded-full bg-[#252525] text-white grid place-items-center font-display text-2xl">{user.name?.[0]}</span>}
          <p className="text-xs text-stone-500">{user.email} · {user.role}</p>
          <div><label className="eyebrow text-stone-400">Display name</label><Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-none mt-1" data-testid="profile-name" /></div>
          <div><label className="eyebrow text-stone-400">About you</label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} className="rounded-none mt-1" placeholder="Trekker since… favourite fort…" data-testid="profile-bio" /></div>
          <button onClick={saveProfile} className="px-5 py-2.5 bg-[#252525] text-white text-xs uppercase tracking-[0.2em]" data-testid="profile-save">Save profile</button>
          <Link to={`/users/${user.user_id}`} className="block text-xs text-[#E87524] underline">View public profile</Link>
        </aside>
        <div className="lg:col-span-8 space-y-16">
          <section data-testid="profile-bucket-list">
            <p className="eyebrow text-[#E87524] mb-3">Bucket list</p>
            <h1 className="font-display text-4xl mb-8">Forts I want to explore</h1>
            {favs.length === 0 ? <p className="text-stone-500 text-sm">No saved forts yet. Tap “Add to bucket list” on any fort page.</p> : <div className="grid sm:grid-cols-2 gap-6">{favs.map((f, i) => <FortCard key={f.slug} f={f} i={i} />)}</div>}
          </section>
          <section data-testid="profile-itineraries">
            <p className="eyebrow text-[#E87524] mb-3">Saved itineraries</p>
            {its.length === 0 ? <p className="text-stone-500 text-sm">No itineraries yet. <Link to="/planner" className="text-[#E87524] underline">Plan a trip</Link>.</p> : its.map((it) => (
              <div key={it.itinerary_id} className="flex justify-between items-center py-4 border-b border-stone-200" data-testid={`itinerary-${it.itinerary_id}`}>
                <div><p className="font-display text-xl">{it.title}</p><p className="text-xs text-stone-500">{it.fort_slugs.length} forts · {it.days} days</p></div>
                <div className="flex gap-3 items-center">
                  <button onClick={() => { localStorage.setItem("fom-planner", JSON.stringify(it.fort_slugs)); nav("/planner"); }} className="text-xs uppercase tracking-[0.18em] text-[#E87524]" data-testid="itinerary-open">Open</button>
                  <button onClick={() => delIt(it.itinerary_id)} aria-label="Delete" data-testid="itinerary-delete"><Trash2 className="w-4 h-4 text-stone-400 hover:text-red-600" /></button>
                </div>
              </div>
            ))}
          </section>
          <section data-testid="profile-submissions">
            <p className="eyebrow text-[#E87524] mb-3">My contributions</p>
            {subs.length === 0 ? <p className="text-stone-500 text-sm">No submissions yet.</p> : subs.map((s) => (
              <div key={s.submission_id} className="flex justify-between py-3 border-b border-stone-200 text-sm">
                <span>{s.title} <span className="text-stone-400">· {s.type.replace("_", " ")}</span></span>
                <span className={`text-xs uppercase tracking-widest ${s.status === "approved" ? "text-green-700" : s.status === "rejected" ? "text-red-600" : "text-amber-700"}`}>{s.status}</span>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
