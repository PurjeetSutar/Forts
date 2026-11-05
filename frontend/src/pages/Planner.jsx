import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Plus, X, ArrowUp, ArrowDown, Wand2, Save, ExternalLink, Search, ShieldCheck, Backpack, Droplets, CloudRain, Sun, Compass } from "lucide-react";
import { toast } from "sonner";
import { api, distanceKm, formatErr } from "@/lib/api";
import { ART } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { PageHero, SEO, TypeTag, Reveal } from "@/components/common";

const LS = "fom-planner";

function optimise(list) {
  if (list.length < 3) return list;
  const rest = [...list.slice(1)];
  const out = [list[0]];
  while (rest.length) {
    const last = out[out.length - 1];
    rest.sort((a, b) => distanceKm(last, a) - distanceKm(last, b));
    out.push(rest.shift());
  }
  return out;
}

function splitDays(stops) {
  const days = [];
  let cur = [];
  stops.forEach((s) => {
    const cap = s.difficulty === "Difficult" ? 1 : 2;
    const curHard = cur.some((x) => x.difficulty === "Difficult");
    if (cur.length && (cur.length >= cap || curHard || distanceKm(cur[cur.length - 1], s) > 120)) { days.push(cur); cur = []; }
    cur.push(s);
  });
  if (cur.length) days.push(cur);
  return days;
}

const SAFETY = [
  [ShieldCheck, "Safety", "Trek in groups, tell someone your route, avoid cliff edges and slippery rock patches, and start early to descend before dark."],
  [CloudRain, "Monsoon caution", "Heavy rain can make trails, rock-cut steps and streams dangerous. Follow local and forest department advisories."],
  [Backpack, "Essential equipment", "Sturdy shoes with grip, rain jacket, torch, first-aid kit, power bank, cap and sunscreen."],
  [Droplets, "Food & water", "Carry at least 2–3 litres of water per person. Fort cisterns are not always safe to drink."],
  [Sun, "Heat", "Summer (March–May) midday climbs can cause heat exhaustion — trek early morning."],
  [Compass, "Respect heritage", "Do not write on walls, remove stones, litter or disturb temples. Many forts are protected monuments."],
];

