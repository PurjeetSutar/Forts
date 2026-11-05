import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { ART } from "@/lib/constants";
import { PageHero, SEO, StatusBadge, Reveal, Loader } from "@/components/common";

const CATS = ["Untold Stories", "Stories of Chhatrapati Shivaji Maharaj", "Maratha Military Strategy", "Historic Battles & Sieges",
  "Fort Architecture & Engineering", "Legends, Folklore & Local Traditions", "Historical Personalities", "Conservation & Restoration"];

export default function Stories() {
  const [items, setItems] = useState(null);
  const [cat, setCat] = useState("");
  useEffect(() => { api.get("/stories").then((r) => setItems(r.data)); }, []);
  const list = (items || []).filter((s) => !cat || s.category === cat);
  const [lead, ...rest] = list;
  return (
    <div data-testid="stories-page">
      <SEO title="Stories & Historical Discoveries" description="Long-form stories on Maharashtra's forts — battles, architecture, personalities and folklore, with sources." />
      <PageHero eyebrow="Stories & historical discoveries" title="The chronicle of stone" art={ART.gate}>
        Long-form essays drawn from historical sources. Each story is tagged — documented, tradition, or a mix — so you always know what you're reading.
      </PageHero>
      <div className="px-6 md:px-12 lg:px-24 py-6 border-b border-stone-200 flex gap-2 overflow-x-auto no-scrollbar" data-testid="story-categories">
        <button onClick={() => setCat("")} className={`px-3 py-1.5 text-xs whitespace-nowrap border ${!cat ? "bg-[#252525] text-white border-[#252525]" : "border-stone-300"}`} data-testid="story-cat-all">All</button>
        {CATS.map((c) => <button key={c} onClick={() => setCat(c)} data-testid={`story-cat-${c.split(" ")[0].toLowerCase()}`} className={`px-3 py-1.5 text-xs whitespace-nowrap border ${cat === c ? "bg-[#252525] text-white border-[#252525]" : "border-stone-300 hover:border-[#E87524]"}`}>{c}</button>)}
      </div>
      {!items ? <Loader /> : (
        <div className="px-6 md:px-12 lg:px-24 py-16">
          {!lead && <p className="text-stone-500 py-20 text-center" data-testid="stories-empty">No stories in this category yet — historians and writers can <Link to="/contribute?type=story" className="text-[#E87524] underline">contribute one</Link>.</p>}
          {lead && (
            <Reveal>
              <Link to={`/stories/${lead.slug}`} className="group grid lg:grid-cols-12 gap-10 items-center img-zoom pb-16 border-b border-stone-200" data-testid={`story-card-${lead.slug}`}>
                <div className="lg:col-span-7 aspect-[16/10] overflow-hidden bg-stone-100"><img src={lead.cover} alt="" className="w-full h-full object-cover" /></div>
                <div className="lg:col-span-5">
                  <div className="flex gap-3 items-center flex-wrap"><p className="eyebrow text-stone-500">{lead.category}</p><StatusBadge status={lead.status} /></div>
                  <h2 className="font-display text-4xl md:text-5xl mt-4 leading-tight group-hover:text-[#E87524] transition-colors">{lead.title}</h2>
                  <p className="text-stone-600 mt-4 text-lg">{lead.excerpt}</p>
                  <p className="text-xs text-stone-400 mt-6 uppercase tracking-[0.18em]">{lead.read_time} min read</p>
                </div>
              </Link>
            </Reveal>
          )}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-14 pt-16">
            {rest.map((s, i) => (
              <Reveal key={s.slug} delay={(i % 3) * 0.08}>
                <Link to={`/stories/${s.slug}`} className="group block img-zoom" data-testid={`story-card-${s.slug}`}>
                  <div className="aspect-[4/3] overflow-hidden bg-stone-100"><img src={s.cover} alt="" loading="lazy" className="w-full h-full object-cover" /></div>
                  <div className="flex gap-3 items-center mt-5 flex-wrap"><p className="eyebrow text-stone-500">{s.category}</p><StatusBadge status={s.status} /></div>
                  <h3 className="font-display text-2xl mt-2 group-hover:text-[#E87524] transition-colors">{s.title}</h3>
                  <p className="text-sm text-stone-600 mt-2">{s.excerpt}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
