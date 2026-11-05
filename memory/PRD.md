# Forts of Maharashtra — PRD

## Original problem statement
Premium digital heritage + tourism platform documenting Maharashtra's forts (350+ commonly cited): cinematic homepage, verified fort directory with filters, detailed fort pages, interactive map, travel planner & bucket list, stories, community comments, photo archive with attribution, about/contribution with admin review, admin CMS, SEO, accessibility, future Marathi/Hindi. Strict content accuracy (no invented facts; documented vs legend; sources; no fake entries). Colours #FFFFFF / #252525 / #E87524.

## User choices
- Sign-in: BOTH email/password (JWT cookies) AND Emergent-managed Google login
- Directory: well-documented forts only, grow over time via admin/submissions
- Map: free open map (Leaflet + OpenStreetMap, grayscale), district boundaries (Census 2011 GeoJSON, pre-Palghar)
- Real photo uploads (Emergent Object Storage), reviewed before publishing
- More artistic fort art across the site (AI-generated ink illustrations, labelled as such)

## Architecture
- Backend: FastAPI (`/app/backend/server.py`), seed data `/app/backend/seed_data.py`, MongoDB collections: users, user_sessions, login_attempts, forts, stories, photos, comments, submissions, itineraries, circuits, settings, files, pageviews
- Frontend: React + Tailwind + shadcn, framer-motion, Lenis, react-leaflet, react-helmet-async (SEO + JSON-LD), sitemap at `/api/sitemap.xml`
- Admin: admin@fortsofmaharashtra.in (seeded, see /app/memory/test_credentials.md)

## Implemented (Nov 2026)
- 34 sourced fort profiles with verification statuses, references, travel info; 6 stories; 6 circuits; 18 archive images
- Home (hero, search, counters editable in admin, carousel, timeline, categories, stories, circuits, A–Z)
- Directory (9 filters, search, alphabet, grid/list, pagination), Fort detail (all sections, mini-map, gallery lightbox w/ licence, discussion)
- Map (type-coloured markers, filters, districts, preview card, nearby, circuit polylines)
- Planner (multi-select, optimise, day split, Google Maps route, save itineraries), bucket list
- Comments (kinds, replies, likes, reports, spam heuristics, rate limit, image→pending), community page, public profiles
- Contribute (6 types, photo upload) → admin review; approved photos publish to archive
- Admin: overview/traffic charts, forts CRUD (form + JSON), stories, photos, comment moderation, submissions, users (role/suspend), settings (counters/districts/types), circuits
- Language switcher scaffold (English live; Marathi/Hindi marked coming soon)
- Tested: iteration_1 (backend 27/27 after fixes; frontend flows passing)

## Backlog
- P0: Expand verified fort dataset toward 350+ (via admin/contributions, sources required)
- P1: Fort-specific licensed photographs (Wikimedia Commons with attribution) replacing representative images; Marathi/Hindi translations; password-reset email delivery (currently logged only)
- P2: Server-side rendering/prerender for crawlers; offline trek mode; weather per fort
