import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Flag, MessageSquare, ImagePlus, X, HelpCircle, Mountain, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl, formatErr, uploadImage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { SignInPrompt } from "@/components/Actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

const KINDS = { comment: { label: "Comment", Icon: MessageSquare }, question: { label: "Question", Icon: HelpCircle }, experience: { label: "Trek experience", Icon: Mountain } };

function Composer({ slug, parentId, onDone, compact }) {
  const [text, setText] = useState("");
  const [kind, setKind] = useState("comment");
  const [imgs, setImgs] = useState([]);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef();
  const addFile = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setBusy(true);
    try { const r = await uploadImage(f); setImgs((x) => [...x, r]); } catch (err) { toast.error(formatErr(err)); }
    setBusy(false);
    e.target.value = "";
  };
  const submit = async () => {
    if (text.trim().length < 2) return;
    setBusy(true);
    try {
      const { data } = await api.post(`/forts/${slug}/comments`, { text, kind: parentId ? "comment" : kind, parent_id: parentId, images: imgs.map((i) => i.path) });
      setText(""); setImgs([]);
      toast.success(data.status === "pending" ? "Thanks! Your post will appear after moderation." : "Posted");
      onDone?.();
    } catch (err) { toast.error(formatErr(err)); }
    setBusy(false);
  };
  return (
    <div className={`border border-stone-300 bg-white ${compact ? "mt-3" : ""}`} data-testid={parentId ? "reply-composer" : "comment-composer"}>
      {!parentId && (
        <div className="flex border-b border-stone-200 text-xs">
          {Object.entries(KINDS).map(([k, { label, Icon }]) => (
            <button key={k} onClick={() => setKind(k)} data-testid={`composer-kind-${k}`} className={`px-4 py-2.5 inline-flex items-center gap-2 uppercase tracking-[0.15em] ${kind === k ? "bg-[#252525] text-white" : "hover:text-[#E87524]"}`}><Icon className="w-3.5 h-3.5" />{label}</button>
          ))}
        </div>
      )}
      <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={parentId ? "Write a reply…" : "Share your experience, ask a question or add a helpful tip…"} className="border-0 rounded-none focus-visible:ring-0 min-h-[90px]" data-testid="composer-textarea" />
      {imgs.length > 0 && <div className="flex gap-2 px-3">{imgs.map((i) => <div key={i.path} className="relative"><img src={fileUrl(i.url)} alt="" className="w-16 h-16 object-cover" /><button onClick={() => setImgs((x) => x.filter((y) => y.path !== i.path))} className="absolute -top-1 -right-1 bg-white rounded-full"><X className="w-3 h-3" /></button></div>)}</div>}
      <div className="flex items-center justify-between p-3">
        {!parentId ? (
          <>
            <input type="file" accept="image/jpeg,image/png,image/webp" ref={fileRef} hidden onChange={addFile} data-testid="composer-file-input" />
            <button onClick={() => fileRef.current.click()} disabled={busy || imgs.length >= 4} className="text-xs inline-flex items-center gap-2 text-stone-600 hover:text-[#E87524]" data-testid="composer-add-photo"><ImagePlus className="w-4 h-4" />Add photo (reviewed before publishing)</button>
          </>
        ) : <span />}
        <button onClick={submit} disabled={busy || text.trim().length < 2} className="px-5 py-2 bg-[#E87524] text-white text-xs uppercase tracking-[0.2em] disabled:opacity-40 hover:bg-[#cf661d]" data-testid="composer-submit">{busy ? "…" : parentId ? "Reply" : "Post"}</button>
      </div>
    </div>
  );
}

