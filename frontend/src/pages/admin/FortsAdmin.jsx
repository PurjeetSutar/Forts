import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, ImagePlus } from "lucide-react";
import { toast } from "sonner";
import { api, formatErr, uploadImage } from "@/lib/api";
import { FORT_TYPES } from "@/lib/constants";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { AdminH } from "@/pages/admin/Overview";
import JsonEditor from "@/pages/admin/JsonEditor";

const BASIC = [["name", "Name"], ["slug", "Slug (URL)"], ["district", "District"], ["region", "Region"], ["type", "Type"], ["lat", "Latitude"], ["lng", "Longitude"],
  ["period", "Period"], ["difficulty", "Difficulty"], ["accessibility", "Accessibility"], ["popularity", "Popularity"], ["condition", "Condition"], ["hero_image", "Hero image URL"], ["verification", "Verification"]];
const ADV_KEYS = ["alt_names", "summary", "history", "shivaji_association", "associations", "events", "strategic_importance", "architecture", "structures", "facts", "legends", "conservation", "travel", "references", "gallery", "elevation_m"];

const TEMPLATE = { alt_names: [], summary: "", history: [""], shivaji_association: "", associations: [], events: [{ year: "", title: "", desc: "", status: "documented" }],
  strategic_importance: "", architecture: "", structures: [{ name: "", desc: "" }], facts: [], legends: [], conservation: "",
  travel: { nearest_city: "", railway: "", bus: "", road_access: "", trek_distance: "", trek_duration: "", best_season: "", time_required: "", entry_fee: "", food_water: "", accommodation: "", local_guides: "", note: "Travel details are approximate guidance. Verify locally before visiting." },
  references: [{ title: "", publisher: "", url: "" }], gallery: [], elevation_m: null };

