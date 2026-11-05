import { Link } from "react-router-dom";
import { BookOpen, Camera, Users, ShieldCheck } from "lucide-react";
import { ART } from "@/lib/constants";
import { PageHero, SEO, StatusBadge, Reveal } from "@/components/common";

const PILLARS = [
  [BookOpen, "Document", "Build a sourced, deduplicated record of Maharashtra's forts — history, architecture and present condition."],
  [ShieldCheck, "Verify", "Distinguish documented history from tradition. Every claim carries a source and a verification status."],
  [Camera, "Preserve", "Gather photographs with clear attribution and licensing, creating a visual archive for future generations."],
  [Users, "Connect", "Bring together historians, trekkers, photographers and local communities to care for these places."],
];

export default function About() {
  return (
    <div data-testid="about-page">
      <SEO title="About" description="Why we document Maharashtra's fort heritage, and how we keep it accurate." />
      <PageHero eyebrow="About the project" title="A living archive of Maharashtra's forts" art={ART.bastion}>
        Maharashtra is commonly said to have more than 350 forts — from sea fortresses on the Konkan to citadels on Sahyadri summits and Gond city walls in Vidarbha. Many are crumbling, many are misremembered. This project exists to document them carefully and make them accessible to everyone.
      </PageHero>
      <section className="px-6 md:px-12 lg:px-24 py-20 grid md:grid-cols-2 lg:grid-cols-4 gap-px bg-stone-200 border-y border-stone-200">
        {PILLARS.map(([I, t, d], i) => (
          <Reveal key={t} delay={i * 0.06} className="bg-white p-8">
            <I className="w-7 h-7 text-[#E87524]" strokeWidth={1.25} />
            <h2 className="font-display text-2xl mt-6">{t}</h2>
            <p className="text-sm text-stone-600 mt-3 leading-relaxed">{d}</p>
          </Reveal>
        ))}
      </section>
      <section className="px-6 md:px-12 lg:px-24 py-24 grid lg:grid-cols-12 gap-12">
        <div className="lg:col-span-6">
          <p className="eyebrow text-[#E87524] mb-4">Our accuracy policy</p>
          <h2 className="font-display text-4xl leading-tight">History deserves rigour.</h2>
          <div className="mt-8 space-y-5 text-[16px] leading-relaxed text-stone-700">
            <p>We rely on credible sources — the Maharashtra State Gazetteers, the Archaeological Survey of India, the State Directorate of Archaeology & Museums, Maharashtra Tourism, and established historical works.</p>
            <p>We never invent dates, battles, locations or stories, and we do not assume every fort was built or conquered by Chhatrapati Shivaji Maharaj. Folklore is celebrated — but always labelled as folklore.</p>
            <p>The directory grows only through verified additions. We will not create placeholder entries to reach a target number.</p>
          </div>
        </div>
        <div className="lg:col-span-5 lg:col-start-8 border border-stone-200 p-8 space-y-5 self-start" data-testid="verification-legend">
          <p className="eyebrow text-stone-400">How we label claims</p>
          <div><StatusBadge status="documented" /><p className="text-sm text-stone-600 mt-2">Supported by cited historical sources.</p></div>
          <div><StatusBadge status="tradition" /><p className="text-sm text-stone-600 mt-2">Oral tradition, legend or folklore — culturally important, not documented fact.</p></div>
          <div><StatusBadge status="needs_verification" /><p className="text-sm text-stone-600 mt-2">Details vary between sources or await confirmation.</p></div>
          <div className="pt-4 border-t border-stone-200 text-xs text-stone-500">Images: "representative" stock photographs may not depict the named fort. Illustrations are AI-generated artwork, never historical records.</div>
        </div>
      </section>
      <section className="bg-[#252525] text-white px-6 md:px-12 lg:px-24 py-24 grid md:grid-cols-2 gap-10 items-center relative overflow-hidden grain">
        <img src={ART.panorama} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover opacity-[0.06] invert" />
        <div className="relative"><p className="eyebrow text-[#E87524] mb-4">Contribute</p><h2 className="font-display text-4xl">Historians, researchers, photographers, trekkers & local communities — this archive is yours.</h2></div>
        <div className="relative">
          <p className="text-white/70">Submit historical information, corrections, photographs, forgotten stories, restoration updates or new fort entries. Every submission is reviewed before publication.</p>
          <Link to="/contribute" className="inline-block mt-8 px-7 py-3.5 bg-[#E87524] hover:bg-[#cf661d] text-xs uppercase tracking-[0.2em]" data-testid="about-contribute-btn">Start a contribution</Link>
        </div>
      </section>
    </div>
  );
}
