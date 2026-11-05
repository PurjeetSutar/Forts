import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { MapContainer, TileLayer, Marker, GeoJSON, Polyline, useMap } from "react-leaflet";
import { Search, X, ArrowUpRight, Layers, Route } from "lucide-react";
import { api, distanceKm } from "@/lib/api";
import { TYPE_COLORS } from "@/lib/constants";
import { pinIcon, TILE_ATTR, TILE_URL } from "@/lib/mapIcons";
import { SEO } from "@/components/common";

function FlyTo({ target }) {
  const map = useMap();
  useEffect(() => { if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 9), { duration: 1 }); }, [target, map]);
  return null;
}

function Preview({ f, all, onClose, onPick }) {
  const nearby = all.filter((x) => x.slug !== f.slug).map((x) => ({ ...x, d: distanceKm(f, x) })).sort((a, b) => a.d - b.d).slice(0, 3);
  return (
    <div className="absolute z-[500] right-4 bottom-4 md:right-6 md:top-6 md:bottom-auto w-[calc(100%-2rem)] md:w-[360px] bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_10px_40px_rgba(0,0,0,0.15)]" data-testid="map-preview-card">
      <button onClick={onClose} className="absolute top-2 right-2 z-10 bg-white/90 p-1" aria-label="Close" data-testid="map-preview-close"><X className="w-4 h-4" /></button>
      <img src={f.hero_image} alt={f.name} className="w-full h-40 object-cover" />
      <div className="p-5">
        <p className="eyebrow" style={{ color: TYPE_COLORS[f.type] }}>{f.type} · {f.district}</p>
        <h3 className="font-display text-2xl mt-1">{f.name}</h3>
        <p className="text-sm text-stone-600 mt-2 line-clamp-3">{f.summary}</p>
        <p className="text-xs text-stone-500 mt-2">Difficulty: {f.difficulty} · Best: {f.travel?.best_season?.split("(")[0]}</p>
        <Link to={`/forts/${f.slug}`} data-testid="map-preview-open" className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-[#E87524] text-white text-xs uppercase tracking-[0.2em] hover:bg-[#cf661d]">Open full profile <ArrowUpRight className="w-4 h-4" /></Link>
        <p className="eyebrow text-stone-400 mt-5 mb-2">Nearby forts</p>
        {nearby.map((n) => <button key={n.slug} onClick={() => onPick(n)} className="flex justify-between w-full text-sm py-1.5 border-b border-stone-200 hover:text-[#E87524]" data-testid={`map-nearby-${n.slug}`}><span>{n.name}</span><span className="text-stone-400">{n.d} km</span></button>)}
      </div>
    </div>
  );
}

export default function MapPage() {
  const [forts, setForts] = useState([]);
  const [circuits, setCircuits] = useState([]);
  const [geo, setGeo] = useState(null);
  const [q, setQ] = useState("");
  const [types, setTypes] = useState(Object.keys(TYPE_COLORS));
  const [showDistricts, setShowDistricts] = useState(true);
  const [sel, setSel] = useState(null);
  const [circuit, setCircuit] = useState(null);
  const [panel, setPanel] = useState(true);

  useEffect(() => {
    api.get("/forts/map").then((r) => setForts(r.data));
    api.get("/circuits").then((r) => setCircuits(r.data));
    fetch("/maharashtra-districts.geojson").then((r) => r.json()).then(setGeo).catch(() => {});
  }, []);

  const shown = useMemo(() => forts.filter((f) => types.includes(f.type) && (!q || `${f.name} ${f.district} ${(f.associations || []).join(" ")}`.toLowerCase().includes(q.toLowerCase()))), [forts, types, q]);
  const circuitLine = circuit ? circuit.forts.map((s) => forts.find((f) => f.slug === s)).filter(Boolean).map((f) => [f.lat, f.lng]) : null;
  const toggleType = (t) => setTypes((x) => (x.includes(t) ? x.filter((y) => y !== t) : [...x, t]));

  return (
    <div className="relative h-[100svh] pt-16" data-testid="map-page">
      <SEO title="Interactive Fort Map" description="Explore the forts of Maharashtra on an interactive map with district boundaries, filters and suggested circuits." />
      <MapContainer center={[18.9, 75.5]} zoom={7} minZoom={6} maxBounds={[[14.5, 70], [23, 82]]} className="w-full h-full" zoomControl={false}>
        <TileLayer url={TILE_URL} attribution={TILE_ATTR + " · District boundaries: Census 2011 (pre-2014; Palghar shown within Thane)"} />
        {showDistricts && geo && <GeoJSON data={geo} style={{ color: "#252525", weight: 0.8, opacity: 0.5, fillColor: "#E87524", fillOpacity: 0.02, dashArray: "3 3" }}
          onEachFeature={(ft, layer) => layer.bindTooltip(ft.properties.district, { sticky: true, className: "text-xs" })} />}
        {circuitLine && <Polyline positions={circuitLine} pathOptions={{ color: "#E87524", weight: 3, dashArray: "6 6" }} />}
        {shown.map((f) => (
          <Marker key={f.slug} position={[f.lat, f.lng]} icon={pinIcon(f.type, sel?.slug === f.slug)} eventHandlers={{ click: () => setSel(f) }} title={f.name} />
        ))}
        <FlyTo target={sel} />
      </MapContainer>

      <div className={`absolute z-[500] left-4 top-20 md:left-6 md:top-24 w-[calc(100%-2rem)] md:w-[340px] bg-white/90 backdrop-blur-xl border border-white/60 shadow-[0_10px_40px_rgba(0,0,0,0.12)] ${panel ? "" : "md:w-auto"}`} data-testid="map-panel">
        <div className="flex items-center justify-between p-4 border-b border-stone-200">
          <h1 className="font-display text-xl">Fort map</h1>
          <button onClick={() => setPanel(!panel)} className="text-xs uppercase tracking-widest text-stone-500" data-testid="map-panel-toggle">{panel ? "Hide" : "Show"}</button>
        </div>
        {panel && (
          <div className="p-4 space-y-5 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center border-b border-stone-300 focus-within:border-[#E87524]">
              <Search className="w-4 h-4 text-stone-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search forts, districts, rulers" className="flex-1 px-2 py-2 bg-transparent outline-none text-sm" data-testid="map-search-input" />
            </div>
            {q && <div className="max-h-40 overflow-y-auto">{shown.slice(0, 8).map((f) => <button key={f.slug} onClick={() => setSel(f)} className="block w-full text-left text-sm py-1.5 hover:text-[#E87524]" data-testid={`map-result-${f.slug}`}>{f.name} <span className="text-stone-400">· {f.district}</span></button>)}</div>}
            <div>
              <p className="eyebrow text-stone-400 mb-2">Fort types</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(TYPE_COLORS).map(([t, c]) => (
                  <button key={t} onClick={() => toggleType(t)} data-testid={`map-type-${t.replace(" ", "-").toLowerCase()}`}
                    className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 border transition-opacity ${types.includes(t) ? "border-stone-400" : "border-stone-200 opacity-40"}`}>
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />{t}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="checkbox" checked={showDistricts} onChange={(e) => setShowDistricts(e.target.checked)} className="accent-[#E87524]" data-testid="map-districts-toggle" /><Layers className="w-4 h-4" />District boundaries</label>
            <div>
              <p className="eyebrow text-stone-400 mb-2 flex items-center gap-2"><Route className="w-3.5 h-3.5" />Suggested circuits</p>
              {circuits.map((c) => (
                <button key={c.slug} onClick={() => setCircuit(circuit?.slug === c.slug ? null : c)} data-testid={`map-circuit-${c.slug}`}
                  className={`block w-full text-left text-sm py-2 border-b border-stone-200 ${circuit?.slug === c.slug ? "text-[#E87524] font-semibold" : "hover:text-[#E87524]"}`}>{c.name} <span className="text-stone-400 font-normal">· {c.forts.length} forts</span></button>
              ))}
              {circuit && <Link to={`/planner?circuit=${circuit.slug}`} className="inline-block mt-3 text-xs uppercase tracking-[0.2em] text-[#E87524]" data-testid="map-plan-circuit">Plan this circuit →</Link>}
            </div>
            <p className="text-xs text-stone-500" data-testid="map-count">{shown.length} of {forts.length} profiled forts shown</p>
          </div>
        )}
      </div>
      {sel && <Preview f={sel} all={forts} onClose={() => setSel(null)} onPick={setSel} />}
    </div>
  );
}