export default function Planner() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [forts, setForts] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [sel, setSel] = useState(() => JSON.parse(localStorage.getItem(LS) || "[]"));
  const [q, setQ] = useState("");
  const [title, setTitle] = useState("My fort expedition");

  useEffect(() => {
    api.get("/forts/map").then((r) => setForts(r.data));
    api.get("/circuits").then((r) => {
      setCircuits(r.data);
      const c = r.data.find((x) => x.slug === params.get("circuit"));
      if (c) { setSel(c.forts); setTitle(c.name); }
    });
    const add = params.get("add");
    if (add) setSel((s) => (s.includes(add) ? s : [...s, add]));
  }, [params]);
  useEffect(() => localStorage.setItem(LS, JSON.stringify(sel)), [sel]);

  const bySlug = useMemo(() => Object.fromEntries(forts.map((f) => [f.slug, f])), [forts]);
  const stops = sel.map((s) => bySlug[s]).filter(Boolean);
  const days = splitDays(stops);
  const total = stops.reduce((a, s, i) => (i ? a + distanceKm(stops[i - 1], s) : 0), 0);
  const gmaps = stops.length > 1 ? `https://www.google.com/maps/dir/?api=1&origin=${stops[0].lat},${stops[0].lng}&destination=${stops.at(-1).lat},${stops.at(-1).lng}&waypoints=${stops.slice(1, -1).map((s) => `${s.lat},${s.lng}`).join("|")}` : null;

  const move = (i, d) => setSel((s) => { const n = [...s]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });
  const toggle = (slug) => setSel((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));
  const save = async () => {
    if (!user) return toast("Sign in to save itineraries", { action: { label: "Sign in", onClick: () => (window.location.href = "/login") } });
    try { await api.post("/me/itineraries", { title, fort_slugs: sel, days: days.length }); toast.success("Itinerary saved to your profile"); }
    catch (e) { toast.error(formatErr(e)); }
  };
  const options = forts.filter((f) => !q || `${f.name} ${f.district}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div data-testid="planner-page">
      <SEO title="Fort Trip Planner" description="Select multiple forts, build a day-by-day itinerary and explore suggested fort circuits across Maharashtra." />
      <PageHero eyebrow="Tour guide & travel planner" title="Build your fort expedition" art={ART.panorama}>
        Choose forts, let us order them by distance and split them into realistic days. Distances are straight-line estimates — always confirm road routes and local conditions.
      </PageHero>

      <section className="px-6 md:px-12 lg:px-24 py-14">
        <p className="eyebrow text-[#E87524] mb-5">Suggested regional circuits</p>
        <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2" data-testid="planner-circuits">
          {circuits.map((c) => (
            <button key={c.slug} onClick={() => { setSel(c.forts); setTitle(c.name); }} data-testid={`planner-circuit-${c.slug}`}
              className="min-w-[260px] text-left border border-stone-200 p-6 hover:border-[#E87524] transition-colors">
              <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{c.region} · {c.days} days</p>
              <h3 className="font-display text-xl mt-2">{c.name}</h3>
              <p className="text-sm text-stone-600 mt-2 line-clamp-2">{c.desc}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="px-6 md:px-12 lg:px-24 pb-20 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 border border-stone-200 self-start lg:sticky lg:top-24">
          <div className="p-4 border-b border-stone-200 flex items-center gap-2"><Search className="w-4 h-4 text-stone-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find forts to add" className="flex-1 outline-none text-sm" data-testid="planner-search" /></div>
          <ul className="max-h-[60vh] overflow-y-auto" data-testid="planner-fort-options">
            {options.map((f) => (
              <li key={f.slug} className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                <div><p className="text-sm font-medium">{f.name}</p><TypeTag type={f.type} /></div>
                <button onClick={() => toggle(f.slug)} data-testid={`planner-toggle-${f.slug}`} aria-label={sel.includes(f.slug) ? "Remove" : "Add"}
                  className={`w-8 h-8 grid place-items-center border ${sel.includes(f.slug) ? "bg-[#E87524] border-[#E87524] text-white" : "border-stone-300 hover:border-[#E87524]"}`}>
                  {sel.includes(f.slug) ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="lg:col-span-8">
          <div className="flex flex-wrap gap-3 items-center justify-between mb-8">
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="font-display text-3xl md:text-4xl outline-none border-b border-transparent focus:border-[#E87524] bg-transparent flex-1 min-w-[200px]" data-testid="planner-title" />
            <div className="flex gap-2">
              <button onClick={() => setSel(optimise(stops).map((s) => s.slug))} disabled={stops.length < 3} className="px-4 py-2.5 border border-[#252525] text-xs uppercase tracking-[0.18em] inline-flex items-center gap-2 disabled:opacity-30 hover:bg-[#252525] hover:text-white" data-testid="planner-optimise-btn"><Wand2 className="w-4 h-4" />Optimise route</button>
              <button onClick={save} disabled={!stops.length} className="px-4 py-2.5 bg-[#E87524] text-white text-xs uppercase tracking-[0.18em] inline-flex items-center gap-2 disabled:opacity-30 hover:bg-[#cf661d]" data-testid="planner-save-btn"><Save className="w-4 h-4" />Save</button>
              {sel.length > 0 && <button onClick={() => setSel([])} className="px-3 text-xs text-stone-500 underline" data-testid="planner-clear-btn">Clear</button>}
            </div>
          </div>
          {stops.length === 0 ? (
            <div className="border border-dashed border-stone-300 p-16 text-center" data-testid="planner-empty">
              <p className="font-display text-2xl">Your itinerary is empty</p>
              <p className="text-stone-500 text-sm mt-2">Add forts from the list or pick a circuit above.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 border border-stone-200 mb-10" data-testid="planner-summary">
                {[["Forts", stops.length], ["Days (suggested)", days.length], ["Straight-line km", Math.round(total)]].map(([k, v]) => (
                  <div key={k} className="p-5 border-r border-stone-200 last:border-0"><p className="font-display text-4xl text-[#E87524]">{v}</p><p className="text-xs uppercase tracking-[0.15em] text-stone-500 mt-1">{k}</p></div>
                ))}
              </div>
              <ol className="space-y-12" data-testid="planner-itinerary">
                {days.map((d, di) => (
                  <Reveal key={di}>
                    <li>
                      <p className="eyebrow text-[#E87524] mb-4">Day {di + 1}</p>
                      <div className="border-l border-stone-300 pl-6 space-y-6">
                        {d.map((s) => {
                          const idx = sel.indexOf(s.slug);
                          const prev = idx > 0 ? stops[idx - 1] : null;
                          return (
                            <div key={s.slug} className="relative" data-testid={`itinerary-stop-${s.slug}`}>
                              <span className="absolute -left-[31px] top-2 w-3 h-3 rounded-full bg-[#E87524] border-2 border-white" />
                              {prev && <p className="text-xs text-stone-400 mb-2">↓ ~{distanceKm(prev, s)} km from {prev.name}</p>}
                              <div className="grid md:grid-cols-[140px_1fr_auto] gap-5 border border-stone-200 p-4">
                                <img src={s.hero_image} alt="" className="w-full h-24 object-cover" />
                                <div>
                                  <Link to={`/forts/${s.slug}`} className="font-display text-xl hover:text-[#E87524]">{s.name}</Link>
                                  <p className="text-xs text-stone-500">{s.district} · {s.difficulty} · {s.accessibility}</p>
                                  <div className="text-xs text-stone-600 mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1">
                                    <span><b>Rail:</b> {s.travel?.railway}</span><span><b>Bus:</b> {s.travel?.bus}</span>
                                    <span><b>Trek:</b> {s.travel?.trek_duration}</span><span><b>Time needed:</b> {s.travel?.time_required}</span>
                                    <span className="sm:col-span-2"><b>Best season:</b> {s.travel?.best_season}</span>
                                  </div>
                                </div>
                                <div className="flex md:flex-col gap-1">
                                  <button disabled={idx === 0} onClick={() => move(idx, -1)} className="p-1.5 border border-stone-200 disabled:opacity-20" aria-label="Move up" data-testid={`stop-up-${s.slug}`}><ArrowUp className="w-4 h-4" /></button>
                                  <button disabled={idx === sel.length - 1} onClick={() => move(idx, 1)} className="p-1.5 border border-stone-200 disabled:opacity-20" aria-label="Move down" data-testid={`stop-down-${s.slug}`}><ArrowDown className="w-4 h-4" /></button>
                                  <button onClick={() => toggle(s.slug)} className="p-1.5 border border-stone-200 hover:text-red-600" aria-label="Remove" data-testid={`stop-remove-${s.slug}`}><X className="w-4 h-4" /></button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </li>
                  </Reveal>
                ))}
              </ol>
              {gmaps && <a href={gmaps} target="_blank" rel="noopener noreferrer" className="mt-10 inline-flex items-center gap-2 px-5 py-3 bg-[#252525] text-white text-xs uppercase tracking-[0.2em] hover:bg-black" data-testid="planner-gmaps-btn">Open route in Google Maps <ExternalLink className="w-4 h-4" /></a>}
            </>
          )}
        </div>
      </section>

      <section className="bg-[#252525] text-white px-6 md:px-12 lg:px-24 py-24 relative overflow-hidden grain">
        <p className="eyebrow text-[#E87524] mb-4">Before you go</p>
        <h2 className="font-display text-4xl mb-12">Safety & trekking essentials</h2>
        <div className="grid md:grid-cols-3 gap-px bg-white/10 relative z-10">
          {SAFETY.map(([I, t, d]) => <div key={t} className="bg-[#252525] p-8"><I className="w-6 h-6 text-[#E87524]" strokeWidth={1.5} /><h3 className="font-display text-xl mt-5">{t}</h3><p className="text-sm text-white/70 mt-3 leading-relaxed">{d}</p></div>)}
        </div>
        <p className="text-xs text-white/50 mt-8 relative z-10">Tourism resources: Maharashtra Tourism (maharashtratourism.gov.in) · MTDC (mtdc.co) · local forest department offices for sanctuary forts. Emergency: 112.</p>
      </section>
    </div>
  );
}
