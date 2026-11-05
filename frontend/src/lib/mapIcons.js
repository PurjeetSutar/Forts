import L from "leaflet";
import { TYPE_COLORS } from "@/lib/constants";

export const TILE_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

const cache = {};
export function pinIcon(type, active = false) {
  const key = `${type}-${active}`;
  if (cache[key]) return cache[key];
  const s = active ? 30 : 22;
  cache[key] = L.divIcon({
    className: "",
    html: `<div class="fort-pin" style="width:${s}px;height:${s}px;background:${TYPE_COLORS[type] || "#E87524"}"></div>`,
    iconSize: [s, s],
    iconAnchor: [s / 2, s],
  });
  return cache[key];
}
