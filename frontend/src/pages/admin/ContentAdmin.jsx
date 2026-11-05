import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl, formatErr, uploadImage } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AdminH } from "@/pages/admin/Overview";
import JsonEditor from "@/pages/admin/JsonEditor";

const STORY_TEMPLATE = { title: "", slug: "", category: "Untold Stories", excerpt: "", cover: "", read_time: 5, status: "documented", featured: false, published: true,
  fort_slugs: [], body: [{ type: "p", text: "" }, { type: "h", text: "" }, { type: "quote", text: "" }], timeline: [], sources: [{ title: "", publisher: "", url: "" }] };

export function StoriesAdmin() {
  const [list, setList] = useState([]);
  const [edit, setEdit] = useState(null);
  const [val, setVal] = useState(null);
  const load = () => api.get("/admin/stories").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const save = async () => {
    if (!val) return toast.error("Fix the JSON first");
    try {
      if (edit.slug) await api.put(`/admin/stories/${edit.slug}`, val); else await api.post("/admin/stories", val);
      toast.success("Story saved"); setEdit(null); load();
    } catch (e) { toast.error(formatErr(e)); }
  };
  const del = async (slug) => { if (!window.confirm("Delete story?")) return; await api.delete(`/admin/stories/${slug}`); load(); };
  const open = (s) => { const { _id, ...rest } = s; setEdit(s); setVal(rest); };
  return (
    <div data-testid="admin-stories">
      <AdminH title="Articles & stories"><button onClick={() => { setEdit({}); setVal(STORY_TEMPLATE); }} className="px-4 py-2 bg-[#E87524] text-white text-sm inline-flex items-center gap-1" data-testid="admin-add-story"><Plus className="w-4 h-4" />New story</button></AdminH>
      <div className="bg-white border border-stone-200 divide-y">
        {list.map((s) => (
          <div key={s.slug} className="flex items-center gap-4 p-4" data-testid={`admin-story-${s.slug}`}>
            <img src={s.cover} alt="" className="w-16 h-12 object-cover" />
            <div className="flex-1"><p className="font-medium">{s.title}</p><p className="text-xs text-stone-500">{s.category} · {s.status} · {s.published ? "published" : "draft"}</p></div>
            <button onClick={() => open(s)} aria-label="Edit" className="p-1.5 hover:text-[#E87524]"><Pencil className="w-4 h-4" /></button>
            <button onClick={() => del(s.slug)} aria-label="Delete" className="p-1.5 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
      {edit && (
        <Dialog open onOpenChange={(o) => !o && setEdit(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto rounded-none" data-testid="story-editor">
            <DialogHeader><DialogTitle className="font-display">{edit.slug ? "Edit story" : "New story"}</DialogTitle></DialogHeader>
            <p className="text-xs text-stone-500">Body blocks: type "p" (paragraph), "h" (heading), "quote", "img" (with url). Status: documented / tradition / mixed.</p>
            <JsonEditor value={val} onChange={setVal} rows={24} testid="story-json" />
            <button onClick={save} className="px-5 py-2 bg-[#E87524] text-white text-sm self-end" data-testid="story-save">Save story</button>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

const PHOTO_CATS = ["Aerial & Landscapes", "Historical & Archival", "Fort Architecture", "Trekking Routes", "Sunrise & Sunset", "Sea Forts", "Maps & Illustrations", "Community Contributions"];

export function PhotosAdmin() {
  const [list, setList] = useState([]);
  const [form, setForm] = useState({ title: "", url: "", category: PHOTO_CATS[0], credit: "", license: "", source: "", fort_slug: "" });
  const ref = useRef();
  const load = () => api.get("/admin/photos").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const up = async (e) => { const f = e.target.files?.[0]; if (!f) return; try { const r = await uploadImage(f); setForm((x) => ({ ...x, url: r.url })); } catch (err) { toast.error(formatErr(err)); } };
  const add = async () => {
    if (!form.credit || !form.license) return toast.error("Credit and licence are required for every photograph");
    try { await api.post("/admin/photos", { ...form, fort_slug: form.fort_slug || null }); toast.success("Photo added"); setForm((f) => ({ ...f, title: "", url: "" })); load(); } catch (e) { toast.error(formatErr(e)); }
  };
  const del = async (id) => { await api.delete(`/admin/photos/${id}`); load(); };
  return (
    <div data-testid="admin-photos">
      <AdminH title="Photographs & visual archive" />
      <div className="bg-white border border-stone-200 p-5 grid md:grid-cols-4 gap-3 mb-8" data-testid="admin-photo-form">
        <Input placeholder="Title" value={form.title} onChange={set("title")} className="rounded-none" data-testid="photo-title" />
        <div className="flex gap-1 md:col-span-2"><Input placeholder="Image URL or upload" value={form.url} onChange={set("url")} className="rounded-none" data-testid="photo-url" />
          <input ref={ref} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={up} /><button onClick={() => ref.current.click()} className="px-3 border border-stone-300" aria-label="Upload" data-testid="photo-upload"><Upload className="w-4 h-4" /></button></div>
        <select value={form.category} onChange={set("category")} className="border border-stone-300 h-10 px-2 text-sm">{PHOTO_CATS.map((c) => <option key={c}>{c}</option>)}</select>
        <Input placeholder="Credit / photographer" value={form.credit} onChange={set("credit")} className="rounded-none" data-testid="photo-credit" />
        <Input placeholder="Licence (e.g. CC BY-SA 4.0)" value={form.license} onChange={set("license")} className="rounded-none" data-testid="photo-license" />
        <Input placeholder="Source URL" value={form.source} onChange={set("source")} className="rounded-none" />
        <Input placeholder="Fort slug (optional)" value={form.fort_slug} onChange={set("fort_slug")} className="rounded-none" />
        <button onClick={add} disabled={!form.title || !form.url} className="md:col-span-4 py-2.5 bg-[#E87524] text-white text-sm disabled:opacity-40" data-testid="photo-add">Add photograph</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {list.map((p) => (
          <div key={p.photo_id} className="bg-white border border-stone-200 relative group">
            <img src={fileUrl(p.url)} alt="" className="w-full aspect-square object-cover" />
            <p className="text-xs p-2 truncate">{p.title}</p>
            <button onClick={() => del(p.photo_id)} className="absolute top-1 right-1 bg-white p-1 opacity-0 group-hover:opacity-100" aria-label="Delete photo"><Trash2 className="w-3.5 h-3.5 text-red-600" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}
