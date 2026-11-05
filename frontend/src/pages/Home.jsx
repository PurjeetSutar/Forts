import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, useInView, useScroll, useTransform, animate } from "framer-motion";
import { Search, ArrowRight, ArrowUpRight, Mountain, Waves, Castle, Trees, Anchor } from "lucide-react";
import { api } from "@/lib/api";
import { ART, ERAS, HERO_IMG, TYPE_COLORS } from "@/lib/constants";
import { useI18n } from "@/context/I18nContext";
import { Reveal, SectionHead, SEO, FortCard, StatusBadge } from "@/components/common";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

function Counter({ value, suffix }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration: 1.8, ease: "easeOut", onUpdate: (v) => setN(Math.round(v)) });
    return () => c.stop();
  }, [inView, value]);
  return <span ref={ref}>{n}{suffix}</span>;
}

function Hero() {
  const { t } = useI18n();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 800], [0, 200]);
  return (
    <section className="relative h-[100svh] min-h-[640px] overflow-hidden bg-[#252525] grain" data-testid="home-hero">
      <motion.img style={{ y }} initial={{ scale: 1.15 }} animate={{ scale: 1 }} transition={{ duration: 2.4, ease: "easeOut" }}
        src={HERO_IMG} alt="Stone fortification along a Sahyadri ridge" className="absolute inset-0 w-full h-[115%] object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/75" />
      <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-12 lg:px-24 pb-20 md:pb-24">
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.9 }} className="eyebrow text-[#E87524] mb-6">
          A digital museum of the Sahyadri, the Konkan & the Deccan
        </motion.p>
        <motion.h1 initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 1.1, ease: [0.2, 0.7, 0.2, 1] }}
          className="font-display text-white text-5xl sm:text-6xl lg:text-8xl leading-[0.95] tracking-tight max-w-5xl" data-testid="hero-title">
          FORTS OF<br /><span className="italic font-normal">Maharashtra</span>
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9, duration: 1 }} className="mt-6 text-white/85 text-base md:text-lg max-w-xl">
          Explore the Legacy. Discover the Stories. Experience the History.
        </motion.p>
        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.9 }}
          onSubmit={(e) => { e.preventDefault(); nav(`/forts?q=${encodeURIComponent(q)}`); }}
          className="mt-10 flex max-w-2xl bg-white/95 backdrop-blur" data-testid="hero-search-form">
          <Search className="w-5 h-5 m-4 text-stone-400 shrink-0" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} data-testid="hero-search-input"
            className="flex-1 bg-transparent outline-none text-sm md:text-base text-[#252525] placeholder:text-stone-400 min-w-0" />
          <button type="submit" data-testid="hero-search-btn" className="px-5 md:px-7 bg-[#E87524] hover:bg-[#cf661d] text-white text-xs uppercase tracking-[0.2em] font-semibold transition-colors">Search</button>
        </motion.form>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="mt-6 flex flex-wrap gap-4">
          <Link to="/forts" data-testid="hero-explore-btn" className="px-7 py-3.5 bg-[#E87524] hover:bg-[#cf661d] text-white text-xs uppercase tracking-[0.2em] font-semibold transition-colors">{t("explore")}</Link>
          <Link to="/map" data-testid="hero-map-btn" className="px-7 py-3.5 border border-white/60 text-white hover:bg-white hover:text-[#252525] text-xs uppercase tracking-[0.2em] font-semibold transition-colors">{t("map")}</Link>
        </motion.div>
        <p className="absolute bottom-4 right-6 text-[10px] uppercase tracking-widest text-white/50">Representative photograph · Unsplash</p>
      </div>
    </section>
  );
}

function Stats({ settings }) {
  if (!settings) return null;
  return (
    <section className="px-6 md:px-12 lg:px-24 py-24 relative" data-testid="home-stats">
      <div className="grid grid-cols-2 lg:grid-cols-5 border-t border-l border-stone-200">
        {settings.stats.map((s, i) => (
          <Reveal key={s.key} delay={i * 0.08} className="border-r border-b border-stone-200 p-6 md:p-8">
            <div className="font-display text-5xl md:text-6xl text-[#E87524]" data-testid={`stat-${s.key}`}><Counter value={s.value} suffix={s.suffix} /></div>
            <p className="mt-3 text-sm font-semibold">{s.label}</p>
            <p className="mt-1 text-xs text-stone-500">{s.note}</p>
          </Reveal>
        ))}
      </div>
      <p className="mt-4 text-xs text-stone-500 max-w-2xl">This archive currently profiles {settings.profiled_count} well-documented forts with sources. It grows only through verified additions — we never create placeholder entries to reach a number.</p>
    </section>
  );
}

