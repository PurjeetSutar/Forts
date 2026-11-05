export const TYPE_COLORS = {
  "Hill Fort": "#E87524",
  "Sea Fort": "#1D5C7A",
  "Island Fort": "#3A8FB7",
  "Land Fort": "#252525",
  "Forest Fort": "#4F6B3A",
};

export const FORT_TYPES = Object.keys(TYPE_COLORS);

export const ART = {
  hill: "https://static.prod-images.emergentagent.com/jobs/b41b6a11-365c-4eb1-ad8e-4c53c2d2b437/images/64524b0a37b6696dc47fe70943fdcf0e0c7cfc235bf0b6f3d6392c7990821fee.jpeg",
  sea: "https://static.prod-images.emergentagent.com/jobs/b41b6a11-365c-4eb1-ad8e-4c53c2d2b437/images/07236727a7d0b7539fe7c6a3305b98cb44139d30f86888bf74b246dac1e275fd.jpeg",
  gate: "https://static.prod-images.emergentagent.com/jobs/b41b6a11-365c-4eb1-ad8e-4c53c2d2b437/images/cd7bf8cb793d1be79affb41ad7492f908b0cd31e1c124f627008920eb5718db6.jpeg",
  panorama: "https://static.prod-images.emergentagent.com/jobs/b41b6a11-365c-4eb1-ad8e-4c53c2d2b437/images/88615d966dfb1c1f9ba7a1551807ee4eccb0349c52071a41633cc008b655d95e.jpeg",
  bastion: "https://static.prod-images.emergentagent.com/jobs/b41b6a11-365c-4eb1-ad8e-4c53c2d2b437/images/1ffc46a2bbbfd000ae20cd73281ac31075bcf2b2a32afbc2b78bdbef5e413047.jpeg",
};

export const HERO_IMG = "https://images.unsplash.com/photo-1572782252655-9c8771392601?auto=format&fit=crop&w=2400&q=80";

export const STATUS_META = {
  documented: { label: "Documented", cls: "bg-[#252525] text-white" },
  tradition: { label: "Legend / Tradition", cls: "bg-[#E87524]/10 text-[#b5561a] border border-[#E87524]/40" },
  needs_verification: { label: "Needs verification", cls: "bg-amber-50 text-amber-800 border border-amber-300" },
  mixed: { label: "History & legend", cls: "bg-stone-100 text-stone-700 border border-stone-300" },
};

export const ERAS = [
  { year: "c. 2nd c. BCE", title: "Trade routes & rock-cut caves", desc: "Satavahana-era inscriptions at Naneghat and Buddhist caves near Junnar and Lonavala mark the ancient passes later guarded by forts." },
  { year: "12th–14th c.", title: "Yadavas & Shilaharas", desc: "Devagiri (Daulatabad) rises as the Yadava capital; Shilahara rulers are associated with Panhala and the Kolhapur region." },
  { year: "1327", title: "Daulatabad", desc: "Muhammad bin Tughluq moves his capital to Devagiri and renames it Daulatabad." },
  { year: "1347–17th c.", title: "Deccan Sultanates", desc: "The Bahmani Sultanate and its successors — Nizam Shahi, Adil Shahi, Imad Shahi — fortify the plateau and the coast." },
  { year: "1646–1680", title: "Swarajya of Shivaji Maharaj", desc: "Hill and sea forts become the backbone of the Maratha state; coronation at Raigad in 1674." },
  { year: "Early 18th c.", title: "Maratha navy", desc: "Kanhoji Angre commands the coast from Kolaba and Vijaydurg." },
  { year: "1713–1818", title: "Peshwa era", desc: "Pune's Shaniwar Wada becomes the seat of the Peshwas; Vasai is taken in 1739." },
  { year: "1818", title: "British conquest", desc: "Many forts fall to the East India Company during the Third Anglo-Maratha War." },
  { year: "Today", title: "Heritage & conservation", desc: "Many forts are protected by the ASI or the State Directorate of Archaeology; trekkers and local groups help care for them." },
];

export const NAV = [
  { to: "/forts", label: "Forts" },
  { to: "/map", label: "Map" },
  { to: "/planner", label: "Plan a Trip" },
  { to: "/stories", label: "Stories" },
  { to: "/gallery", label: "Archive" },
  { to: "/community", label: "Community" },
  { to: "/about", label: "About" },
];
