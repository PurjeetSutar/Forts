import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { MapContainer, TileLayer, Marker, Tooltip } from "react-leaflet";
import { MapPin, Train, Bus, Car, Footprints, Clock, Sun, Ticket, Utensils, BedDouble, Users, ExternalLink, ArrowUpRight, AlertTriangle, Mountain } from "lucide-react";
import { api } from "@/lib/api";
import { ART } from "@/lib/constants";
import { pinIcon, TILE_ATTR, TILE_URL } from "@/lib/mapIcons";
import { Reveal, SEO, StatusBadge, TypeTag, Loader, FortCard } from "@/components/common";
import { FavButton, ShareButtons } from "@/components/Actions";
import Comments from "@/components/Comments";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const SECTIONS = [["overview", "Overview"], ["history", "History"], ["timeline", "Timeline"], ["architecture", "Architecture"], ["legends", "Facts & legends"], ["visit", "Visit"], ["gallery", "Gallery"], ["sources", "Sources"], ["discussion", "Discussion"]];

const H2 = ({ eyebrow, children }) => (
  <div className="mb-8"><p className="eyebrow text-[#E87524] mb-3">{eyebrow}</p><h2 className="font-display text-3xl md:text-4xl">{children}</h2></div>
);

function FactCards({ f }) {
  const facts = [
    ["District", f.district], ["Region", f.region], ["Type", f.type], ["Period", f.period],
    ["Elevation", f.elevation_m ? `~${f.elevation_m} m (commonly cited)` : "Not verified"], ["Trek difficulty", f.difficulty],
    ["Access", f.accessibility], ["Condition", f.condition], ["Coordinates", `${f.lat.toFixed(4)}° N, ${f.lng.toFixed(4)}° E`],
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 border-t border-l border-stone-200" data-testid="fort-fact-cards">
      {facts.map(([k, v]) => (
        <div key={k} className="border-r border-b border-stone-200 p-5">
          <p className="eyebrow text-stone-400">{k}</p>
          <p className="mt-2 font-medium text-[15px]">{v}</p>
        </div>
      ))}
    </div>
  );
}

