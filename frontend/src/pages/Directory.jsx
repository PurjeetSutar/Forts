import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, List, Search, X, SlidersHorizontal } from "lucide-react";
import { api } from "@/lib/api";
import { ART } from "@/lib/constants";
import { FortCard, PageHero, SEO, Loader } from "@/components/common";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";

const FILTERS = [
  ["district", "District", "district"], ["region", "Region", "region"], ["type", "Fort type", "type"],
  ["period", "Historical period", "periods"], ["association", "Historical association", "associations"],
  ["difficulty", "Trek difficulty", "difficulty"], ["accessibility", "Accessibility", "accessibility"],
  ["popularity", "Tourist popularity", "popularity"], ["condition", "Current condition", "condition"],
];

function Filters({ facets, params, set }) {
  return (
    <div className="space-y-5" data-testid="directory-filters">
      {FILTERS.map(([key, label, fk]) => (
        <div key={key}>
          <label className="eyebrow text-stone-500 block mb-2">{label}</label>
          <Select value={params.get(key) || "all"} onValueChange={(v) => set(key, v === "all" ? "" : v)}>
            <SelectTrigger data-testid={`filter-${key}`} className="rounded-none border-stone-300 focus:ring-[#E87524]"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-none max-h-72">
              <SelectItem value="all">All</SelectItem>
              {(facets?.[fk] || []).map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  );
}

export default function Directory() {
  const [params, setParams] = useSearchParams();
  const [facets, setFacets] = useState(null);
  const [data, setData] = useState(null);
  const [view, setView] = useState("grid");
  const [q, setQ] = useState(params.get("q") || "");
  const page = Number(params.get("page") || 1);

  useEffect(() => { api.get("/forts/facets").then((r) => setFacets(r.data)); }, []);
  useEffect(() => {
    const p = Object.fromEntries(params.entries());
    api.get("/forts", { params: { ...p, limit: 12 } }).then((r) => setData(r.data));
  }, [params]);

  const set = (k, v) => {
    const n = new URLSearchParams(params);
    v ? n.set(k, v) : n.delete(k);
    if (k !== "page") n.delete("page");
    setParams(n);
  };
  const active = FILTERS.filter(([k]) => params.get(k)).concat(params.get("letter") ? [["letter", "Letter"]] : []).concat(params.get("q") ? [["q", "Search"]] : []);

  return (
    <div data-testid="directory-page">
      <SEO title="Fort Directory" description="Search and filter the documented forts of Maharashtra by district, region, type, period, difficulty and more." />
      <PageHero eyebrow="The directory" title="Every fort, documented with care" art={ART.hill}>
        A growing, verified and deduplicated archive. Filter by district, era, terrain and trek difficulty — then step inside each fort's full historical profile.
      </PageHero>

      <div className="px-6 md:px-12 lg:px-24 py-6 border-b border-stone-200 sticky top-16 bg-white/90 backdrop-blur-xl z-30">
        <div className="flex flex-wrap items-center gap-4">
          <form onSubmit={(e) => { e.preventDefault(); set("q", q); }} className="flex items-center flex-1 min-w-[240px] border-b border-stone-300 focus-within:border-[#E87524]">
            <Search className="w-4 h-4 text-stone-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, district, location or association" className="flex-1 px-3 py-2 outline-none bg-transparent text-sm" data-testid="directory-search-input" />
            <button className="text-xs uppercase tracking-[0.2em] text-[#E87524] font-semibold" data-testid="directory-search-btn">Search</button>
          </form>
          <Select value={params.get("sort") || "name"} onValueChange={(v) => set("sort", v)}>
            <SelectTrigger className="w-40 rounded-none border-stone-300" data-testid="directory-sort"><SelectValue /></SelectTrigger>
            <SelectContent className="rounded-none"><SelectItem value="name">A–Z</SelectItem><SelectItem value="popular">Most viewed</SelectItem></SelectContent>
          </Select>
          <div className="flex border border-stone-300">
            <button aria-label="Grid view" onClick={() => setView("grid")} data-testid="view-grid-btn" className={`p-2 ${view === "grid" ? "bg-[#252525] text-white" : ""}`}><LayoutGrid className="w-4 h-4" /></button>
            <button aria-label="List view" onClick={() => setView("list")} data-testid="view-list-btn" className={`p-2 ${view === "list" ? "bg-[#252525] text-white" : ""}`}><List className="w-4 h-4" /></button>
          </div>
          <Sheet>
            <SheetTrigger className="lg:hidden flex items-center gap-2 text-xs uppercase tracking-[0.2em] border border-stone-300 px-3 py-2" data-testid="mobile-filters-btn"><SlidersHorizontal className="w-4 h-4" />Filters</SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto rounded-none"><SheetTitle className="font-display mb-6">Filters</SheetTitle><Filters facets={facets} params={params} set={set} /></SheetContent>
          </Sheet>
        </div>
        <div className="flex flex-wrap gap-1 mt-4" data-testid="alphabet-bar">
          <button onClick={() => set("letter", "")} className={`px-2 h-7 text-xs ${!params.get("letter") ? "bg-[#E87524] text-white" : "hover:text-[#E87524]"}`} data-testid="letter-all">All</button>
          {"ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("").map((l) => {
            const has = facets?.letters?.includes(l);
            return <button key={l} disabled={!has} onClick={() => set("letter", l)} data-testid={`letter-${l}`}
              className={`w-7 h-7 text-xs font-display ${params.get("letter") === l ? "bg-[#E87524] text-white" : has ? "hover:text-[#E87524]" : "text-stone-300"}`}>{l}</button>;
          })}
        </div>
      </div>

      <div className="px-6 md:px-12 lg:px-24 py-12 grid lg:grid-cols-[260px_1fr] gap-12">
        <aside className="hidden lg:block sticky top-48 self-start max-h-[calc(100vh-13rem)] overflow-y-auto pr-2 no-scrollbar"><Filters facets={facets} params={params} set={set} /></aside>
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-8 text-sm">
            <span className="text-stone-500" data-testid="directory-count">{data ? `${data.total} fort${data.total === 1 ? "" : "s"}` : "…"}</span>
            {active.map(([k]) => (
              <button key={k} onClick={() => set(k, "")} className="inline-flex items-center gap-1 text-xs border border-stone-300 px-2 py-1 hover:border-[#E87524]" data-testid={`clear-${k}`}>
                {params.get(k)} <X className="w-3 h-3" />
              </button>
            ))}
            {active.length > 0 && <button onClick={() => { setQ(""); setParams({}); }} className="text-xs text-[#E87524] underline ml-2" data-testid="clear-all-filters">Clear all</button>}
          </div>
          {!data ? <Loader /> : data.items.length === 0 ? (
            <div className="py-24 text-center border border-dashed border-stone-300" data-testid="directory-empty">
              <p className="font-display text-2xl">No forts match these filters yet.</p>
              <p className="text-stone-500 mt-2 text-sm">Know a fort we haven't documented? <a href="/contribute" className="text-[#E87524] underline">Suggest a new entry</a>.</p>
            </div>
          ) : view === "grid" ? (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-8" data-testid="directory-grid">{data.items.map((f, i) => <FortCard key={f.slug} f={f} i={i} />)}</div>
          ) : (
            <div className="border-t border-stone-200" data-testid="directory-list">{data.items.map((f) => <FortCard key={f.slug} f={f} list />)}</div>
          )}
          {data && data.pages > 1 && (
            <div className="flex items-center gap-2 mt-14" data-testid="pagination">
              <button disabled={page <= 1} onClick={() => set("page", page - 1)} className="px-4 py-2 border border-stone-300 text-xs uppercase tracking-widest disabled:opacity-30" data-testid="page-prev">Prev</button>
              {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => set("page", p)} data-testid={`page-${p}`} className={`w-10 h-10 border text-sm ${p === page ? "bg-[#252525] text-white border-[#252525]" : "border-stone-300 hover:border-[#E87524]"}`}>{p}</button>
              ))}
              <button disabled={page >= data.pages} onClick={() => set("page", page + 1)} className="px-4 py-2 border border-stone-300 text-xs uppercase tracking-widest disabled:opacity-30" data-testid="page-next">Next</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
