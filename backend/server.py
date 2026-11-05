from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import asyncio
import os
import re
import math
import uuid
import secrets
import logging
from contextlib import suppress
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from urllib.parse import urlparse

import bcrypt
import jwt
import requests
from fastapi import FastAPI, APIRouter, Query, Request, Response, HTTPException, Depends, UploadFile, File
from fastapi.responses import PlainTextResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING, IndexModel
from pydantic import BaseModel, EmailStr, Field

import seed_data as S

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

JWT_ALG = "HS256"
APP_NAME = "forts-of-maharashtra"
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
storage_key = None

INDEXES = {
    "users": [IndexModel([("email", ASCENDING)], name="email", unique=True), IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "user_sessions": [IndexModel([("session_token", ASCENDING)], name="token")],
    "login_attempts": [IndexModel([("identifier", ASCENDING)], name="identifier")],
    "password_reset_tokens": [IndexModel([("expires_at", ASCENDING)], name="ttl", expireAfterSeconds=0)],
    "forts": [IndexModel([("slug", ASCENDING)], name="slug", unique=True), IndexModel([("name", ASCENDING)], name="name"),
              IndexModel([("district", ASCENDING)], name="district"), IndexModel([("type", ASCENDING)], name="type"),
              IndexModel([("views", DESCENDING)], name="views")],
    "stories": [IndexModel([("slug", ASCENDING)], name="slug", unique=True)],
    "comments": [IndexModel([("fort_slug", ASCENDING), ("created_at", DESCENDING)], name="fort_created"),
                 IndexModel([("comment_id", ASCENDING)], name="comment_id", unique=True), IndexModel([("status", ASCENDING)], name="status")],
    "submissions": [IndexModel([("status", ASCENDING)], name="status")],
    "pageviews": [IndexModel([("date", ASCENDING)], name="date")],
    "files": [IndexModel([("storage_path", ASCENDING)], name="path")],
}

app = FastAPI(title="Forts of Maharashtra API")
api = APIRouter(prefix="/api")


def now():
    return datetime.now(timezone.utc)


def iso():
    return now().isoformat()


# ---------- storage ----------
def init_storage(force=False):
    global storage_key
    if storage_key and not force:
        return storage_key
    r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": os.environ.get("EMERGENT_LLM_KEY")}, timeout=30)
    r.raise_for_status()
    storage_key = r.json()["storage_key"]
    return storage_key


def put_object(path, data, ctype):
    r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage(), "Content-Type": ctype}, data=data, timeout=120)
    if r.status_code == 404:
        r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage(True), "Content-Type": ctype}, data=data, timeout=120)
    r.raise_for_status()
    return r.json()


def get_object(path):
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": init_storage()}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# ---------- auth helpers ----------
def hash_password(p):
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()


def verify_password(p, h):
    return bcrypt.checkpw(p.encode(), h.encode())


def make_token(user_id, kind, ttl):
    return jwt.encode({"sub": user_id, "type": kind, "exp": now() + ttl}, os.environ["JWT_SECRET"], algorithm=JWT_ALG)