function Travel({ t, f }) {
  if (!t) return null;
  const rows = [[MapPin, "Nearest city", t.nearest_city], [Train, "Railway station", t.railway], [Bus, "Bus stop", t.bus], [Car, "Road access", t.road_access],
    [Footprints, "Trek distance", t.trek_distance], [Clock, "Trek duration", t.trek_duration], [Sun, "Best season", t.best_season], [Clock, "Time required", t.time_required],
    [Ticket, "Entry fee & timings", t.entry_fee], [Utensils, "Food & water", t.food_water], [BedDouble, "Accommodation", t.accommodation], [Users, "Local guides", t.local_guides]].filter((r) => r[2]);
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-x-10">
        {rows.map(([I, k, v]) => (
          <div key={k} className="flex gap-4 py-4 border-b border-stone-200">
            <I className="w-5 h-5 text-[#E87524] shrink-0 mt-0.5" strokeWidth={1.5} />
            <div><p className="eyebrow text-stone-400">{k}</p><p className="mt-1 text-[15px]">{v}</p></div>
          </div>
        ))}
      </div>
      <p className="mt-5 text-xs text-stone-500 flex gap-2"><AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />{t.note}</p>
      <div className="mt-6 flex flex-wrap gap-3">
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${f.lat},${f.lng}`} target="_blank" rel="noopener noreferrer" data-testid="fort-directions-btn" className="px-5 py-3 bg-[#E87524] text-white text-xs uppercase tracking-[0.2em] hover:bg-[#cf661d] inline-flex items-center gap-2">Get directions <ExternalLink className="w-3.5 h-3.5" /></a>
        <a href={`https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`} target="_blank" rel="noopener noreferrer" data-testid="fort-gmaps-btn" className="px-5 py-3 border border-[#252525] text-xs uppercase tracking-[0.2em] hover:bg-[#252525] hover:text-white">Open in Google Maps</a>
        <Link to={`/planner?add=${f.slug}`} data-testid="fort-add-planner-btn" className="px-5 py-3 border border-[#252525] text-xs uppercase tracking-[0.2em] hover:bg-[#252525] hover:text-white">Add to trip planner</Link>
      </div>
    </div>
  );
}

function Gallery({ items }) {
  const [open, setOpen] = useState(null);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="fort-gallery">
        {items.map((g, i) => (
          <button key={i} onClick={() => setOpen(g)} data-testid={`gallery-item-${i}`} className={`overflow-hidden img-zoom bg-stone-100 ${i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}`}>
            <img src={g.url} alt={g.title || "Fort photograph"} loading="lazy" className="w-full h-full object-cover" />
          </button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-5xl p-0 rounded-none border-0" data-testid="gallery-lightbox">
          <DialogTitle className="sr-only">Photograph</DialogTitle>
          {open && <><img src={open.url} alt="" className="w-full max-h-[75vh] object-contain bg-black" />
            <div className="p-4 text-xs text-stone-600 space-y-1">
              <p><b>Credit:</b> {open.credit}</p><p><b>Licence:</b> {open.license}</p>
              {open.source && <p><b>Source:</b> <a className="underline" href={open.source} target="_blank" rel="noreferrer">{open.source}</a></p>}
              {open.representative && <p className="text-amber-700">Representative image — may not depict this specific fort.</p>}
            </div></>}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function FortDetail() {
  const { slug } = useParams();
  const [f, setF] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { setF(null); setErr(false); api.get(`/forts/${slug}`).then((r) => setF(r.data)).catch(() => setErr(true)); }, [slug]);
  if (err) return <div className="pt-40 pb-24 px-6 text-center" data-testid="fort-not-found"><h1 className="font-display text-4xl">Fort not found</h1><Link to="/forts" className="text-[#E87524] underline mt-4 inline-block">Back to directory</Link></div>;
  if (!f) return <div className="pt-24"><Loader /></div>;

  const gallery = [...(f.gallery || []), ...(f.community_photos || []).map((p) => ({ url: p.url, credit: p.credit, license: p.license, source: p.source }))];
  const jsonLd = { "@context": "https://schema.org", "@type": "LandmarksOrHistoricalBuildings", name: f.name, alternateName: f.alt_names, description: f.summary,
    image: f.hero_image, geo: { "@type": "GeoCoordinates", latitude: f.lat, longitude: f.lng },
    address: { "@type": "PostalAddress", addressRegion: "Maharashtra", addressLocality: f.district, addressCountry: "IN" } };

  return (
    <article data-testid="fort-detail-page">
      <SEO title={`${f.name} Fort, ${f.district}`} description={f.summary} image={f.hero_image} jsonLd={jsonLd} />
      <header className="relative h-[88svh] min-h-[560px] bg-[#252525] overflow-hidden grain">
        <img src={f.hero_image} alt={f.name} className="absolute inset-0 w-full h-full object-cover opacity-80" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/40" />
        <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-12 lg:px-24 pb-14 text-white">
          <Reveal>
            <p className="eyebrow text-[#E87524]">{f.type} · {f.district} district · {f.region}</p>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-8xl mt-4 leading-[0.95] tracking-tight" data-testid="fort-name">{f.name}</h1>
            {f.alt_names?.length > 0 && <p className="mt-4 text-white/70 italic font-display text-xl" data-testid="fort-alt-names">Also known as {f.alt_names.join(", ")}</p>}
            <p className="mt-6 max-w-2xl text-white/85 text-base md:text-lg">{f.summary}</p>
            <div className="mt-8 flex flex-wrap items-center gap-6"><FavButton slug={f.slug} dark /><ShareButtons title={`${f.name} — Forts of Maharashtra`} dark /></div>
          </Reveal>
          {f.gallery?.[0]?.representative && <p className="absolute bottom-3 right-6 text-[10px] uppercase tracking-widest text-white/50">Representative photograph — may not depict {f.name}</p>}
        </div>
      </header>

      <nav className="sticky top-16 z-30 bg-white/90 backdrop-blur-xl border-b border-stone-200 overflow-x-auto no-scrollbar" data-testid="fort-section-nav">
        <div className="flex gap-6 px-6 md:px-12 lg:px-24 h-12 items-center whitespace-nowrap">
          {SECTIONS.map(([id, l]) => <a key={id} href={`#${id}`} className="text-xs uppercase tracking-[0.18em] text-stone-600 hover:text-[#E87524]" data-testid={`section-link-${id}`}>{l}</a>)}
        </div>
      </nav>

      <div className="px-6 md:px-12 lg:px-24">
        <section id="overview" className="py-20 grid lg:grid-cols-12 gap-12 scroll-mt-32">
          <div className="lg:col-span-7"><FactCards f={f} /></div>
          <div className="lg:col-span-5 h-[360px] border border-stone-200" data-testid="fort-mini-map">
            <MapContainer center={[f.lat, f.lng]} zoom={10} scrollWheelZoom={false} className="w-full h-full">
              <TileLayer url={TILE_URL} attribution={TILE_ATTR} />
              <Marker position={[f.lat, f.lng]} icon={pinIcon(f.type, true)}><Tooltip permanent direction="top" offset={[0, -28]}>{f.name}</Tooltip></Marker>
              {f.nearby.map((n) => <Marker key={n.slug} position={[n.lat, n.lng]} icon={pinIcon(n.type)}><Tooltip>{n.name} · {n.distance_km} km</Tooltip></Marker>)}
            </MapContainer>
            <p className="text-[10px] text-stone-400 mt-1">Coordinates are approximate; confirm on official maps before travel.</p>
          </div>
        </section>

        <section id="history" className="py-16 grid lg:grid-cols-12 gap-12 border-t border-stone-200 scroll-mt-32">
          <div className="lg:col-span-7">
            <H2 eyebrow="Historical background">Origins & story</H2>
            <div className="space-y-5 text-[17px] leading-[1.8] text-stone-700">
              {f.history.map((p, i) => <p key={i} className={i === 0 ? "dropcap" : ""}>{p}</p>)}
            </div>
            {f.strategic_importance && <div className="mt-10"><p className="eyebrow text-stone-400 mb-2">Strategic & military importance</p><p className="text-[16px] leading-relaxed">{f.strategic_importance}</p></div>}
          </div>
          <aside className="lg:col-span-4 lg:col-start-9 space-y-6">
            <div className="bg-[#252525] text-white p-8 relative overflow-hidden" data-testid="fort-shivaji-association">
              <img src={ART.gate} alt="" aria-hidden className="absolute -right-10 -bottom-10 w-48 opacity-10 invert" />
              <p className="eyebrow text-[#E87524] mb-3">Maratha association</p>
              <p className="font-display text-xl leading-snug relative">{f.shivaji_association || "No documented association recorded."}</p>
              <p className="text-xs text-white/50 mt-4 relative">Not every fort in Maharashtra was built or taken by Shivaji Maharaj — we record associations only where documented.</p>
            </div>
            <div className="flex flex-wrap gap-2">{f.associations?.map((a) => <Link key={a} to={`/forts?association=${encodeURIComponent(a)}`} className="text-[11px] border border-stone-300 px-2 py-1 hover:border-[#E87524]">{a}</Link>)}</div>
          </aside>
        </section>

        <section id="timeline" className="py-16 border-t border-stone-200 scroll-mt-32">
          <H2 eyebrow="Battles, conquests & events">Historical timeline</H2>
          {f.events.length === 0 ? <p className="text-stone-500">Verified timeline entries pending — contributions with sources are welcome.</p> : (
            <ol className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-stone-200 border border-stone-200" data-testid="fort-timeline">
              {f.events.map((e, i) => (
                <li key={i} className="bg-white p-7">
                  <div className="flex justify-between items-start gap-3"><p className="font-display text-3xl text-[#E87524]">{e.year}</p><StatusBadge status={e.status} /></div>
                  <h3 className="font-display text-xl mt-3">{e.title}</h3>
                  <p className="text-sm text-stone-600 mt-2 leading-relaxed">{e.desc}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section id="architecture" className="py-16 border-t border-stone-200 grid lg:grid-cols-12 gap-12 scroll-mt-32">
          <div className="lg:col-span-5">
            <H2 eyebrow="Architecture & construction">How it was built</H2>
            <p className="text-[16px] leading-relaxed text-stone-700">{f.architecture}</p>
            <img src={f.type.includes("Sea") || f.type.includes("Island") ? ART.sea : ART.bastion} alt="Illustrative ink drawing" className="mt-8 w-full art-wash opacity-90" />
            <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-1">Illustration · AI-generated artwork, not a survey drawing of this fort</p>
          </div>
          <div className="lg:col-span-6 lg:col-start-7">
            <p className="eyebrow text-stone-400 mb-4">Gates, bastions, temples & water systems</p>
            <ul data-testid="fort-structures">
              {f.structures.map((s, i) => (
                <li key={i} className="py-5 border-b border-stone-200 grid grid-cols-[40px_1fr] gap-4">
                  <span className="font-display text-stone-300 text-2xl">{String(i + 1).padStart(2, "0")}</span>
                  <div><h3 className="font-display text-xl">{s.name}</h3><p className="text-sm text-stone-600 mt-1">{s.desc}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="legends" className="py-16 border-t border-stone-200 grid md:grid-cols-2 gap-10 scroll-mt-32">
          <div>
            <div className="flex items-center gap-3 mb-6"><h2 className="font-display text-3xl">Interesting facts</h2><StatusBadge status="documented" /></div>
            <ul className="space-y-4">{f.facts.map((x, i) => <li key={i} className="border-l-2 border-[#252525] pl-5 text-[15px] leading-relaxed">{x}</li>)}</ul>
            {f.facts.length === 0 && <p className="text-stone-500 text-sm">None recorded yet.</p>}
          </div>
          <div className="bg-[#E87524]/[0.06] p-8 border border-[#E87524]/30" data-testid="fort-legends">
            <div className="flex items-center gap-3 mb-6"><h2 className="font-display text-3xl">Legends & folklore</h2><StatusBadge status="tradition" /></div>
            {f.legends.length ? <ul className="space-y-4">{f.legends.map((x, i) => <li key={i} className="font-display italic text-lg leading-relaxed">“{x}”</li>)}</ul> : <p className="text-sm text-stone-600">No local legends recorded yet.</p>}
            <p className="text-xs text-stone-500 mt-6">Oral traditions are presented as such — they are not documented history.</p>
          </div>
          <div className="md:col-span-2 border border-stone-200 p-8 flex gap-5 items-start">
            <Mountain className="w-6 h-6 text-[#E87524] shrink-0" strokeWidth={1.5} />
            <div><p className="eyebrow text-stone-400 mb-2">Present-day condition & conservation</p><p className="text-[15px]">{f.conservation}</p></div>
          </div>
        </section>

        <section id="visit" className="py-16 border-t border-stone-200 scroll-mt-32">
          <H2 eyebrow="Visitor information & travel guide">Plan your visit</H2>
          <Travel t={f.travel} f={f} />
          {f.circuits?.length > 0 && (
            <div className="mt-12"><p className="eyebrow text-stone-400 mb-4">Part of these circuits</p>
              <div className="flex flex-wrap gap-3">{f.circuits.map((c) => <Link key={c.slug} to={`/planner?circuit=${c.slug}`} className="border border-stone-300 px-4 py-2 text-sm hover:border-[#E87524]" data-testid={`fort-circuit-${c.slug}`}>{c.name} · {c.days} days</Link>)}</div>
            </div>
          )}
          <div className="mt-14"><p className="eyebrow text-stone-400 mb-6">Nearby forts</p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">{f.nearby.map((n, i) => <div key={n.slug}><FortCard f={n} i={i} /><p className="text-xs text-stone-500 mt-2">~{n.distance_km} km straight-line</p></div>)}</div>
          </div>
        </section>

        <section id="gallery" className="py-16 border-t border-stone-200 scroll-mt-32">
          <H2 eyebrow="Photographs & illustrations">Gallery</H2>
          <Gallery items={gallery} />
          <Link to={`/contribute?type=photograph&fort=${f.slug}`} className="inline-block mt-6 text-xs uppercase tracking-[0.2em] text-[#E87524] link-reveal" data-testid="fort-contribute-photo">Contribute a photograph of {f.name}</Link>
        </section>

        <section id="sources" className="py-16 border-t border-stone-200 grid lg:grid-cols-12 gap-12 scroll-mt-32">
          <div className="lg:col-span-7">
            <H2 eyebrow="References & historical sources">Sources</H2>
            <ol className="space-y-4 list-decimal pl-5" data-testid="fort-references">
              {f.references.map((r, i) => <li key={i} className="text-[15px]"><a href={r.url} target="_blank" rel="noreferrer" className="font-medium hover:text-[#E87524] inline-flex items-center gap-1">{r.title}<ArrowUpRight className="w-3.5 h-3.5" /></a><span className="text-stone-500"> — {r.publisher}</span></li>)}
            </ol>
          </div>
          <div className="lg:col-span-4 lg:col-start-9 border border-stone-200 p-6 text-sm text-stone-600 space-y-3">
            <p className="eyebrow text-stone-400">Verification key</p>
            <p><StatusBadge status="documented" /> Supported by the cited historical sources.</p>
            <p><StatusBadge status="tradition" /> Oral tradition or folklore.</p>
            <p><StatusBadge status="needs_verification" /> Dates or details vary between sources.</p>
            <Link to={`/contribute?type=correction&fort=${f.slug}`} className="block pt-2 text-[#E87524] underline" data-testid="fort-suggest-correction">Suggest a correction</Link>
          </div>
        </section>

        {f.stories?.length > 0 && (
          <section className="py-16 border-t border-stone-200">
            <p className="eyebrow text-[#E87524] mb-6">Related stories</p>
            <div className="grid md:grid-cols-3 gap-6">{f.stories.map((s) => <Link key={s.slug} to={`/stories/${s.slug}`} className="group img-zoom" data-testid={`related-story-${s.slug}`}><div className="aspect-[16/10] overflow-hidden"><img src={s.cover} alt="" className="w-full h-full object-cover" /></div><h3 className="font-display text-xl mt-3 group-hover:text-[#E87524]">{s.title}</h3></Link>)}</div>
          </section>
        )}

        <section id="discussion" className="py-16 border-t border-stone-200 max-w-4xl scroll-mt-32"><Comments slug={f.slug} /></section>
        <div className="pb-16"><TypeTag type={f.type} /></div>
      </div>
    </article>
  );
}
