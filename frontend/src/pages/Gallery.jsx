import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, fileUrl } from "@/lib/api";
import { ART } from "@/lib/constants";
import { PageHero, SEO, Loader } from "@/components/common";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

const CATS = ["Aerial & Landscapes", "Historical & Archival", "Fort Architecture", "Trekking Routes", "Sunrise & Sunset", "Sea Forts", "Maps & Illustrations", "Community Contributions"];

export default function Gallery() {
  const [items, setItems] = useState(null);
  const [cat, setCat] = useState("");
  const [open, setOpen] = useState(null);
  useEffect(() => { api.get("/photos").then((r) => setItems(r.data)); }, []);
  const list = (items || []).filter((p) => !cat || p.category === cat);
  return (
    <div data-testid="gallery-page">
      <SEO title="Photography & Visual Archive" description="Photographs and illustrations of Maharashtra's forts with attribution, licensing and source details." />
      <PageHero eyebrow="Photography & visual archive" title="A museum of light and stone" art={ART.sea}>
        Every image carries its credit, licence and source. Images marked representative are evocative stock photographs that may not show a specific fort; illustrations are AI-generated artwork.
      </PageHero>
      <div className="px-6 md:px-12 lg:px-24 py-6 border-b border-stone-200 flex gap-2 overflow-x-auto no-scrollbar" data-testid="gallery-categories">
        <button onClick={() => setCat("")} className={`px-3 py-1.5 text-xs whitespace-nowrap border ${!cat ? "bg-[#252525] text-white border-[#252525]" : "border-stone-300"}`} data-testid="gallery-cat-all">All</button>
        {CATS.map((c) => <button key={c} onClick={() => setCat(c)} data-testid={`gallery-cat-${c.split(" ")[0].toLowerCase()}`} className={`px-3 py-1.5 text-xs whitespace-nowrap border ${cat === c ? "bg-[#252525] text-white border-[#252525]" : "border-stone-300 hover:border-[#E87524]"}`}>{c}</button>)}
      </div>
      {!items ? <Loader /> : (
        <div className="px-6 md:px-12 lg:px-24 py-14">
          {list.length === 0 && (
            <div className="border border-dashed border-stone-300 p-16 text-center" data-testid="gallery-empty">
              <p className="font-display text-2xl">{cat === "Historical & Archival" ? "Awaiting verified archival images" : "Nothing here yet"}</p>
              <p className="text-sm text-stone-500 mt-2">Have archival photographs with clear rights? <Link to="/contribute?type=photograph" className="text-[#E87524] underline">Submit them for review</Link>.</p>
            </div>
          )}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 [&>*]:mb-6">
            {list.map((p) => (
              <button key={p.photo_id} onClick={() => setOpen(p)} className="group block w-full text-left break-inside-avoid img-zoom" data-testid={`photo-${p.photo_id}`}>
                <div className="overflow-hidden bg-stone-100"><img src={fileUrl(p.url)} alt={p.title} loading="lazy" className="w-full" /></div>
                <p className="font-display text-lg mt-3 group-hover:text-[#E87524]">{p.title}</p>
                <p className="text-xs text-stone-500">{p.category} · {p.credit}</p>
              </button>
            ))}
          </div>
        </div>
      )}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-5xl p-0 rounded-none border-0" data-testid="photo-lightbox">
          <DialogTitle className="sr-only">{open?.title}</DialogTitle>
          {open && <><img src={fileUrl(open.url)} alt={open.title} className="w-full max-h-[75vh] object-contain bg-black" />
            <div className="p-5 grid sm:grid-cols-4 gap-4 text-xs" data-testid="photo-attribution">
              <div><p className="eyebrow text-stone-400">Title</p><p className="mt-1">{open.title}</p></div>
              <div><p className="eyebrow text-stone-400">Credit</p><p className="mt-1">{open.credit}</p></div>
              <div><p className="eyebrow text-stone-400">Licence</p><p className="mt-1">{open.license}</p></div>
              <div><p className="eyebrow text-stone-400">Source</p><p className="mt-1">{open.source ? <a href={open.source} target="_blank" rel="noreferrer" className="underline">{open.source}</a> : "—"}</p></div>
              {open.representative && <p className="sm:col-span-4 text-amber-700">Representative image — location not independently verified.</p>}
            </div></>}
        </DialogContent>
      </Dialog>
    </div>
  );
}