function CommentItem({ c, slug, reload, onReport, depth = 0 }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(c.liked);
  const [likes, setLikes] = useState(c.like_count);
  const [replying, setReplying] = useState(false);
  const K = KINDS[c.kind] || KINDS.comment;
  const like = async () => {
    if (!user) return toast("Sign in to appreciate contributions");
    const { data } = await api.post(`/comments/${c.comment_id}/like`);
    setLiked(data.liked); setLikes(data.like_count);
  };
  const del = async () => { await api.delete(`/comments/${c.comment_id}`); reload(); };
  return (
    <li className={depth ? "pl-6 border-l border-stone-200 mt-5" : "py-7 border-b border-stone-200"} data-testid={`comment-${c.comment_id}`}>
      <div className="flex items-center gap-3">
        {c.user_picture ? <img src={c.user_picture} alt="" className="w-8 h-8 rounded-full" /> : <span className="w-8 h-8 rounded-full bg-[#252525] text-white text-xs grid place-items-center">{c.user_name?.[0]}</span>}
        <Link to={`/users/${c.user_id}`} className="text-sm font-semibold hover:text-[#E87524]" data-testid="comment-author">{c.user_name}</Link>
        {!depth && <span className="text-[10px] uppercase tracking-[0.15em] text-[#E87524] inline-flex items-center gap-1"><K.Icon className="w-3 h-3" />{K.label}</span>}
        <span className="text-xs text-stone-400">{new Date(c.created_at).toLocaleDateString()}</span>
      </div>
      <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line" data-testid="comment-text">{c.text}</p>
      {c.images?.length > 0 && <div className="flex gap-2 mt-3">{c.images.map((u) => <a key={u} href={fileUrl(u)} target="_blank" rel="noreferrer"><img src={fileUrl(u)} alt="Visitor photograph" className="w-28 h-28 object-cover" /></a>)}</div>}
      <div className="flex gap-5 mt-3 text-xs text-stone-500">
        <button onClick={like} className={`inline-flex items-center gap-1 hover:text-[#E87524] ${liked ? "text-[#E87524]" : ""}`} data-testid="comment-like-btn"><Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />{likes} helpful</button>
        {depth < 2 && <button onClick={() => (user ? setReplying(!replying) : toast("Sign in to reply"))} className="hover:text-[#E87524]" data-testid="comment-reply-btn">Reply</button>}
        <button onClick={() => (user ? onReport(c) : toast("Sign in to report"))} className="inline-flex items-center gap-1 hover:text-red-600" data-testid="comment-report-btn"><Flag className="w-3.5 h-3.5" />Report</button>
        {user && (user.user_id === c.user_id || user.role === "admin") && <button onClick={del} className="inline-flex items-center gap-1 hover:text-red-600" data-testid="comment-delete-btn"><Trash2 className="w-3.5 h-3.5" />Delete</button>}
      </div>
      {replying && <Composer slug={slug} parentId={c.comment_id} compact onDone={() => { setReplying(false); reload(); }} />}
      {c.replies?.length > 0 && <ul>{c.replies.map((r) => <CommentItem key={r.comment_id} c={r} slug={slug} reload={reload} onReport={onReport} depth={depth + 1} />)}</ul>}
    </li>
  );
}

export default function Comments({ slug }) {
  const { user } = useAuth();
  const [data, setData] = useState({ items: [], my_pending: 0 });
  const [filter, setFilter] = useState("all");
  const [reporting, setReporting] = useState(null);
  const [reason, setReason] = useState("");
  const load = useCallback(() => api.get(`/forts/${slug}/comments`).then((r) => setData(r.data)), [slug]);
  useEffect(() => { load(); }, [load, user]);
  const items = filter === "all" ? data.items : data.items.filter((c) => c.kind === filter);
  const report = async () => {
    try { await api.post(`/comments/${reporting.comment_id}/report`, { reason }); toast.success("Reported to moderators. Thank you."); }
    catch (e) { toast.error(formatErr(e)); }
    setReporting(null); setReason("");
  };
  return (
    <section data-testid="comments-section">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
        <div>
          <p className="eyebrow text-[#E87524] mb-3">Discussion</p>
          <h2 className="font-display text-4xl">Visitors' notes & questions</h2>
        </div>
        <div className="flex gap-1 text-xs">
          {["all", ...Object.keys(KINDS)].map((k) => (
            <button key={k} onClick={() => setFilter(k)} data-testid={`comments-filter-${k}`} className={`px-3 py-1.5 border uppercase tracking-[0.12em] ${filter === k ? "bg-[#252525] text-white border-[#252525]" : "border-stone-300"}`}>{k === "all" ? "All" : KINDS[k].label}</button>
          ))}
        </div>
      </div>
      {user ? <Composer slug={slug} onDone={load} /> : <SignInPrompt />}
      {data.my_pending > 0 && <p className="text-xs text-stone-500 mt-3" data-testid="pending-note">{data.my_pending === 1 ? "1 of your posts is" : `${data.my_pending} of your posts are`} awaiting moderation.</p>}
      <ul className="mt-6" data-testid="comments-list">
        {items.length === 0 && <li className="py-10 text-stone-500 text-sm">No posts yet — be the first to share.</li>}
        {items.map((c) => <CommentItem key={c.comment_id} c={c} slug={slug} reload={load} onReport={setReporting} />)}
      </ul>
      <Dialog open={!!reporting} onOpenChange={(o) => !o && setReporting(null)}>
        <DialogContent className="rounded-none" data-testid="report-dialog">
          <DialogHeader><DialogTitle className="font-display">Report this post</DialogTitle></DialogHeader>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this inappropriate? (spam, abuse, misinformation…)" data-testid="report-reason" className="rounded-none" />
          <button onClick={report} disabled={reason.trim().length < 2} className="px-5 py-2.5 bg-[#252525] text-white text-xs uppercase tracking-[0.2em] disabled:opacity-40" data-testid="report-submit">Submit report</button>
        </DialogContent>
      </Dialog>
    </section>
  );
}
