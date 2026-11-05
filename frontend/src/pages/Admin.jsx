import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LayoutDashboard, Castle, BookOpen, Image, MessageSquareWarning, Inbox, Users, Settings, ArrowLeft } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Loader, SEO } from "@/components/common";
import Overview from "@/pages/admin/Overview";
import FortsAdmin from "@/pages/admin/FortsAdmin";
import { StoriesAdmin, PhotosAdmin } from "@/pages/admin/ContentAdmin";
import { CommentsAdmin, SubmissionsAdmin } from "@/pages/admin/Moderation";
import { UsersAdmin, SettingsAdmin } from "@/pages/admin/UsersSettings";

const TABS = [
  ["overview", "Overview", LayoutDashboard, Overview], ["forts", "Forts", Castle, FortsAdmin], ["stories", "Stories", BookOpen, StoriesAdmin],
  ["photos", "Photographs", Image, PhotosAdmin], ["comments", "Comments", MessageSquareWarning, CommentsAdmin], ["submissions", "Submissions", Inbox, SubmissionsAdmin],
  ["users", "Users", Users, UsersAdmin], ["settings", "Districts & settings", Settings, SettingsAdmin],
];

export default function Admin() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("overview");
  useEffect(() => { if (user === false) nav("/login", { replace: true }); }, [user, nav]);
  if (!user) return <Loader />;
  if (user.role !== "admin") return <div className="pt-40 text-center" data-testid="admin-forbidden"><h1 className="font-display text-3xl">Admin access required</h1><Link to="/" className="text-[#E87524] underline">Back home</Link></div>;
  const Active = TABS.find((t) => t[0] === tab)[3];
  return (
    <div className="min-h-screen flex bg-[#F7F5F2]" data-testid="admin-page">
      <SEO title="Admin dashboard" />
      <aside className="w-60 shrink-0 bg-[#252525] text-white hidden md:flex flex-col sticky top-0 h-screen">
        <div className="p-6 border-b border-white/10"><p className="font-display text-lg">Forts <span className="text-[#E87524]">of</span> Maharashtra</p><p className="text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">Content management</p></div>
        <nav className="flex-1 py-4">
          {TABS.map(([k, l, I]) => (
            <button key={k} onClick={() => setTab(k)} data-testid={`admin-tab-${k}`} className={`w-full flex items-center gap-3 px-6 py-3 text-sm ${tab === k ? "bg-white/10 text-white border-l-2 border-[#E87524]" : "text-white/60 hover:text-white"}`}><I className="w-4 h-4" strokeWidth={1.5} />{l}</button>
          ))}
        </nav>
        <Link to="/" className="p-6 text-xs text-white/50 hover:text-white flex items-center gap-2" data-testid="admin-back-site"><ArrowLeft className="w-4 h-4" />Back to site</Link>
      </aside>
      <div className="flex-1 min-w-0">
        <div className="md:hidden flex overflow-x-auto bg-[#252525] text-white no-scrollbar">
          {TABS.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`px-4 py-3 text-xs whitespace-nowrap ${tab === k ? "text-[#E87524]" : ""}`}>{l}</button>)}
        </div>
        <div className="p-6 md:p-10"><Active /></div>
      </div>
    </div>
  );
}
