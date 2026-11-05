import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { api } from "@/lib/api";
import { SEO, StatusBadge, Loader, Reveal } from "@/components/common";
import { ShareButtons } from "@/components/Actions";

function Block({ b, first }) {
  if (b.type === "h") return <h2 className="font-display text-3xl mt-14 mb-4">{b.text}</h2>;
  if (b.type === "quote") return <blockquote className="my-12 border-l-4 border-[#E87524] pl-6 font-display italic text-2xl md:text-3xl text-[#E87524] leading-snug">{b.text}</blockquote>;
  if (b.type === "img") return <figure className="my-12 -mx-6 md:-mx-24"><img src={b.url} alt={b.text} className="w-full" /><figcaption className="text-xs text-stone-500 mt-2 px-6">{b.text}</figcaption></figure>;
  return <p className={`text-[18px] leading-[1.85] text-stone-700 mb-6 ${first ? "dropcap" : ""}`}>{b.text}</p>;
}

export default function StoryDetail() {
  const { slug } = useParams();
  const [s, setS] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { api.get(`/stories/${slug}`).then((r) => setS(r.data)).catch(() => setErr(true)); }, [slug]);
  if (err) return <div className="pt-40 text-center pb-24" data-testid="story-not-found"><h1 className="font-display text-4xl">Story not found</h1></div>;
  if (!s) return <div className="pt-24"><Loader /></div>;
  const firstP = s.body.findIndex((b) => b.type === "p");
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: s.title, image: s.cover, author: { "@type": "Organization", name: s.author }, datePublished: s.created_at };
  return (
    <article data-testid="story-detail-page">
      <SEO title={s.title} description={s.excerpt} image={s.cover} jsonLd={jsonLd} />
      <header className="relative h-[80svh] min-h-[520px] bg-[#252525] overflow-hidden grain">
        <img src={s.cover} alt="" className="absolute inset-0 w-full h-full object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />
        <div className="relative z-10 h-full flex flex-col justify-end px-6 md:px-12 lg:px-24 pb-16 text-white max-w-5xl">
          <Reveal>
            <div className="flex gap-3 items-center flex-wrap"><p className="eyebrow text-[#E87524]">{s.category}</p><StatusBadge status={s.status} /></div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl mt-4 leading-[1.05]" data-testid="story-title">{s.title}</h1>
            <p className="mt-5 text-white/80 text-lg max-w-2xl">{s.excerpt}</p>
            <p className="mt-6 text-xs uppercase tracking-[0.2em] text-white/60">{s.author} · {s.read_time} min read</p>
          </Reveal>
        </div>
      </header>
      <div className="px-6 md:px-12 lg:px-24 py-20 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 lg:col-start-2 max-w-2xl" data-testid="story-body">
          {s.body.map((b, i) => <Block key={i} b={b} first={i === firstP} />)}
          <div className="mt-14 pt-8 border-t border-stone-200"><ShareButtons title={s.title} /></div>
        </div>
        <aside className="lg:col-span-3 lg:col-start-10 space-y-10 lg:sticky lg:top-24 self-start">
          {s.timeline?.length > 0 && (
            <div data-testid="story-timeline">
              <p className="eyebrow text-[#E87524] mb-4">Timeline</p>
              <ol className="border-l border-stone-300">
                {s.timeline.map((e, i) => <li key={i} className="pl-5 pb-5 relative"><span className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-[#E87524]" /><p className="font-display text-lg">{e.year}</p><p className="text-sm font-semibold">{e.title}</p><p className="text-xs text-stone-500">{e.desc}</p></li>)}
              </ol>
            </div>
          )}
          {s.fort_slugs?.length > 0 && <div><p className="eyebrow text-stone-400 mb-3">Forts in this story</p>{s.fort_slugs.map((f) => <Link key={f} to={`/forts/${f}`} className="block text-sm py-1.5 border-b border-stone-200 capitalize hover:text-[#E87524]" data-testid={`story-fort-${f}`}>{f.replace(/-/g, " ")}</Link>)}</div>}
          <div data-testid="story-sources">
            <p className="eyebrow text-stone-400 mb-3">Sources</p>
            {s.sources?.map((r, i) => <a key={i} href={r.url} target="_blank" rel="noreferrer" className="block text-sm py-1.5 hover:text-[#E87524]">{r.title} <ArrowUpRight className="inline w-3 h-3" /><span className="block text-xs text-stone-400">{r.publisher}</span></a>)}
          </div>
        </aside>
      </div>
    </article>
  );
}
