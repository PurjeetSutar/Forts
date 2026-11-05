import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { STATUS_META, TYPE_COLORS } from "@/lib/constants";

export const Reveal = ({ children, delay = 0, className = "", y = 24 }) => (
  <motion.div className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.8, delay, ease: [0.2, 0.7, 0.2, 1] }}>
    {children}
  </motion.div>
);

export const SEO = ({ title, description, image, jsonLd, path }) => {
  const full = title ? `${title} · Forts of Maharashtra` : "Forts of Maharashtra — Explore the Legacy";
  const url = typeof window !== "undefined" ? window.location.origin + (path || window.location.pathname) : "";
  return (
    <Helmet>
      <title>{full}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={url} />
      <meta property="og:title" content={full} />
      {description && <meta property="og:description" content={description} />}
      {image && <meta property="og:image" content={image} />}
      <meta property="og:url" content={url} />
      <meta name="twitter:card" content="summary_large_image" />
      {jsonLd && <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>}
    </Helmet>
  );
};

export const StatusBadge = ({ status, className = "" }) => {
  const m = STATUS_META[status] || STATUS_META.documented;
  return <span data-testid={`status-${status}`} className={`inline-block text-[10px] uppercase tracking-[0.18em] px-2 py-1 font-semibold ${m.cls} ${className}`}>{m.label}</span>;
};

export const TypeTag = ({ type }) => (
  <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.18em] font-semibold text-stone-600">
    <span className="w-2 h-2 rounded-full" style={{ background: TYPE_COLORS[type] || "#999" }} />{type}
  </span>
);

export const SectionHead = ({ eyebrow, title, children, light }) => (
  <Reveal className="max-w-3xl mb-14">
    <p className={`eyebrow mb-4 ${light ? "text-[#E87524]" : "text-[#E87524]"}`}>{eyebrow}</p>
    <h2 className={`font-display text-4xl sm:text-5xl leading-[1.05] tracking-tight ${light ? "text-white" : "text-[#252525]"}`}>{title}</h2>
    {children && <p className={`mt-5 text-base leading-relaxed ${light ? "text-white/70" : "text-stone-600"}`}>{children}</p>}
  </Reveal>
);

export const PageHero = ({ eyebrow, title, children, art }) => (
  <section className="relative pt-32 pb-16 px-6 md:px-12 lg:px-24 overflow-hidden border-b border-stone-200">
    {art && <img src={art} alt="" aria-hidden className="absolute right-0 top-10 h-[120%] max-w-[55%] object-cover opacity-[0.12] art-wash pointer-events-none hidden md:block" />}
    <div className="relative max-w-3xl">
      <p className="eyebrow text-[#E87524] mb-4">{eyebrow}</p>
      <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl leading-[1.02] tracking-tight">{title}</h1>
      {children && <div className="mt-6 text-stone-600 text-base md:text-lg leading-relaxed">{children}</div>}
    </div>
  </section>
);

export const FortCard = ({ f, list = false, i = 0 }) => {
  if (list) {
    return (
      <Link to={`/forts/${f.slug}`} data-testid={`fort-card-${f.slug}`} className="group grid grid-cols-[120px_1fr_auto] md:grid-cols-[180px_1fr_auto] gap-6 items-center py-5 border-b border-stone-200 img-zoom">
        <div className="aspect-[4/3] overflow-hidden bg-stone-100"><img src={f.hero_image} alt={f.name} loading="lazy" className="w-full h-full object-cover" /></div>
        <div>
          <TypeTag type={f.type} />
          <h3 className="font-display text-2xl mt-1 group-hover:text-[#E87524] transition-colors">{f.name}</h3>
          <p className="text-sm text-stone-500">{f.district} · {f.region}</p>
          <p className="text-sm text-stone-600 mt-2 line-clamp-2 hidden md:block">{f.summary}</p>
        </div>
        <ArrowUpRight className="w-5 h-5 text-[#E87524] group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
      </Link>
    );
  }
  return (
    <Reveal delay={(i % 3) * 0.08}>
      <article data-testid={`fort-card-${f.slug}`} className="group bg-white border border-stone-200 hover:border-stone-400 transition-colors h-full flex flex-col">
        <Link to={`/forts/${f.slug}`} className="block aspect-[4/3] overflow-hidden bg-stone-100 img-zoom relative">
          <img src={f.hero_image} alt={f.name} loading="lazy" className="w-full h-full object-cover" />
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1"><TypeTag type={f.type} /></span>
        </Link>
        <div className="p-6 flex flex-col flex-1">
          <p className="text-xs uppercase tracking-[0.18em] text-stone-500">{f.district}</p>
          <h3 className="font-display text-2xl mt-2 leading-tight">{f.name}</h3>
          <p className="text-sm text-stone-600 mt-3 leading-relaxed line-clamp-3 flex-1">{f.summary}</p>
          <Link to={`/forts/${f.slug}`} data-testid={`fort-explore-${f.slug}`} className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] font-semibold text-[#E87524] group-hover:gap-3 transition-[gap]">
            Explore More <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </article>
    </Reveal>
  );
};

export const ArtBand = ({ src, caption, className = "" }) => (
  <figure className={`relative overflow-hidden ${className}`}>
    <img src={src} alt={caption || "Fort illustration"} loading="lazy" className="w-full h-full object-cover art-wash" />
    {caption && <figcaption className="absolute bottom-2 right-3 text-[10px] uppercase tracking-widest text-stone-500 bg-white/80 px-2 py-0.5">{caption}</figcaption>}
  </figure>
);

export const Loader = () => (
  <div className="min-h-[50vh] grid place-items-center" data-testid="page-loader">
    <div className="w-10 h-10 border-2 border-stone-200 border-t-[#E87524] rounded-full animate-spin" />
  </div>
);
