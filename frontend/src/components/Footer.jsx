import { Link, useLocation } from "react-router-dom";
import { ART } from "@/lib/constants";

export default function Footer() {
  const { pathname } = useLocation();
  if (pathname.startsWith("/admin") || pathname === "/map") return null;
  return (
    <footer className="relative bg-[#252525] text-white overflow-hidden" data-testid="site-footer">
      <img src={ART.panorama} alt="" aria-hidden className="absolute inset-x-0 top-0 w-full h-40 object-cover opacity-[0.07] invert" />
      <div className="relative px-6 md:px-12 lg:px-24 pt-24 pb-10 grid md:grid-cols-12 gap-12">
        <div className="md:col-span-5">
          <p className="eyebrow text-[#E87524] mb-4">A digital heritage archive</p>
          <h3 className="font-display text-3xl md:text-4xl leading-tight">Every wall here has a story. <span className="italic text-white/60">Help us tell it truthfully.</span></h3>
          <Link to="/contribute" data-testid="footer-contribute-btn" className="inline-block mt-8 px-6 py-3 bg-[#E87524] hover:bg-[#cf661d] transition-colors text-sm uppercase tracking-[0.2em]">Contribute</Link>
        </div>
        <div className="md:col-span-2 md:col-start-7 space-y-3 text-sm text-white/70">
          <p className="eyebrow text-white/40">Explore</p>
          <Link to="/forts" className="block hover:text-white">Fort directory</Link>
          <Link to="/map" className="block hover:text-white">Interactive map</Link>
          <Link to="/planner" className="block hover:text-white">Trip planner</Link>
          <Link to="/stories" className="block hover:text-white">Stories</Link>
        </div>
        <div className="md:col-span-2 space-y-3 text-sm text-white/70">
          <p className="eyebrow text-white/40">Archive</p>
          <Link to="/gallery" className="block hover:text-white">Photo archive</Link>
          <Link to="/community" className="block hover:text-white">Community</Link>
          <Link to="/about" className="block hover:text-white">About & accuracy</Link>
        </div>
        <div className="md:col-span-3 text-xs text-white/50 leading-relaxed">
          <p className="eyebrow text-white/40 mb-3">Accuracy policy</p>
          Historical claims are marked as documented, tradition or needs-verification, with sources. Photographs marked "representative" may not depict the named fort. Illustrations are AI-generated artwork, not historical records.
        </div>
      </div>
      <div className="relative border-t border-white/10 px-6 md:px-12 lg:px-24 py-6 text-xs text-white/40 flex flex-col md:flex-row justify-between gap-2">
        <span>© {new Date().getFullYear()} Forts of Maharashtra — a community heritage project.</span>
        <span>Map data © OpenStreetMap contributors</span>
      </div>
    </footer>
  );
}