function Featured({ forts }) {
  return (
    <section className="py-24 bg-[#F7F5F2] relative overflow-hidden" data-testid="home-featured">
      <img src={ART.hill} alt="" aria-hidden className="absolute -right-20 top-0 w-[50%] opacity-[0.10] art-wash pointer-events-none" />
      <div className="px-6 md:px-12 lg:px-24 relative">
        <SectionHead eyebrow="Featured forts" title="Citadels that shaped a history">Begin with the forts most closely tied to Maharashtra's turning points — each profile separates documented history from legend.</SectionHead>
        <Carousel opts={{ align: "start", loop: true }} className="relative">
          <CarouselContent className="-ml-6">
            {forts.map((f) => (
              <CarouselItem key={f.slug} className="pl-6 basis-[85%] sm:basis-1/2 lg:basis-1/3">
                <Link to={`/forts/${f.slug}`} data-testid={`featured-${f.slug}`} className="group block img-zoom">
                  <div className="aspect-[3/4] overflow-hidden relative bg-stone-200">
                    <img src={f.hero_image} alt={f.name} loading="lazy" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
                    <div className="absolute bottom-0 p-6 text-white">
                      <p className="eyebrow text-[#E87524]">{f.type} · {f.district}</p>
                      <h3 className="font-display text-3xl mt-2">{f.name}</h3>
                      <p className="text-sm text-white/80 mt-2 line-clamp-2">{f.summary}</p>
                    </div>
                  </div>
                </Link>
              </CarouselItem>
            ))}
          </CarouselContent>
          <div className="flex gap-2 mt-8 justify-end">
            <CarouselPrevious data-testid="featured-prev" className="static translate-y-0 rounded-none border-[#252525]" />
            <CarouselNext data-testid="featured-next" className="static translate-y-0 rounded-none border-[#252525]" />
          </div>
        </Carousel>
      </div>
    </section>
  );
}