def set_auth_cookies(resp: Response, user_id: str):
    resp.set_cookie("access_token", make_token(user_id, "access", timedelta(minutes=60)), httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    resp.set_cookie("refresh_token", make_token(user_id, "refresh", timedelta(days=7)), httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def public_user(u):
    return {k: u.get(k) for k in ("user_id", "email", "name", "picture", "role", "auth_provider", "favorites", "bio", "created_at")}


async def user_from_session(token):
    s = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not s:
        return None
    exp = s["expires_at"]
    if isinstance(exp, str):
        exp = datetime.fromisoformat(exp)
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    if exp < now():
        return None
    return await db.users.find_one({"user_id": s["user_id"]}, {"_id": 0, "password_hash": 0})


async def user_from_jwt(token):
    try:
        p = jwt.decode(token, os.environ["JWT_SECRET"], algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        return None
    if p.get("type") != "access":
        return None
    return await db.users.find_one({"user_id": p["sub"]}, {"_id": 0, "password_hash": 0})


async def optional_user(request: Request):
    tok = request.cookies.get("access_token")
    if tok and (u := await user_from_jwt(tok)):
        return u
    tok = request.cookies.get("session_token")
    if tok and (u := await user_from_session(tok)):
        return u
    h = request.headers.get("Authorization", "")
    if h.startswith("Bearer "):
        t = h[7:]
        return await user_from_jwt(t) or await user_from_session(t)
    return None


async def current_user(request: Request):
    u = await optional_user(request)
    if not u:
        raise HTTPException(401, "Not authenticated")
    if u.get("banned"):
        raise HTTPException(403, "Account suspended")
    return u


async def admin_user(u=Depends(current_user)):
    if u.get("role") != "admin":
        raise HTTPException(403, "Admin access required")
    return u


# ---------- models ----------
class RegisterIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1, max_length=60)


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class SessionIn(BaseModel):
    session_id: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str = Field(min_length=6)


class ProfileIn(BaseModel):
    name: Optional[str] = Field(None, max_length=60)
    bio: Optional[str] = Field(None, max_length=300)


class CommentIn(BaseModel):
    text: str = Field(min_length=2, max_length=3000)
    kind: str = Field("comment", pattern="^(comment|question|experience)$")
    parent_id: Optional[str] = None
    images: List[str] = []
    website: Optional[str] = None  # honeypot


class ReportIn(BaseModel):
    reason: str = Field(min_length=2, max_length=300)


class SubmissionIn(BaseModel):
    type: str = Field(pattern="^(historical_info|correction|photograph|story|restoration|new_fort)$")
    fort_slug: Optional[str] = None
    title: str = Field(min_length=3, max_length=200)
    content: str = Field(min_length=10, max_length=10000)
    sources: Optional[str] = Field(None, max_length=2000)
    images: List[str] = []
    contributor_role: Optional[str] = None


class ItineraryIn(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    fort_slugs: List[str]
    days: int = Field(1, ge=1, le=30)
    notes: Optional[str] = Field(None, max_length=2000)


class StatusIn(BaseModel):
    status: str
    admin_note: Optional[str] = None


class TrackIn(BaseModel):
    path: str = Field(max_length=300)


# ---------- auth routes ----------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(400, "Email already registered")
    u = {"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email, "name": body.name.strip(), "picture": None,
         "password_hash": hash_password(body.password), "role": "user", "auth_provider": "email",
         "favorites": [], "bio": "", "created_at": iso()}
    await db.users.insert_one(u)
    set_auth_cookies(response, u["user_id"])
    return public_user(u)


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower()
    ident = f"login:{email}"
    att = await db.login_attempts.find_one({"identifier": ident})
    if att and att.get("count", 0) >= 5 and att.get("locked_until") and datetime.fromisoformat(att["locked_until"]) > now():
        raise HTTPException(429, "Too many failed attempts. Try again in 15 minutes.")
    u = await db.users.find_one({"email": email}, {"_id": 0})
    if not u or not u.get("password_hash") or not verify_password(body.password, u["password_hash"]):
        cnt = (att or {}).get("count", 0) + 1
        await db.login_attempts.update_one({"identifier": ident}, {"$set": {"count": cnt, "locked_until": (now() + timedelta(minutes=15)).isoformat()}}, upsert=True)
        raise HTTPException(401, "Invalid email or password")
    await db.login_attempts.delete_many({"identifier": ident})
    set_auth_cookies(response, u["user_id"])
    return public_user(u)


@api.post("/auth/google/session")
async def google_session(body: SessionIn, response: Response):
    r = await asyncio.to_thread(requests.get, "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                                headers={"X-Session-ID": body.session_id}, timeout=20)
    if r.status_code != 200:
        raise HTTPException(401, "Invalid session")
    d = r.json()
    email = d["email"].lower()
    u = await db.users.find_one({"email": email}, {"_id": 0})
    if u:
        await db.users.update_one({"email": email}, {"$set": {"picture": d.get("picture") or u.get("picture")}})
    else:
        u = {"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": email, "name": d.get("name") or email.split("@")[0],
             "picture": d.get("picture"), "role": "user", "auth_provider": "google", "favorites": [], "bio": "", "created_at": iso()}
        await db.users.insert_one(u)
        u.pop("_id", None)
    await db.user_sessions.insert_one({"user_id": u["user_id"], "session_token": d["session_token"],
                                       "expires_at": now() + timedelta(days=7), "created_at": now()})
    response.set_cookie("session_token", d["session_token"], httponly=True, secure=True, samesite="none", max_age=604800, path="/")
    return public_user(await db.users.find_one({"email": email}, {"_id": 0}))


@api.get("/auth/me")
async def me(u=Depends(current_user)):
    return public_user(u)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    tok = request.cookies.get("refresh_token")
    try:
        p = jwt.decode(tok or "", os.environ["JWT_SECRET"], algorithms=[JWT_ALG])
    except jwt.InvalidTokenError:
        raise HTTPException(401, "Invalid refresh token")
    if p.get("type") != "refresh":
        raise HTTPException(401, "Invalid token type")
    u = await db.users.find_one({"user_id": p["sub"]}, {"_id": 0, "user_id": 1, "banned": 1})
    if not u or u.get("banned"):
        raise HTTPException(401, "User not available")
    response.set_cookie("access_token", make_token(p["sub"], "access", timedelta(minutes=60)), httponly=True, secure=True, samesite="none", max_age=3600, path="/")
    return {"ok": True}


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    tok = request.cookies.get("session_token")
    if tok:
        await db.user_sessions.delete_many({"session_token": tok})
    for c in ("access_token", "refresh_token", "session_token"):
        response.delete_cookie(c, path="/", secure=True, samesite="none")
    return {"ok": True}


@api.post("/auth/forgot-password")
async def forgot(body: ForgotIn):
    u = await db.users.find_one({"email": body.email.lower()})
    if u:
        t = secrets.token_urlsafe(32)
        await db.password_reset_tokens.insert_one({"token": t, "user_id": u["user_id"], "used": False, "expires_at": now() + timedelta(hours=1)})
        logger.info("Password reset link: /reset-password?token=%s", t)
    return {"ok": True}


@api.post("/auth/reset-password")
async def reset(body: ResetIn):
    rec = await db.password_reset_tokens.find_one({"token": body.token, "used": False})
    if not rec:
        raise HTTPException(400, "Invalid or used token")
    exp = rec["expires_at"].replace(tzinfo=timezone.utc) if rec["expires_at"].tzinfo is None else rec["expires_at"]
    if exp < now():
        raise HTTPException(400, "Token expired")
    await db.users.update_one({"user_id": rec["user_id"]}, {"$set": {"password_hash": hash_password(body.password)}})
    await db.password_reset_tokens.update_one({"token": body.token}, {"$set": {"used": True}})
    return {"ok": True}


@api.put("/me/profile")
async def update_profile(body: ProfileIn, u=Depends(current_user)):
    upd = {k: v.strip() for k, v in body.model_dump().items() if v is not None}
    if upd:
        await db.users.update_one({"user_id": u["user_id"]}, {"$set": upd})
        if "name" in upd:
            await db.comments.update_many({"user_id": u["user_id"]}, {"$set": {"user_name": upd["name"]}})
    return public_user(await db.users.find_one({"user_id": u["user_id"]}, {"_id": 0}))


# ---------- forts ----------
CARD_FIELDS = {"_id": 0, "slug": 1, "name": 1, "district": 1, "region": 1, "type": 1, "summary": 1, "hero_image": 1,
               "period": 1, "difficulty": 1, "popularity": 1, "condition": 1, "lat": 1, "lng": 1, "accessibility": 1, "alt_names": 1}


def fort_query(q=None, district=None, region=None, type=None, period=None, difficulty=None, accessibility=None,
               popularity=None, condition=None, letter=None, association=None):
    f = {"published": True}
    if q:
        rx = {"$regex": re.escape(q), "$options": "i"}
        f["$or"] = [{"name": rx}, {"alt_names": rx}, {"district": rx}, {"region": rx}, {"associations": rx}, {"period": rx}, {"summary": rx}]
    for k, v in (("district", district), ("region", region), ("type", type), ("difficulty", difficulty), ("popularity", popularity)):
        if v:
            f[k] = {"$in": v.split(",")}
    if period:
        f["period"] = {"$regex": re.escape(period), "$options": "i"}
    if association:
        f["associations"] = {"$regex": re.escape(association), "$options": "i"}
    if accessibility:
        f["accessibility"] = {"$regex": re.escape(accessibility), "$options": "i"}
    if condition:
        f["condition"] = {"$regex": re.escape(condition), "$options": "i"}
    if letter:
        f["name"] = {"$regex": f"^{re.escape(letter)}", "$options": "i"}
    return f


@api.get("/forts")
async def list_forts(q: Optional[str] = None, district: Optional[str] = None, region: Optional[str] = None,
                     type: Optional[str] = None, period: Optional[str] = None, difficulty: Optional[str] = None,
                     accessibility: Optional[str] = None, popularity: Optional[str] = None, condition: Optional[str] = None,
                     letter: Optional[str] = None, association: Optional[str] = None, sort: str = "name",
                     page: int = Query(1, ge=1), limit: int = Query(12, ge=1, le=500), featured: Optional[bool] = None):
    f = fort_query(q, district, region, type, period, difficulty, accessibility, popularity, condition, letter, association)
    if featured:
        f["featured"] = True
    total = await db.forts.count_documents(f)
    s = [("views", -1)] if sort == "popular" else [("name", 1)]
    items = await db.forts.find(f, CARD_FIELDS).sort(s).skip((page - 1) * limit).limit(limit).to_list(limit)
    return {"items": items, "total": total, "page": page, "pages": max(1, math.ceil(total / limit))}


@api.get("/forts/facets")
async def facets():
    out = {}
    for k in ("district", "region", "type", "difficulty", "popularity"):
        out[k] = sorted([x for x in await db.forts.distinct(k, {"published": True}) if x])
    assoc = await db.forts.distinct("associations", {"published": True})
    out["associations"] = sorted(assoc)
    out["periods"] = ["Ancient & medieval", "Yadava", "Shilahara", "Bahmani", "Nizam Shahi", "Adil Shahi", "Imad Shahi", "Gond",
                      "Siddi", "Portuguese", "Maratha Empire", "Peshwa era", "Mughal", "British"]
    out["accessibility"] = ["Road", "Steps", "Trek", "Boat", "Ropeway", "Restricted"]
    out["condition"] = ["Protected", "Maintained", "Ruined", "Partially"]
    letters = await db.forts.distinct("name", {"published": True})
    out["letters"] = sorted({n[0].upper() for n in letters})
    return out


@api.get("/forts/map")
async def forts_map():
    return await db.forts.find({"published": True}, {"_id": 0, "slug": 1, "name": 1, "district": 1, "type": 1, "lat": 1, "lng": 1,
                                                       "hero_image": 1, "summary": 1, "difficulty": 1, "region": 1, "period": 1,
                                                       "associations": 1, "travel": 1, "accessibility": 1}).to_list(2000)


def haversine(a, b):
    R = 6371
    la1, lo1, la2, lo2 = map(math.radians, (a["lat"], a["lng"], b["lat"], b["lng"]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return round(2 * R * math.asin(math.sqrt(h)), 1)


@api.get("/forts/{slug}")
async def get_fort(slug: str):
    f = await db.forts.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not f:
        raise HTTPException(404, "Fort not found")
    await db.forts.update_one({"slug": slug}, {"$inc": {"views": 1}})
    others = await db.forts.find({"published": True, "slug": {"$ne": slug}}, CARD_FIELDS).to_list(2000)
    for o in others:
        o["distance_km"] = haversine(f, o)
    f["nearby"] = sorted(others, key=lambda o: o["distance_km"])[:4]
    f["circuits"] = await db.circuits.find({"forts": slug}, {"_id": 0}).to_list(20)
    f["stories"] = await db.stories.find({"fort_slugs": slug, "published": True}, {"_id": 0, "slug": 1, "title": 1, "cover": 1, "category": 1}).to_list(10)
    f["community_photos"] = await db.photos.find({"fort_slug": slug, "published": True}, {"_id": 0}).to_list(30)
    return f


@api.get("/circuits")
async def circuits():
    cs = await db.circuits.find({}, {"_id": 0}).to_list(100)
    allf = {x["slug"]: x for x in await db.forts.find({"published": True}, CARD_FIELDS).to_list(2000)}
    for c in cs:
        c["fort_details"] = [allf[s] for s in c["forts"] if s in allf]
    return cs


@api.get("/settings")
async def get_settings():
    s = await db.settings.find_one({"key": "site"}, {"_id": 0})
    stats = []
    for x in s["stats"]:
        x = dict(x)
        if x.get("live"):
            x["value"] = await db.forts.count_documents({"published": True, "type": {"$in": x["live"].split(",")}})
        stats.append(x)
    s["stats"] = stats
    s["profiled_count"] = await db.forts.count_documents({"published": True})
    return s


# ---------- stories & photos ----------
@api.get("/stories")
async def list_stories(category: Optional[str] = None):
    f = {"published": True}
    if category:
        f["category"] = category
    return await db.stories.find(f, {"_id": 0, "body": 0}).sort("created_at", -1).to_list(200)


@api.get("/stories/{slug}")
async def get_story(slug: str):
    s = await db.stories.find_one({"slug": slug, "published": True}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Story not found")
    return s


@api.get("/photos")
async def list_photos(category: Optional[str] = None):
    f = {"published": True}
    if category:
        f["category"] = category
    return await db.photos.find(f, {"_id": 0}).sort("created_at", -1).to_list(500)


# ---------- uploads ----------
ALLOWED = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}


@api.post("/uploads")
async def upload(file: UploadFile = File(...), u=Depends(current_user)):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, "Only JPG, PNG or WEBP images are allowed")
    data = await file.read()
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(400, "Image must be under 8 MB")
    path = f"{APP_NAME}/uploads/{u['user_id']}/{uuid.uuid4().hex}.{ALLOWED[file.content_type]}"
    try:
        res = await asyncio.to_thread(put_object, path, data, file.content_type)
    except Exception as e:
        logger.error("upload failed: %s", e)
        raise HTTPException(502, "Upload failed, please try again")
    await db.files.insert_one({"storage_path": res["path"], "user_id": u["user_id"], "original_filename": file.filename,
                               "content_type": file.content_type, "size": len(data), "is_deleted": False, "created_at": iso()})
    return {"path": res["path"], "url": f"/api/files/{res['path']}"}


@api.get("/files/{path:path}")
async def serve_file(path: str):
    rec = await db.files.find_one({"storage_path": path, "is_deleted": False})
    if not rec:
        raise HTTPException(404, "File not found")
    data, ct = await asyncio.to_thread(get_object, path)
    return Response(content=data, media_type=rec.get("content_type", ct), headers={"Cache-Control": "public, max-age=86400"})


# ---------- comments ----------
SPAM_WORDS = ("viagra", "casino", "crypto giveaway", "loan offer", "porn", "betting")


def thread(items):
    by = {c["comment_id"]: {**c, "replies": []} for c in items}
    roots = []
    for c in by.values():
        if c.get("parent_id") and c["parent_id"] in by:
            by[c["parent_id"]]["replies"].append(c)
        else:
            roots.append(c)
    for c in by.values():
        c["replies"].sort(key=lambda x: x["created_at"])
    return roots


def comment_out(c, uid):
    c = {k: v for k, v in c.items() if k not in ("likes", "reporters")}
    return c


@api.get("/forts/{slug}/comments")
async def fort_comments(slug: str, request: Request):
    u = await optional_user(request)
    uid = u["user_id"] if u else None
    items = await db.comments.find({"fort_slug": slug, "status": "approved"}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    for c in items:
        c["liked"] = uid in c.get("likes", [])
        c.pop("likes", None)
        c.pop("reporters", None)
    pending = 0
    if uid:
        pending = await db.comments.count_documents({"fort_slug": slug, "user_id": uid, "status": "pending"})
    return {"items": thread(items), "my_pending": pending}


@api.post("/forts/{slug}/comments")
async def post_comment(slug: str, body: CommentIn, u=Depends(current_user)):
    if not await db.forts.find_one({"slug": slug}):
        raise HTTPException(404, "Fort not found")
    if body.website:
        raise HTTPException(400, "Rejected")
    recent = await db.comments.count_documents({"user_id": u["user_id"], "created_at": {"$gt": (now() - timedelta(minutes=10)).isoformat()}})
    if recent >= 5:
        raise HTTPException(429, "You're posting too fast. Please wait a few minutes.")
    if body.parent_id and not await db.comments.find_one({"comment_id": body.parent_id, "fort_slug": slug}):
        raise HTTPException(400, "Parent comment not found")
    body.images = await own_paths(body.images[:4], u["user_id"])
    text = body.text.strip()
    low = text.lower()
    suspicious = len(re.findall(r"https?://", low)) > 1 or any(w in low for w in SPAM_WORDS)
    status = "pending" if (suspicious or body.images) and u.get("role") != "admin" else "approved"
    c = {"comment_id": f"c_{uuid.uuid4().hex[:12]}", "fort_slug": slug, "user_id": u["user_id"], "user_name": u["name"],
         "user_picture": u.get("picture"), "parent_id": body.parent_id, "kind": body.kind, "text": text,
         "images": [f"/api/files/{p}" for p in body.images[:4]], "likes": [], "like_count": 0, "reporters": [],
         "report_count": 0, "status": status, "created_at": iso()}
    await db.comments.insert_one(c)
    c.pop("_id", None)
    return comment_out(c, u["user_id"])


@api.post("/comments/{cid}/like")
async def like_comment(cid: str, u=Depends(current_user)):
    c = await db.comments.find_one({"comment_id": cid})
    if not c:
        raise HTTPException(404, "Not found")
    if u["user_id"] in c.get("likes", []):
        await db.comments.update_one({"comment_id": cid}, {"$pull": {"likes": u["user_id"]}, "$inc": {"like_count": -1}})
        liked = False
    else:
        await db.comments.update_one({"comment_id": cid}, {"$addToSet": {"likes": u["user_id"]}, "$inc": {"like_count": 1}})
        liked = True
    n = await db.comments.find_one({"comment_id": cid}, {"_id": 0, "like_count": 1})
    return {"liked": liked, "like_count": n["like_count"]}


@api.post("/comments/{cid}/report")
async def report_comment(cid: str, body: ReportIn, u=Depends(current_user)):
    c = await db.comments.find_one({"comment_id": cid})
    if not c:
        raise HTTPException(404, "Not found")
    if c["user_id"] == u["user_id"]:
        raise HTTPException(400, "You cannot report your own post")
    if u["user_id"] in c.get("reporters", []):
        return {"ok": True, "already": True}
    upd = {"$addToSet": {"reporters": u["user_id"]}, "$inc": {"report_count": 1}, "$push": {"report_reasons": body.reason}}
    await db.comments.update_one({"comment_id": cid}, upd)
    if c.get("report_count", 0) + 1 >= 3:
        await db.comments.update_one({"comment_id": cid}, {"$set": {"status": "pending"}})
    return {"ok": True}


@api.delete("/comments/{cid}")
async def delete_own_comment(cid: str, u=Depends(current_user)):
    c = await db.comments.find_one({"comment_id": cid})
    if not c or (c["user_id"] != u["user_id"] and u.get("role") != "admin"):
        raise HTTPException(404, "Not found")
    ids, frontier = [cid], [cid]
    while frontier:
        kids = await db.comments.find({"parent_id": {"$in": frontier}}, {"_id": 0, "comment_id": 1}).to_list(1000)
        frontier = [k["comment_id"] for k in kids]
        ids += frontier
    await db.comments.delete_many({"comment_id": {"$in": ids}})
    return {"ok": True}


@api.get("/community/recent")
async def community_recent(kind: Optional[str] = None, limit: int = Query(20, le=100)):
    f = {"status": "approved"}
    if kind:
        f["kind"] = kind
    items = await db.comments.find(f, {"_id": 0, "likes": 0, "reporters": 0}).sort("created_at", -1).limit(limit).to_list(limit)
    names = {x["slug"]: x["name"] for x in await db.forts.find({}, {"_id": 0, "slug": 1, "name": 1}).to_list(2000)}
    for c in items:
        c["fort_name"] = names.get(c["fort_slug"], c["fort_slug"])
    top = await db.forts.find({"published": True}, CARD_FIELDS).sort("views", -1).limit(6).to_list(6)
    return {"items": items, "recommended": top}


@api.get("/users/{user_id}")
async def user_profile(user_id: str):
    u = await db.users.find_one({"user_id": user_id}, {"_id": 0, "name": 1, "picture": 1, "bio": 1, "created_at": 1, "user_id": 1, "role": 1})
    if not u:
        raise HTTPException(404, "User not found")
    u["comments"] = await db.comments.find({"user_id": user_id, "status": "approved"}, {"_id": 0, "likes": 0, "reporters": 0}).sort("created_at", -1).limit(30).to_list(30)
    return u


# ---------- favourites & itineraries ----------
@api.post("/me/favorites/{slug}")
async def toggle_fav(slug: str, u=Depends(current_user)):
    favs = u.get("favorites") or []
    if slug in favs:
        await db.users.update_one({"user_id": u["user_id"]}, {"$pull": {"favorites": slug}})
        return {"favorited": False}
    if not await db.forts.find_one({"slug": slug}):
        raise HTTPException(404, "Fort not found")
    await db.users.update_one({"user_id": u["user_id"]}, {"$addToSet": {"favorites": slug}})
    return {"favorited": True}


@api.get("/me/favorites")
async def my_favs(u=Depends(current_user)):
    return await db.forts.find({"slug": {"$in": u.get("favorites") or []}}, CARD_FIELDS).to_list(500)


@api.get("/me/itineraries")
async def my_its(u=Depends(current_user)):
    return await db.itineraries.find({"user_id": u["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


@api.post("/me/itineraries")
async def save_it(body: ItineraryIn, u=Depends(current_user)):
    it = {"itinerary_id": f"it_{uuid.uuid4().hex[:10]}", "user_id": u["user_id"], **body.model_dump(), "created_at": iso()}
    await db.itineraries.insert_one(it)
    it.pop("_id", None)
    return it


@api.delete("/me/itineraries/{iid}")
async def del_it(iid: str, u=Depends(current_user)):
    await db.itineraries.delete_one({"itinerary_id": iid, "user_id": u["user_id"]})
    return {"ok": True}


@api.get("/me/submissions")
async def my_subs(u=Depends(current_user)):
    return await db.submissions.find({"user_id": u["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)


# ---------- submissions ----------
async def own_paths(paths, uid):
    if not paths:
        return []
    ok = await db.files.find({"storage_path": {"$in": paths}, "user_id": uid, "is_deleted": False}, {"_id": 0, "storage_path": 1}).to_list(50)
    okset = {o["storage_path"] for o in ok}
    return [p for p in paths if p in okset]


@api.post("/submissions")
async def submit(body: SubmissionIn, u=Depends(current_user)):
    body.images = await own_paths(body.images[:8], u["user_id"])
    s = {"submission_id": f"s_{uuid.uuid4().hex[:10]}", "user_id": u["user_id"], "user_name": u["name"], "user_email": u["email"],
         **body.model_dump(), "images": [f"/api/files/{p}" for p in body.images[:8]], "status": "pending", "admin_note": None, "created_at": iso()}
    await db.submissions.insert_one(s)
    s.pop("_id", None)
    return s


# ---------- analytics ----------
@api.post("/track")
async def track(body: TrackIn):
    await db.pageviews.insert_one({"path": body.path, "date": now().strftime("%Y-%m-%d"), "ts": iso()})
    return {"ok": True}


# ---------- admin ----------
admin = APIRouter(prefix="/api/admin", dependencies=[Depends(admin_user)])


@admin.get("/stats")
async def admin_stats():
    days = [(now() - timedelta(days=i)).strftime("%Y-%m-%d") for i in range(13, -1, -1)]
    agg = await db.pageviews.aggregate([{"$match": {"date": {"$in": days}}}, {"$group": {"_id": "$date", "n": {"$sum": 1}}}]).to_list(30)
    m = {a["_id"]: a["n"] for a in agg}
    top_paths = await db.pageviews.aggregate([{"$group": {"_id": "$path", "n": {"$sum": 1}}}, {"$sort": {"n": -1}}, {"$limit": 8}]).to_list(8)
    return {
        "counts": {"forts": await db.forts.count_documents({}), "stories": await db.stories.count_documents({}),
                   "photos": await db.photos.count_documents({}), "users": await db.users.count_documents({}),
                   "comments": await db.comments.count_documents({}),
                   "pending_comments": await db.comments.count_documents({"status": "pending"}),
                   "pending_submissions": await db.submissions.count_documents({"status": "pending"}),
                   "pageviews": await db.pageviews.count_documents({})},
        "traffic": [{"date": d[5:], "views": m.get(d, 0)} for d in days],
        "top_forts": await db.forts.find({}, {"_id": 0, "slug": 1, "name": 1, "views": 1}).sort("views", -1).limit(8).to_list(8),
        "top_paths": [{"path": t["_id"], "views": t["n"]} for t in top_paths],
    }


@admin.get("/forts")
async def admin_forts(q: Optional[str] = None):
    f = {"name": {"$regex": re.escape(q), "$options": "i"}} if q else {}
    return await db.forts.find(f, {"_id": 0, "slug": 1, "name": 1, "district": 1, "type": 1, "published": 1, "views": 1, "featured": 1}).sort("name", 1).to_list(2000)


@admin.get("/forts/{slug}")
async def admin_get_fort(slug: str):
    f = await db.forts.find_one({"slug": slug}, {"_id": 0})
    if not f:
        raise HTTPException(404, "Not found")
    return f


def clean_fort(d):
    d.pop("_id", None)
    for k in ("nearby", "circuits", "stories", "community_photos"):
        d.pop(k, None)
    if not d.get("slug"):
        d["slug"] = re.sub(r"[^a-z0-9]+", "-", d.get("name", "").lower()).strip("-")
    for k in ("name", "district", "type", "lat", "lng"):
        if d.get(k) in (None, ""):
            raise HTTPException(400, f"Field '{k}' is required")
    d["lat"], d["lng"] = float(d["lat"]), float(d["lng"])
    if not d.get("hero_image") and d.get("gallery"):
        d["hero_image"] = d["gallery"][0].get("url")
    return d


@admin.post("/forts")
async def admin_create_fort(request: Request):
    d = clean_fort(await request.json())
    if await db.forts.find_one({"slug": d["slug"]}):
        raise HTTPException(400, "A fort with this slug already exists")
    base = {"alt_names": [], "associations": [], "events": [], "structures": [], "facts": [], "legends": [], "references": [],
            "gallery": [], "history": [], "travel": {}, "views": 0, "published": True, "featured": False, "verification": "needs_review"}
    d = {**base, **d, "created_at": iso()}
    await db.forts.insert_one(d)
    d.pop("_id", None)
    return d


@admin.put("/forts/{slug}")
async def admin_update_fort(slug: str, request: Request):
    d = clean_fort(await request.json())
    d.pop("views", None)
    d["updated_at"] = iso()
    r = await db.forts.update_one({"slug": slug}, {"$set": d})
    if not r.matched_count:
        raise HTTPException(404, "Not found")
    return await db.forts.find_one({"slug": d["slug"]}, {"_id": 0})


@admin.delete("/forts/{slug}")
async def admin_delete_fort(slug: str):
    await db.forts.delete_one({"slug": slug})
    return {"ok": True}


@admin.get("/stories")
async def admin_stories():
    return await db.stories.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@admin.post("/stories")
async def admin_create_story(request: Request):
    d = await request.json()
    d.pop("_id", None)
    d["slug"] = d.get("slug") or re.sub(r"[^a-z0-9]+", "-", d.get("title", "").lower()).strip("-")
    if not d.get("title"):
        raise HTTPException(400, "Title required")
    if await db.stories.find_one({"slug": d["slug"]}):
        raise HTTPException(400, "Slug exists")
    d = {"body": [], "sources": [], "timeline": [], "fort_slugs": [], "published": True, "status": "documented", "read_time": 5, **d, "created_at": iso()}
    await db.stories.insert_one(d)
    d.pop("_id", None)
    return d


@admin.put("/stories/{slug}")
async def admin_update_story(slug: str, request: Request):
    d = await request.json()
    d.pop("_id", None)
    await db.stories.update_one({"slug": slug}, {"$set": d})
    return await db.stories.find_one({"slug": d.get("slug", slug)}, {"_id": 0})


@admin.delete("/stories/{slug}")
async def admin_delete_story(slug: str):
    await db.stories.delete_one({"slug": slug})
    return {"ok": True}


@admin.get("/photos")
async def admin_photos():
    return await db.photos.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)


@admin.post("/photos")
async def admin_create_photo(request: Request):
    d = await request.json()
    if not d.get("url") or not d.get("title"):
        raise HTTPException(400, "Title and URL required")
    d = {"photo_id": f"p_{uuid.uuid4().hex[:10]}", "published": True, "credit": "", "license": "", "source": "", "category": "Fort Architecture", **d, "created_at": iso()}
    d.pop("_id", None)
    await db.photos.insert_one(d)
    d.pop("_id", None)
    return d


@admin.delete("/photos/{pid}")
async def admin_delete_photo(pid: str):
    await db.photos.delete_one({"photo_id": pid})
    return {"ok": True}


@admin.get("/comments")
async def admin_comments(status: Optional[str] = None):
    f = {}
    if status == "reported":
        f = {"report_count": {"$gt": 0}}
    elif status:
        f = {"status": status}
    return await db.comments.find(f, {"_id": 0, "likes": 0}).sort("created_at", -1).to_list(500)


@admin.patch("/comments/{cid}")
async def admin_comment_status(cid: str, body: StatusIn):
    if body.status not in ("approved", "pending", "hidden"):
        raise HTTPException(400, "Invalid status")
    upd = {"status": body.status}
    if body.status == "approved":
        upd.update({"report_count": 0, "reporters": [], "report_reasons": []})
    await db.comments.update_one({"comment_id": cid}, {"$set": upd})
    return {"ok": True}


@admin.get("/submissions")
async def admin_subs(status: Optional[str] = None):
    return await db.submissions.find({"status": status} if status else {}, {"_id": 0}).sort("created_at", -1).to_list(500)


@admin.patch("/submissions/{sid}")
async def admin_sub_status(sid: str, body: StatusIn):
    if body.status not in ("approved", "rejected", "pending"):
        raise HTTPException(400, "Invalid status")
    s = await db.submissions.find_one({"submission_id": sid}, {"_id": 0})
    if not s:
        raise HTTPException(404, "Not found")
    await db.submissions.update_one({"submission_id": sid}, {"$set": {"status": body.status, "admin_note": body.admin_note, "reviewed_at": iso()}})
    if body.status == "approved" and s["type"] == "photograph" and s.get("status") != "approved":
        for url in s.get("images", []):
            await db.photos.insert_one({"photo_id": f"p_{uuid.uuid4().hex[:10]}", "title": s["title"], "url": url,
                                        "category": "Community Contributions", "credit": s["user_name"], "license": "Contributed by user — rights retained by contributor",
                                        "source": "Community submission", "fort_slug": s.get("fort_slug"), "published": True, "created_at": iso()})
    return {"ok": True}


@admin.get("/users")
async def admin_users():
    return await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(1000)


@admin.patch("/users/{user_id}")
async def admin_user_update(user_id: str, request: Request, me=Depends(admin_user)):
    d = await request.json()
    upd = {}
    if d.get("role") in ("user", "admin"):
        upd["role"] = d["role"]
    if "banned" in d:
        upd["banned"] = bool(d["banned"])
    if user_id == me["user_id"]:
        raise HTTPException(400, "You cannot change your own account here")
    await db.users.update_one({"user_id": user_id}, {"$set": upd})
    return {"ok": True}


@admin.put("/settings")
async def admin_settings(request: Request):
    d = await request.json()
    upd = {k: d[k] for k in ("stats", "districts", "fort_types", "regions") if k in d}
    await db.settings.update_one({"key": "site"}, {"$set": upd})
    return await db.settings.find_one({"key": "site"}, {"_id": 0})


@admin.post("/circuits")
async def admin_save_circuit(request: Request):
    d = await request.json()
    d.pop("_id", None)
    d.pop("fort_details", None)
    d["slug"] = d.get("slug") or re.sub(r"[^a-z0-9]+", "-", d.get("name", "").lower()).strip("-")
    await db.circuits.update_one({"slug": d["slug"]}, {"$set": d}, upsert=True)
    return d


@admin.delete("/circuits/{slug}")
async def admin_del_circuit(slug: str):
    await db.circuits.delete_one({"slug": slug})
    return {"ok": True}


# ---------- SEO ----------
@api.get("/sitemap.xml", response_class=PlainTextResponse)
async def sitemap(request: Request):
    base = os.environ.get("PUBLIC_SITE_URL", "").rstrip("/")
    urls = ["/", "/forts", "/map", "/planner", "/stories", "/gallery", "/community", "/about", "/contribute"]
    urls += [f"/forts/{f['slug']}" for f in await db.forts.find({"published": True}, {"_id": 0, "slug": 1}).to_list(5000)]
    urls += [f"/stories/{s['slug']}" for s in await db.stories.find({"published": True}, {"_id": 0, "slug": 1}).to_list(5000)]
    body = "".join(f"<url><loc>{base}{u}</loc></url>" for u in urls)
    return PlainTextResponse(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{body}</urlset>', media_type="application/xml")


@api.get("/")
async def root():
    return {"message": "Forts of Maharashtra API"}


# ---------- seed ----------
async def seed():
    ae, ap = os.environ["ADMIN_EMAIL"].lower(), os.environ["ADMIN_PASSWORD"]
    if not await db.users.find_one({"email": ae}):
        await db.users.insert_one({"user_id": f"user_{uuid.uuid4().hex[:12]}", "email": ae, "name": "Archive Admin", "picture": None,
                                   "password_hash": hash_password(ap), "role": "admin", "auth_provider": "email", "favorites": [], "bio": "", "created_at": iso()})
    for f in S.FORTS:
        if not await db.forts.find_one({"slug": f["slug"]}):
            await db.forts.insert_one({**f, "created_at": iso()})
    for s in S.STORIES:
        if not await db.stories.find_one({"slug": s["slug"]}):
            await db.stories.insert_one({**s, "author": "Forts of Maharashtra Editorial", "published": True, "created_at": iso()})
    if await db.photos.count_documents({}) == 0:
        for i, p in enumerate(S.PHOTOS):
            ai = p.pop("ai", False)
            await db.photos.insert_one({"photo_id": f"p_seed{i}", **p, "published": True,
                                        "credit": "Forts of Maharashtra (AI-generated illustration)" if ai else "Unsplash contributor",
                                        "license": "Illustration — not a historical record" if ai else "Unsplash License",
                                        "source": "" if ai else "https://unsplash.com", "representative": True, "created_at": iso()})
    for c in S.CIRCUITS:
        await db.circuits.update_one({"slug": c["slug"]}, {"$setOnInsert": c}, upsert=True)
    await db.settings.update_one({"key": "site"}, {"$setOnInsert": {"key": "site", "stats": S.STATS, "districts": S.DISTRICTS,
                                                                    "fort_types": S.FORT_TYPES, "regions": S.REGIONS}}, upsert=True)


async def ensure_indexes():
    for col, models in INDEXES.items():
        for m in models:
            try:
                await db[col].create_indexes([m])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", col, m.document["name"], exc)


app.include_router(api)
app.include_router(admin)


@app.middleware("http")
async def origin_guard(request: Request, call_next):
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        origin = request.headers.get("origin")
        if origin:
            host = request.headers.get("x-forwarded-host") or request.headers.get("host", "")
            allowed = [o.strip() for o in os.environ.get("CORS_ORIGINS", "").split(",") if o.strip()]
            if urlparse(origin).netloc != host.split(",")[0].strip() and origin not in allowed:
                return Response("Forbidden origin", status_code=403)
    return await call_next(request)


app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=[o.strip() for o in os.environ["CORS_ORIGINS"].split(",")],
                   allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
async def startup():
    app.state.index_task = asyncio.create_task(ensure_indexes())
    await seed()
    try:
        await asyncio.to_thread(init_storage)
        logger.info("Storage initialized")
    except Exception as e:
        logger.error("Storage init failed: %s", e)


@app.on_event("shutdown")
async def shutdown():
    app.state.index_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
