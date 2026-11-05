import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { api, fileUrl } from "@/lib/api";
import { AdminH } from "@/pages/admin/Overview";

const Filter = ({ opts, v, set }) => opts.map(([k, l]) => (
  <button key={k} onClick={() => set(k)} data-testid={`admin-filter-${k || "all"}`} className={`px-3 py-1.5 text-xs border ${v === k ? "bg-[#252525] text-white border-[#252525]" : "border-stone-300 bg-white"}`}>{l}</button>
));

export function CommentsAdmin() {
  const [status, setStatus] = useState("pending");
  const [list, setList] = useState([]);
  const load = () => api.get("/admin/comments", { params: status ? { status } : {} }).then((r) => setList(r.data));
  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (id, s) => { await api.patch(`/admin/comments/${id}`, { status: s }); toast.success(`Marked ${s}`); load(); };
  const del = async (id) => { await api.delete(`/comments/${id}`); toast.success("Deleted"); load(); };
  return (
    <div data-testid="admin-comments">
      <AdminH title="Comment moderation"><Filter v={status} set={setStatus} opts={[["pending", "Pending"], ["reported", "Reported"], ["approved", "Approved"], ["hidden", "Hidden"], ["", "All"]]} /></AdminH>
      <div className="bg-white border border-stone-200 divide-y">
        {list.length === 0 && <p className="p-8 text-sm text-stone-500" data-testid="admin-comments-empty">Nothing to review.</p>}
        {list.map((c) => (
          <div key={c.comment_id} className="p-5" data-testid={`admin-comment-${c.comment_id}`}>
            <div className="flex flex-wrap gap-3 text-xs text-stone-500"><b className="text-[#252525]">{c.user_name}</b><span>on <Link to={`/forts/${c.fort_slug}`} className="underline">{c.fort_slug}</Link></span><span>{c.kind}</span><span>{new Date(c.created_at).toLocaleString()}</span><span className="uppercase">{c.status}</span>{c.report_count > 0 && <span className="text-red-600">{c.report_count} reports: {(c.report_reasons || []).join("; ")}</span>}</div>
            <p className="mt-2 text-sm">{c.text}</p>
            {c.images?.length > 0 && <div className="flex gap-2 mt-2">{c.images.map((u) => <img key={u} src={fileUrl(u)} alt="" className="w-20 h-20 object-cover" />)}</div>}
            <div className="flex gap-2 mt-3">
              <button onClick={() => act(c.comment_id, "approved")} className="px-3 py-1.5 text-xs bg-[#252525] text-white" data-testid="admin-comment-approve">Approve</button>
              <button onClick={() => act(c.comment_id, "hidden")} className="px-3 py-1.5 text-xs border border-stone-300" data-testid="admin-comment-hide">Hide</button>
              <button onClick={() => del(c.comment_id)} className="px-3 py-1.5 text-xs text-red-600 border border-red-200" data-testid="admin-comment-delete">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SubmissionsAdmin() {
  const [status, setStatus] = useState("pending");
  const [list, setList] = useState([]);
  const [notes, setNotes] = useState({});
  const load = () => api.get("/admin/submissions", { params: status ? { status } : {} }).then((r) => setList(r.data));
  useEffect(() => { load(); }, [status]); // eslint-disable-line react-hooks/exhaustive-deps
  const act = async (id, s) => { await api.patch(`/admin/submissions/${id}`, { status: s, admin_note: notes[id] || null }); toast.success(`Submission ${s}`); load(); };
  return (
    <div data-testid="admin-submissions">
      <AdminH title="Community submissions"><Filter v={status} set={setStatus} opts={[["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["", "All"]]} /></AdminH>
      <p className="text-xs text-stone-500 mb-4">Approving a photograph submission publishes its images to the archive. For historical info, corrections and new forts, apply the change in the Forts editor after verifying sources.</p>
      <div className="bg-white border border-stone-200 divide-y">
        {list.length === 0 && <p className="p-8 text-sm text-stone-500">Nothing to review.</p>}
        {list.map((s) => (
          <div key={s.submission_id} className="p-5" data-testid={`admin-submission-${s.submission_id}`}>
            <div className="flex flex-wrap gap-3 text-xs text-stone-500"><span className="uppercase tracking-widest text-[#E87524]">{s.type.replace("_", " ")}</span><b className="text-[#252525]">{s.user_name}</b><span>{s.user_email}</span><span>{s.contributor_role}</span>{s.fort_slug && <Link to={`/forts/${s.fort_slug}`} className="underline">{s.fort_slug}</Link>}<span className="uppercase">{s.status}</span></div>
            <p className="font-display text-xl mt-2">{s.title}</p>
            <p className="text-sm mt-1 whitespace-pre-line">{s.content}</p>
            {s.sources && <p className="text-xs text-stone-600 mt-2"><b>Sources:</b> {s.sources}</p>}
            {s.images?.length > 0 && <div className="flex gap-2 mt-2">{s.images.map((u) => <a key={u} href={fileUrl(u)} target="_blank" rel="noreferrer"><img src={fileUrl(u)} alt="" className="w-24 h-24 object-cover" /></a>)}</div>}
            <div className="flex flex-wrap gap-2 mt-3 items-center">
              <input placeholder="Note to contributor (optional)" value={notes[s.submission_id] || ""} onChange={(e) => setNotes((n) => ({ ...n, [s.submission_id]: e.target.value }))} className="border border-stone-300 px-2 h-8 text-xs flex-1 min-w-[200px]" />
              <button onClick={() => act(s.submission_id, "approved")} className="px-3 py-1.5 text-xs bg-[#252525] text-white" data-testid="admin-submission-approve">Approve</button>
              <button onClick={() => act(s.submission_id, "rejected")} className="px-3 py-1.5 text-xs border border-stone-300" data-testid="admin-submission-reject">Reject</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