function Timeline() {
  return (
    <section className="px-6 md:px-12 lg:px-24 py-28 grid lg:grid-cols-12 gap-12" data-testid="home-timeline">
      <div className="lg:col-span-4 lg:sticky lg:top-28 self-start">
        <SectionHead eyebrow="Two thousand years in stone" title="A timeline of fort heritage">From ancient trade passes to the Maratha Swarajya and the colonial era.</SectionHead>
        <img src={ART.gate} alt="Ink illustration of a fort gateway" className="w-3/4 opacity-80 art-wash hidden lg:block" />
        <p className="text-[10px] uppercase tracking-widest text-stone-400 mt-2 hidden lg:block">Illustration · AI-generated artwork</p>
      </div>
      <ol className="lg:col-span-7 lg:col-start-6 relative border-l border-stone-300">
        {ERAS.map((e, i) => (
          <Reveal key={e.title} delay={i * 0.04}>
            <li className="pl-10 pb-12 relative" data-testid={`era-${i}`}>
              <span className="absolute -left-[7px] top-1.5 w-3.5 h-3.5 bg-white border-2 border-[#E87524] rounded-full" />
              <p className="font-display text-[#E87524] text-xl italic">{e.year}</p>
              <h3 className="font-display text-2xl mt-1">{e.title}</h3>
              <p className="text-stone-600 mt-2 leading-relaxed">{e.desc}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}

const CAT_ICONS = { "Hill Fort": Mountain, "Sea Fort": Waves, "Island Fort": Anchor, "Land Fort": Castle, "Forest Fort": Trees };
const CAT_ART = { "Hill Fort": ART.hill, "Sea Fort": ART.sea, "Island Fort": ART.sea, "Land Fort": ART.gate, "Forest Fort": ART.panorama };

function Categories({ counts }) {
  return (
    <section className="bg-[#252525] text-white py-28 px-6 md:px-12 lg:px-24 relative overflow-hidden grain" data-testid="home-categories">
      <SectionHead light eyebrow="Explore by category" title="Mountain, sea, island, plain and forest" />
      <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-px bg-white/10 relative z-10">
        {Object.keys(TYPE_COLORS).map((t, i) => {
          const I = CAT_ICONS[t];
          return (
            <Reveal key={t} delay={i * 0.06}>
              <Link to={`/forts?type=${encodeURIComponent(t)}`} data-testid={`category-${t.replace(" ", "-").toLowerCase()}`} className="group block bg-[#252525] hover:bg-[#2f2f2f] transition-colors p-8 h-full relative overflow-hidden min-h-[280px]">
                <img src={CAT_ART[t]} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-[0.08] group-hover:opacity-[0.18] transition-opacity duration-700 grayscale" />
                <div className="relative">
                  <I className="w-8 h-8 text-[#E87524]" strokeWidth={1.25} />
                  <h3 className="font-display text-2xl mt-10">{t}s</h3>
                  <p className="text-white/50 text-sm mt-2">{counts[t] || 0} profiled</p>
                  <ArrowRight className="w-5 h-5 mt-8 text-white/40 group-hover:text-[#E87524] group-hover:translate-x-2 transition-[transform,color]" />
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function StoriesAndTrips({ stories, circuits }) {
  return (
    <section className="px-6 md:px-12 lg:px-24 py-28" data-testid="home-stories">
      <div className="flex flex-wrap justify-between items-end gap-6">
        <SectionHead eyebrow="Featured stories" title="Read the walls" />
        <Link to="/stories" className="text-xs uppercase tracking-[0.2em] font-semibold text-[#E87524] mb-14 link-reveal" data-testid="home-all-stories">All stories</Link>
      </div>
      <div className="grid md:grid-cols-12 gap-8">
        {stories.slice(0, 3).map((s, i) => (
          <Reveal key={s.slug} delay={i * 0.1} className={i === 0 ? "md:col-span-6 md:row-span-2" : "md:col-span-6"}>
            <Link to={`/stories/${s.slug}`} data-testid={`home-story-${s.slug}`} className="group grid gap-5 img-zoom">
              <div className={`overflow-hidden bg-stone-100 ${i === 0 ? "aspect-[4/3]" : "aspect-[16/7]"}`}><img src={s.cover} alt="" loading="lazy" className="w-full h-full object-cover" /></div>
              <div>
                <div className="flex gap-3 items-center"><p className="eyebrow text-stone-500">{s.category}</p><StatusBadge status={s.status} /></div>
                <h3 className={`font-display mt-2 group-hover:text-[#E87524] transition-colors ${i === 0 ? "text-3xl md:text-4xl" : "text-2xl"}`}>{s.title}</h3>
                {i === 0 && <p className="text-stone-600 mt-3">{s.excerpt}</p>}
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      <div className="mt-28">
        <div className="flex flex-wrap justify-between items-end gap-6">
          <SectionHead eyebrow="Travel recommendations" title="Suggested fort circuits" />
          <Link to="/planner" className="text-xs uppercase tracking-[0.2em] font-semibold text-[#E87524] mb-14 link-reveal" data-testid="home-planner-link">Open trip planner</Link>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-stone-200 border border-stone-200">
          {circuits.slice(0, 3).map((c, i) => (
            <Reveal key={c.slug} delay={i * 0.08} className="bg-white p-8">
              <p className="font-display text-6xl text-[#E87524]/25">{String(i + 1).padStart(2, "0")}</p>
              <h3 className="font-display text-2xl mt-4">{c.name}</h3>
              <p className="text-xs uppercase tracking-[0.18em] text-stone-500 mt-2">{c.days} days · {c.forts.length} forts</p>
              <p className="text-stone-600 text-sm mt-4 leading-relaxed">{c.desc}</p>
              <Link to={`/planner?circuit=${c.slug}`} data-testid={`home-circuit-${c.slug}`} className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-[#252525] hover:text-[#E87524] transition-colors">Plan this route <ArrowUpRight className="w-4 h-4" /></Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home() {
  const [settings, setSettings] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [stories, setStories] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [all, setAll] = useState([]);
  useEffect(() => {
    api.get("/settings").then((r) => setSettings(r.data));
    api.get("/forts", { params: { featured: true, limit: 20 } }).then((r) => setFeatured(r.data.items));
    api.get("/forts", { params: { limit: 500 } }).then((r) => setAll(r.data.items));
    api.get("/stories").then((r) => setStories(r.data.filter((s) => s.featured).concat(r.data.filter((s) => !s.featured))));
    api.get("/circuits").then((r) => setCircuits(r.data));
  }, []);
  const counts = all.reduce((a, f) => ({ ...a, [f.type]: (a[f.type] || 0) + 1 }), {});
  return (
    <div data-testid="home-page">
      <SEO description="A digital heritage and travel platform documenting the forts of Maharashtra — history, maps, stories and trip planning." />
      <Hero />
      <Stats settings={settings} />
      <section className="px-6 md:px-12 lg:px-24 pb-20 grid md:grid-cols-12 gap-10 items-center">
        <Reveal className="md:col-span-7"><img src={ART.panorama} alt="Line illustration of the Sahyadri range with fort silhouettes" className="w-full art-wash" /></Reveal>
        <Reveal className="md:col-span-4 md:col-start-9" delay={0.15}>
          <p className="font-display italic text-3xl md:text-4xl leading-snug">“The Sahyadri were not merely mountains — they were the walls of a kingdom.”</p>
          <p className="text-xs uppercase tracking-[0.2em] text-stone-400 mt-6">Editorial reflection · Illustration: AI-generated artwork</p>
        </Reveal>
      </section>
      <Featured forts={featured} />
      <Timeline />
      <Categories counts={counts} />
      <StoriesAndTrips stories={stories} circuits={circuits} />
      <section className="px-6 md:px-12 lg:px-24 pb-28">
        <div className="grid md:grid-cols-2 gap-10 items-center border border-stone-200 p-8 md:p-14 relative overflow-hidden">
          <img src={ART.bastion} alt="" aria-hidden className="absolute right-0 top-0 h-full opacity-[0.12] art-wash hidden md:block" />
          <div className="relative">
            <p className="eyebrow text-[#E87524] mb-4">Directory</p>
            <h2 className="font-display text-4xl">Browse every profiled fort, A to Z.</h2>
          </div>
          <div className="relative flex flex-wrap gap-2">
            {[...new Set(all.map((f) => f.name[0]))].sort().map((l) => (
              <Link key={l} to={`/forts?letter=${l}`} data-testid={`home-letter-${l}`} className="w-11 h-11 grid place-items-center border border-stone-300 font-display text-lg hover:bg-[#E87524] hover:text-white hover:border-[#E87524] transition-colors">{l}</Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
