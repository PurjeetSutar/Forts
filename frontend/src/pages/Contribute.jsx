import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ImagePlus, X } from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl, formatErr, uploadImage } from "@/lib/api";
import { ART } from "@/lib/constants";
import { useAuth } from "@/context/AuthContext";
import { PageHero, SEO } from "@/components/common";
import { SignInPrompt } from "@/components/Actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const TYPES = [["historical_info", "Historical information"], ["correction", "Correction"], ["photograph", "Photographs"], ["story", "Forgotten story"], ["restoration", "Restoration update"], ["new_fort", "New fort entry"]];
const ROLES = ["Historian", "Researcher", "Photographer", "Trekker", "Local community member", "Other"];

export default function Contribute() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const [forts, setForts] = useState([]);
  const [form, setForm] = useState({ type: params.get("type") || "historical_info", fort_slug: params.get("fort") || "", title: "", content: "", sources: "", contributor_role: "Trekker" });
  const [imgs, setImgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef();
  useEffect(() => { api.get("/forts", { params: { limit: 500 } }).then((r) => setForts(r.data.items)); }, []);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));

  const addImg = async (e) => {
    const files = [...(e.target.files || [])].slice(0, 8 - imgs.length);
    setBusy(true);
    for (const f of files) { try { const r = await uploadImage(f); setImgs((x) => [...x, r]); } catch (err) { toast.error(formatErr(err)); } }
    setBusy(false); e.target.value = "";
  };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/submissions", { ...form, fort_slug: form.fort_slug || null, images: imgs.map((i) => i.path) });
      setDone(true); toast.success("Submitted for review — thank you!");
    } catch (err) { toast.error(formatErr(err)); }
    setBusy(false);
  };

  return (
    <div data-testid="contribute-page">
      <SEO title="Contribute" description="Submit historical information, corrections, photographs, stories and new fort entries for review." />
      <PageHero eyebrow="Contribute" title="Add to the record" art={ART.gate}>
        All submissions go through administrative review before publication. Please cite your sources — books, gazetteers, inscriptions, archives or first-hand observation.
      </PageHero>
      <section className="px-6 md:px-12 lg:px-24 py-16 max-w-4xl">
        {!user ? <SignInPrompt text="Sign in to submit a contribution" /> : done ? (
          <div className="border border-stone-200 p-10" data-testid="contribute-success">
            <h2 className="font-display text-3xl">Thank you for contributing.</h2>
            <p className="text-stone-600 mt-3">Your submission is pending review. You can track its status from your profile.</p>
            <button onClick={() => { setDone(false); setImgs([]); setForm((f) => ({ ...f, title: "", content: "", sources: "" })); }} className="mt-6 px-5 py-3 border border-[#252525] text-xs uppercase tracking-[0.2em]" data-testid="contribute-another">Submit another</button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-8" data-testid="contribute-form">
            <div className="grid md:grid-cols-3 gap-6">
              <div><label className="eyebrow text-stone-500 block mb-2">Type</label>
                <Select value={form.type} onValueChange={set("type")}><SelectTrigger className="rounded-none" data-testid="contribute-type"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-none">{TYPES.map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="eyebrow text-stone-500 block mb-2">Fort</label>
                <Select value={form.fort_slug || "none"} onValueChange={(v) => set("fort_slug")(v === "none" ? "" : v)}><SelectTrigger className="rounded-none" data-testid="contribute-fort"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-none max-h-72"><SelectItem value="none">Not listed / general</SelectItem>{forts.map((f) => <SelectItem key={f.slug} value={f.slug}>{f.name}</SelectItem>)}</SelectContent></Select></div>
              <div><label className="eyebrow text-stone-500 block mb-2">I am a</label>
                <Select value={form.contributor_role} onValueChange={set("contributor_role")}><SelectTrigger className="rounded-none" data-testid="contribute-role"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-none">{ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select></div>
            </div>
            <div><label className="eyebrow text-stone-500 block mb-2">Title</label><Input required minLength={3} value={form.title} onChange={set("title")} className="rounded-none" data-testid="contribute-title" placeholder={form.type === "new_fort" ? "Fort name and district" : "Short summary"} /></div>
            <div><label className="eyebrow text-stone-500 block mb-2">Details</label><Textarea required minLength={10} value={form.content} onChange={set("content")} className="rounded-none min-h-[180px]" data-testid="contribute-content" placeholder={form.type === "new_fort" ? "Location, coordinates if known, type, history with sources…" : "Describe the information, correction or story"} /></div>
            <div><label className="eyebrow text-stone-500 block mb-2">Sources & references</label><Textarea value={form.sources} onChange={set("sources")} className="rounded-none" data-testid="contribute-sources" placeholder="Book titles, page numbers, gazetteer volumes, URLs, inscriptions…" /></div>
            <div>
              <label className="eyebrow text-stone-500 block mb-2">Photographs (optional, up to 8)</label>
              <div className="flex flex-wrap gap-3">
                {imgs.map((i) => <div key={i.path} className="relative"><img src={fileUrl(i.url)} alt="" className="w-24 h-24 object-cover" /><button type="button" onClick={() => setImgs((x) => x.filter((y) => y.path !== i.path))} className="absolute top-1 right-1 bg-white p-0.5"><X className="w-3 h-3" /></button></div>)}
                <input ref={ref} type="file" hidden multiple accept="image/jpeg,image/png,image/webp" onChange={addImg} data-testid="contribute-file-input" />
                <button type="button" onClick={() => ref.current.click()} disabled={busy} className="w-24 h-24 border border-dashed border-stone-300 grid place-items-center text-stone-400 hover:border-[#E87524] hover:text-[#E87524]" data-testid="contribute-add-photo"><ImagePlus className="w-6 h-6" /></button>
              </div>
              <p className="text-xs text-stone-500 mt-2">By uploading you confirm you own the photographs or have permission to share them.</p>
            </div>
            <button disabled={busy} className="px-8 py-4 bg-[#E87524] text-white text-xs uppercase tracking-[0.2em] hover:bg-[#cf661d] disabled:opacity-50" data-testid="contribute-submit">{busy ? "Working…" : "Submit for review"}</button>
          </form>
        )}
      </section>
    </div>
  );
}
