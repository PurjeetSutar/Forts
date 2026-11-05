import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api, formatErr } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AdminH } from "@/pages/admin/Overview";
import JsonEditor from "@/pages/admin/JsonEditor";
import { Loader } from "@/components/common";

export function UsersAdmin() {
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const load = () => api.get("/admin/users").then((r) => setList(r.data));
  useEffect(() => { load(); }, []);
  const upd = async (id, body) => { try { await api.patch(`/admin/users/${id}`, body); toast.success("Updated"); load(); } catch (e) { toast.error(formatErr(e)); } };
  return (
    <div data-testid="admin-users">
      <AdminH title={`Users (${list.length})`} />
      <div className="bg-white border border-stone-200">
        <Table>
          <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Sign-in</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>
            {list.map((u) => (
              <TableRow key={u.user_id} data-testid={`admin-user-${u.user_id}`}>
                <TableCell>{u.name}</TableCell><TableCell>{u.email}</TableCell><TableCell>{u.auth_provider}</TableCell>
                <TableCell>
                  <select disabled={u.user_id === user.user_id} value={u.role} onChange={(e) => upd(u.user_id, { role: e.target.value })} className="border border-stone-300 h-8 text-sm px-1" data-testid="admin-user-role"><option value="user">user</option><option value="admin">admin</option></select>
                </TableCell>
                <TableCell>
                  <button disabled={u.user_id === user.user_id} onClick={() => upd(u.user_id, { banned: !u.banned })} className={`text-xs px-2 py-1 border ${u.banned ? "border-red-300 text-red-600" : "border-stone-300"} disabled:opacity-30`} data-testid="admin-user-ban">{u.banned ? "Suspended — restore" : "Suspend"}</button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function SettingsAdmin() {
  const [s, setS] = useState(null);
  const [val, setVal] = useState(null);
  const [circuits, setCircuits] = useState(null);
  const [cval, setCval] = useState(null);
  useEffect(() => {
    api.get("/settings").then((r) => { const { stats, districts, fort_types, regions } = r.data; setS({ stats: stats.map(({ value, ...x }) => (x.live ? x : { ...x, value })), districts, fort_types, regions }); });
    api.get("/circuits").then((r) => setCircuits(r.data.map(({ fort_details, ...c }) => c)));
  }, []);
  useEffect(() => { if (s) setVal(s); }, [s]);
  useEffect(() => { if (circuits) setCval(circuits); }, [circuits]);
  if (!s || !circuits) return <Loader />;
  const save = async () => { if (!val) return toast.error("Fix JSON first"); try { await api.put("/admin/settings", val); toast.success("Settings saved"); } catch (e) { toast.error(formatErr(e)); } };
  const saveCircuits = async () => {
    if (!cval) return toast.error("Fix JSON first");
    try {
      const keep = new Set(cval.map((c) => c.slug));
      for (const c of circuits) if (!keep.has(c.slug)) await api.delete(`/admin/circuits/${c.slug}`);
      for (const c of cval) await api.post("/admin/circuits", c);
      toast.success("Circuits saved");
    } catch (e) { toast.error(formatErr(e)); }
  };
  return (
    <div className="space-y-12" data-testid="admin-settings">
      <div>
        <AdminH title="Homepage counters, districts & categories"><button onClick={save} className="px-4 py-2 bg-[#E87524] text-white text-sm" data-testid="settings-save">Save settings</button></AdminH>
        <p className="text-xs text-stone-500 mb-2">Counters with a "live" field are computed from the fort database; others use the editable "value". Edit district, region and fort-type lists used across the site.</p>
        <JsonEditor value={s} onChange={setVal} rows={20} testid="settings-json" />
      </div>
      <div>
        <AdminH title="Fort circuits & travel routes"><button onClick={saveCircuits} className="px-4 py-2 bg-[#E87524] text-white text-sm" data-testid="circuits-save">Save circuits</button></AdminH>
        <JsonEditor value={circuits} onChange={setCval} rows={18} testid="circuits-json" />
      </div>
    </div>
  );
}