function Editor({ initial, onClose, onSaved, settings }) {
  const isNew = !initial.slug;
  const [basic, setBasic] = useState(() => Object.fromEntries(BASIC.map(([k]) => [k, initial[k] ?? (k === "type" ? "Hill Fort" : "")])));
  const [flags, setFlags] = useState({ featured: !!initial.featured, published: initial.published !== false });
  const [adv, setAdv] = useState(() => Object.fromEntries(ADV_KEYS.map((k) => [k, initial[k] ?? TEMPLATE[k]])));
  const [busy, setBusy] = useState(false);
  const [jsonKey, setJsonKey] = useState(0);
  const fileRef = useRef();
  const set = (k) => (e) => setBasic((b) => ({ ...b, [k]: e.target.value }));

  const addPhoto = async (e) => {
    const f = e.target.files?.[0];
    if (!f || !adv) return;
    try {
      const r = await uploadImage(f);
      const url = r.url;
      setAdv((a) => ({ ...a, gallery: [...(a.gallery || []), { url, credit: "", license: "", source: "", representative: false }] }));
      setJsonKey((k) => k + 1);
      if (!basic.hero_image) setBasic((b) => ({ ...b, hero_image: url }));
      toast.success("Photo uploaded — add credit & licence in the gallery JSON");
    } catch (err) { toast.error(formatErr(err)); }
  };
  const save = async () => {
    if (!adv) return toast.error("Fix the JSON first");
    setBusy(true);
    const body = { ...adv, ...basic, ...flags };
    try {
      if (isNew) await api.post("/admin/forts", body); else await api.put(`/admin/forts/${initial.slug}`, body);
      toast.success("Saved"); onSaved();
    } catch (err) { toast.error(formatErr(err)); }
    setBusy(false);
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto rounded-none" data-testid="fort-editor">
        <DialogHeader><DialogTitle className="font-display text-2xl">{isNew ? "Add fort" : `Edit ${initial.name}`}</DialogTitle></DialogHeader>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BASIC.map(([k, l]) => (
            <div key={k}><label className="text-xs text-stone-500">{l}</label>
              {k === "type" || k === "district" || k === "region" ? (
                <select value={basic[k]} onChange={set(k)} className="w-full h-10 border border-stone-300 px-2 text-sm" data-testid={`fort-field-${k}`}>
                  <option value="">—</option>{(k === "type" ? FORT_TYPES : k === "district" ? settings?.districts || [] : settings?.regions || []).map((v) => <option key={v}>{v}</option>)}
                </select>
              ) : <Input value={basic[k]} onChange={set(k)} className="rounded-none" data-testid={`fort-field-${k}`} />}
            </div>
          ))}
        </div>
        <div className="flex gap-6 text-sm">
          {["featured", "published"].map((k) => <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={flags[k]} onChange={(e) => setFlags((f) => ({ ...f, [k]: e.target.checked }))} className="accent-[#E87524]" data-testid={`fort-flag-${k}`} />{k}</label>)}
          <input ref={fileRef} type="file" hidden accept="image/jpeg,image/png,image/webp" onChange={addPhoto} />
          <button onClick={() => fileRef.current.click()} className="inline-flex items-center gap-1 text-[#E87524]" data-testid="fort-upload-photo"><ImagePlus className="w-4 h-4" />Upload photo</button>
        </div>
        <div>
          <p className="text-xs text-stone-500 mb-1">Historical content, timeline (status: documented / tradition / needs_verification), structures, travel info, references & gallery</p>
          <JsonEditor key={jsonKey} value={adv} onChange={setAdv} rows={22} testid="fort-advanced-json" />
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 border border-stone-300 text-sm">Cancel</button>
          <button onClick={save} disabled={busy} className="px-5 py-2 bg-[#E87524] text-white text-sm disabled:opacity-50" data-testid="fort-editor-save">{busy ? "Saving…" : "Save fort"}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FortsAdmin() {
  const [list, setList] = useState([]);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);
  const [settings, setSettings] = useState(null);
  const load = () => api.get("/admin/forts", { params: { q } }).then((r) => setList(r.data));
  useEffect(() => { load(); }, [q]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { api.get("/settings").then((r) => setSettings(r.data)); }, []);
  const open = async (slug) => { const { data } = await api.get(`/admin/forts/${slug}`); setEditing(data); };
  const del = async (slug) => { if (!window.confirm(`Delete ${slug}? This cannot be undone.`)) return; await api.delete(`/admin/forts/${slug}`); toast.success("Deleted"); load(); };
  return (
    <div data-testid="admin-forts">
      <AdminH title={`Forts (${list.length})`}>
        <Input placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} className="rounded-none w-48 bg-white" data-testid="admin-forts-search" />
        <button onClick={() => setEditing({})} className="px-4 py-2 bg-[#E87524] text-white text-sm inline-flex items-center gap-1" data-testid="admin-add-fort"><Plus className="w-4 h-4" />Add fort</button>
      </AdminH>
      <div className="bg-white border border-stone-200">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>District</TableHead><TableHead>Type</TableHead><TableHead>Views</TableHead><TableHead>Status</TableHead><TableHead /></TableRow></TableHeader>
          <TableBody>
            {list.map((f) => (
              <TableRow key={f.slug} data-testid={`admin-fort-row-${f.slug}`}>
                <TableCell className="font-medium">{f.name}{f.featured && <span className="ml-2 text-[10px] text-[#E87524]">FEATURED</span>}</TableCell>
                <TableCell>{f.district}</TableCell><TableCell>{f.type}</TableCell><TableCell>{f.views}</TableCell>
                <TableCell>{f.published ? "Published" : "Draft"}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <button onClick={() => open(f.slug)} className="p-1.5 hover:text-[#E87524]" aria-label="Edit" data-testid={`admin-edit-${f.slug}`}><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => del(f.slug)} className="p-1.5 hover:text-red-600" aria-label="Delete" data-testid={`admin-delete-${f.slug}`}><Trash2 className="w-4 h-4" /></button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {editing && <Editor initial={editing} settings={settings} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
    </div>
  );
}
