import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { api } from "@/lib/api";
import { Loader } from "@/components/common";

export const AdminH = ({ title, children }) => (
  <div className="flex flex-wrap items-end justify-between gap-4 mb-8"><h1 className="font-display text-3xl">{title}</h1><div className="flex gap-2">{children}</div></div>
);

export default function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => { api.get("/admin/stats").then((r) => setS(r.data)); }, []);
  if (!s) return <Loader />;
  const cards = [["Forts", s.counts.forts], ["Stories", s.counts.stories], ["Photos", s.counts.photos], ["Users", s.counts.users], ["Comments", s.counts.comments],
    ["Pending comments", s.counts.pending_comments], ["Pending submissions", s.counts.pending_submissions], ["Page views", s.counts.pageviews]];
  return (
    <div data-testid="admin-overview">
      <AdminH title="Overview" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200 border border-stone-200 mb-10">
        {cards.map(([k, v]) => <div key={k} className="bg-white p-5"><p className="text-xs uppercase tracking-[0.15em] text-stone-500">{k}</p><p className={`font-display text-4xl mt-2 ${k.startsWith("Pending") && v ? "text-[#E87524]" : ""}`} data-testid={`admin-count-${k.toLowerCase().replace(/\s/g, "-")}`}>{v}</p></div>)}
      </div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white border border-stone-200 p-6"><p className="text-sm font-semibold mb-4">Traffic — last 14 days</p>
          <div className="h-64"><ResponsiveContainer><AreaChart data={s.traffic}><XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} allowDecimals={false} /><Tooltip /><Area dataKey="views" stroke="#E87524" fill="#E87524" fillOpacity={0.15} /></AreaChart></ResponsiveContainer></div></div>
        <div className="bg-white border border-stone-200 p-6"><p className="text-sm font-semibold mb-4">Most viewed forts</p>
          <div className="h-64"><ResponsiveContainer><BarChart data={s.top_forts} layout="vertical"><XAxis type="number" fontSize={11} allowDecimals={false} /><YAxis type="category" dataKey="name" width={110} fontSize={11} /><Tooltip /><Bar dataKey="views" fill="#252525" /></BarChart></ResponsiveContainer></div></div>
        <div className="bg-white border border-stone-200 p-6 lg:col-span-2"><p className="text-sm font-semibold mb-4">Top pages</p>
          {s.top_paths.map((p) => <div key={p.path} className="flex justify-between text-sm py-2 border-b border-stone-100"><span>{p.path}</span><span className="text-stone-500">{p.views}</span></div>)}</div>
      </div>
    </div>
  );
}
