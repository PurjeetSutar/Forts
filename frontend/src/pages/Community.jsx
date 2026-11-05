import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageSquare, HelpCircle, Mountain } from "lucide-react";
import { api } from "@/lib/api";
import { ART } from "@/lib/constants";
import { PageHero, SEO, FortCard, Loader } from "@/components/common";

const KIND = { comment: ["Comment", MessageSquare], question: ["Question", HelpCircle], experience: ["Trek experience", Mountain] };

export default function Community() {
  const [data, setData] = useState(null);
  const [kind, setKind] = useState("");
  useEffect(() => { api.get("/community/recent", { params: kind ? { kind } : {} }).then((r) => setData(r.data)); }, [kind]);
  return (
    <div data-testid="community-page">
      <SEO title="Community" description="Recent discussions, trekking experiences and recommended forts from the Forts of Maharashtra community." />
      <PageHero eyebrow="Community" title="Voices from the ramparts" art={ART.hill}>
        Travellers, trekkers and historians sharing what they've seen. Every fort page has its own discussion — sign in to post, reply and appreciate helpful contributions.
      </PageHero>
      <div className="px-6 md:px-12 lg:px-24 py-14 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7">
          <div className="flex gap-2 mb-8">
            {[["", "All"], ["experience", "Experiences"], ["question", "Questions"], ["comment", "Comments"]].map(([k, l]) => (
              <button key={l} onClick={() => setKind(k)} data-testid={`community-filter-${l.toLowerCase()}`} className={`px-3 py-1.5 text-xs border ${kind === k ? "bg-[#252525] text-white border-[#252525]" : "border-stone-300"}`}>{l}</button>
            ))}
          </div>
          {!data ? <Loader /> : data.items.length === 0 ? (
            <div className="border border-dashed border-stone-300 p-12 text-center" data-testid="community-empty"><p className="font-display text-2xl">No discussions yet</p><p className="text-sm text-stone-500 mt-2">Open any <Link to="/forts" className="text-[#E87524] underline">fort page</Link> to start one.</p></div>
          ) : (
            <ul data-testid="community-list">
              {data.items.map((c) => {
                const [label, Icon] = KIND[c.kind] || KIND.comment;
                return (
                  <li key={c.comment_id} className="py-6 border-b border-stone-200">
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-[#E87524] uppercase tracking-[0.15em] inline-flex items-center gap-1"><Icon className="w-3.5 h-3.5" />{label}</span>
                      <span className="text-stone-400">on</span>
                      <Link to={`/forts/${c.fort_slug}#discussion`} className="font-display text-base hover:text-[#E87524]">{c.fort_name}</Link>
                    </div>
                    <p className="mt-2 text-[15px] leading-relaxed line-clamp-3">{c.text}</p>
                    <div className="flex gap-4 mt-2 text-xs text-stone-500">
                      <Link to={`/users/${c.user_id}`} className="font-semibold text-stone-700 hover:text-[#E87524]">{c.user_name}</Link>
                      <span>{new Date(c.created_at).toLocaleDateString()}</span>
                      <span className="inline-flex items-center gap-1"><Heart className="w-3 h-3" />{c.like_count}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <aside className="lg:col-span-4 lg:col-start-9">
          <p className="eyebrow text-[#E87524] mb-6">Most explored by the community</p>
          <div className="space-y-6">{data?.recommended.map((f, i) => <FortCard key={f.slug} f={f} list i={i} />)}</div>
        </aside>
      </div>
    </div>
  );
}
