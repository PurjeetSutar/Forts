import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "@/lib/api";
import { Loader, SEO } from "@/components/common";

export default function UserProfile() {
  const { id } = useParams();
  const [u, setU] = useState(null);
  const [err, setErr] = useState(false);
  useEffect(() => { api.get(`/users/${id}`).then((r) => setU(r.data)).catch(() => setErr(true)); }, [id]);
  if (err) return <div className="pt-40 text-center pb-24"><h1 className="font-display text-3xl">User not found</h1></div>;
  if (!u) return <div className="pt-24"><Loader /></div>;
  return (
    <div className="pt-32 px-6 md:px-12 lg:px-24 pb-24 max-w-4xl" data-testid="user-profile-page">
      <SEO title={u.name} />
      <div className="flex items-center gap-5">
        {u.picture ? <img src={u.picture} alt="" className="w-20 h-20 rounded-full" /> : <span className="w-20 h-20 rounded-full bg-[#252525] text-white grid place-items-center font-display text-3xl">{u.name?.[0]}</span>}
        <div><h1 className="font-display text-4xl" data-testid="user-profile-name">{u.name}</h1><p className="text-xs text-stone-500 uppercase tracking-[0.18em] mt-1">Member since {new Date(u.created_at).getFullYear()}{u.role === "admin" && " · Moderator"}</p></div>
      </div>
      {u.bio && <p className="mt-6 text-stone-700">{u.bio}</p>}
      <p className="eyebrow text-[#E87524] mt-14 mb-4">Recent contributions</p>
      {u.comments.length === 0 ? <p className="text-sm text-stone-500">No public posts yet.</p> : u.comments.map((c) => (
        <div key={c.comment_id} className="py-4 border-b border-stone-200">
          <Link to={`/forts/${c.fort_slug}`} className="text-xs uppercase tracking-[0.15em] text-stone-500 hover:text-[#E87524]">{c.fort_slug.replace(/-/g, " ")}</Link>
          <p className="mt-1 text-[15px]">{c.text}</p>
        </div>
      ))}
    </div>
  );
}
