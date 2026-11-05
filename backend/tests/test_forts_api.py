# Forts of Maharashtra - backend regression tests (auth, forts, comments, favourites, itineraries, submissions, admin)
import os
import io
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL")
if not BASE_URL:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL="):
                BASE_URL = line.split("=", 1)[1].strip()
BASE_URL = BASE_URL.rstrip("/")
API = f"{BASE_URL}/api"
ADMIN = {"email": "admin@fortsofmaharashtra.in", "password": "FortAdmin@2026"}


def new_session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def admin_s():
    s = new_session()
    r = s.post(f"{API}/auth/login", json=ADMIN)
    if r.status_code != 200:
        pytest.skip(f"admin login failed {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="module")
def user_s():
    s = new_session()
    email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    r = s.post(f"{API}/auth/register", json={"email": email, "password": "test1234", "name": "TEST_User"})
    assert r.status_code == 200, r.text
    s.user = r.json()
    s.email = email
    return s


# ---- public content ----
class TestPublic:
    def test_root(self):
        r = requests.get(f"{API}/")
        assert r.status_code == 200 and "Forts" in r.json()["message"]

    def test_forts_list_pagination(self):
        r = requests.get(f"{API}/forts", params={"page": 1, "limit": 12})
        d = r.json()
        assert r.status_code == 200
        assert d["total"] >= 34 and len(d["items"]) == 12 and d["pages"] == 3
        assert "_id" not in d["items"][0]
        r3 = requests.get(f"{API}/forts", params={"page": 3, "limit": 12}).json()
        assert len(r3["items"]) == d["total"] - 24

    def test_forts_search_and_filters(self):
        d = requests.get(f"{API}/forts", params={"q": "raigad"}).json()
        assert any(i["slug"] == "raigad" for i in d["items"])
        fac = requests.get(f"{API}/forts/facets").json()
        for k in ("district", "region", "type", "difficulty", "letters", "associations"):
            assert fac[k], k
        t = fac["type"][0]
        d = requests.get(f"{API}/forts", params={"type": t, "limit": 100}).json()
        assert d["total"] > 0 and all(i["type"] == t for i in d["items"])
        d = requests.get(f"{API}/forts", params={"letter": "R", "limit": 100}).json()
        assert all(i["name"].upper().startswith("R") for i in d["items"])

    def test_fort_detail(self):
        r = requests.get(f"{API}/forts/raigad")
        assert r.status_code == 200
        f = r.json()
        assert f["slug"] == "raigad" and len(f["nearby"]) == 4
        assert requests.get(f"{API}/forts/nope-xyz").status_code == 404

    def test_map_circuits_settings_stories_photos(self):
        m = requests.get(f"{API}/forts/map").json()
        assert len(m) >= 34 and all("lat" in x for x in m)
        c = requests.get(f"{API}/circuits").json()
        assert len(c) > 0 and c[0]["fort_details"]
        s = requests.get(f"{API}/settings").json()
        assert s["profiled_count"] >= 34 and s["stats"]
        st = requests.get(f"{API}/stories").json()
        assert len(st) > 0
        one = requests.get(f"{API}/stories/{st[0]['slug']}").json()
        assert one["title"] == st[0]["title"]
        p = requests.get(f"{API}/photos").json()
        assert len(p) > 0 and all("credit" in x and "license" in x for x in p)
        comm = requests.get(f"{API}/community/recent").json()
        assert "items" in comm and "recommended" in comm


# ---- auth ----
class TestAuth:
    def test_admin_login_and_me(self, admin_s):
        me = admin_s.get(f"{API}/auth/me").json()
        assert me["role"] == "admin" and "password_hash" not in me

    def test_login_cookie_flags(self):
        r = requests.post(f"{API}/auth/login", json=ADMIN)
        sc = r.headers.get("set-cookie", "").lower()
        assert "access_token" in sc and "httponly" in sc and "secure" in sc and "samesite=none" in sc

    def test_wrong_password(self):
        r = requests.post(f"{API}/auth/login", json={"email": f"nouser_{uuid.uuid4().hex[:6]}@example.com", "password": "bad"})
        assert r.status_code == 401

    def test_brute_force_lockout(self):
        s = new_session()
        email = f"test_lock_{uuid.uuid4().hex[:6]}@example.com"
        s.post(f"{API}/auth/register", json={"email": email, "password": "goodpass1", "name": "TEST_Lock"})
        codes = [requests.post(f"{API}/auth/login", json={"email": email, "password": "wrong"}).status_code for _ in range(5)]
        assert codes == [401] * 5
        r = requests.post(f"{API}/auth/login", json={"email": email, "password": "goodpass1"})
        assert r.status_code == 429

    def test_register_duplicate(self, user_s):
        r = requests.post(f"{API}/auth/register", json={"email": user_s.email, "password": "test1234", "name": "x"})
        assert r.status_code == 400

    def test_profile_update(self, user_s):
        r = user_s.put(f"{API}/me/profile", json={"name": "TEST_Renamed", "bio": "hi"})
        assert r.status_code == 200 and r.json()["name"] == "TEST_Renamed"
        assert user_s.get(f"{API}/auth/me").json()["name"] == "TEST_Renamed"

    def test_origin_guard(self, user_s):
        r = user_s.put(f"{API}/me/profile", json={"bio": "x"}, headers={"Origin": "https://evil.example.com"})
        assert r.status_code == 403

    def test_logout(self):
        s = new_session()
        s.post(f"{API}/auth/register", json={"email": f"test_lo_{uuid.uuid4().hex[:6]}@example.com", "password": "test1234", "name": "TEST_LO"})
        assert s.get(f"{API}/auth/me").status_code == 200
        s.post(f"{API}/auth/logout")
        assert s.get(f"{API}/auth/me").status_code == 401


# ---- comments ----
class TestComments:
    def test_comment_flow(self, user_s, admin_s):
        assert requests.post(f"{API}/forts/raigad/comments", json={"text": "hello"}).status_code == 401
        r = user_s.post(f"{API}/forts/raigad/comments", json={"text": "TEST_ comment great fort", "kind": "question"})
        assert r.status_code == 200, r.text
        c = r.json()
        assert c["status"] == "approved" and c["kind"] == "question"
        rep = user_s.post(f"{API}/forts/raigad/comments", json={"text": "TEST_ reply", "parent_id": c["comment_id"]}).json()
        items = user_s.get(f"{API}/forts/raigad/comments").json()["items"]
        root = next(i for i in items if i["comment_id"] == c["comment_id"])
        assert any(x["comment_id"] == rep["comment_id"] for x in root["replies"])
        l1 = user_s.post(f"{API}/comments/{c['comment_id']}/like").json()
        assert l1 == {"liked": True, "like_count": 1}
        l2 = user_s.post(f"{API}/comments/{c['comment_id']}/like").json()
        assert l2["liked"] is False and l2["like_count"] == 0
        rp = admin_s.post(f"{API}/comments/{c['comment_id']}/report", json={"reason": "TEST reason"})
        assert rp.status_code == 200
        # spam -> pending
        sp = user_s.post(f"{API}/forts/raigad/comments", json={"text": "TEST_ visit http://a.com http://b.com"}).json()
        assert sp["status"] == "pending"
        pend = admin_s.get(f"{API}/admin/comments", params={"status": "pending"}).json()
        assert any(x["comment_id"] == sp["comment_id"] for x in pend)
        assert admin_s.patch(f"{API}/admin/comments/{sp['comment_id']}", json={"status": "approved"}).status_code == 200
        items = requests.get(f"{API}/forts/raigad/comments").json()["items"]
        assert any(i["comment_id"] == sp["comment_id"] for i in items)
        # delete own
        for cid in (c["comment_id"], sp["comment_id"]):
            assert user_s.delete(f"{API}/comments/{cid}").status_code == 200
        items = requests.get(f"{API}/forts/raigad/comments").json()["items"]
        assert not any(i["comment_id"] in (c["comment_id"], rep["comment_id"]) for i in items)

    def test_rate_limit(self):
        s = new_session()
        s.post(f"{API}/auth/register", json={"email": f"test_rl_{uuid.uuid4().hex[:6]}@example.com", "password": "test1234", "name": "TEST_RL"})
        ids, codes = [], []
        for i in range(6):
            r = s.post(f"{API}/forts/sinhagad/comments", json={"text": f"TEST_ rate {i}"})
            codes.append(r.status_code)
            if r.status_code == 200:
                ids.append(r.json()["comment_id"])
        for cid in ids:
            s.delete(f"{API}/comments/{cid}")
        assert codes[:5] == [200] * 5 and codes[5] == 429


# ---- favourites, itineraries, submissions, uploads ----
class TestUserData:
    def test_favorites(self, user_s):
        assert user_s.post(f"{API}/me/favorites/raigad").json()["favorited"] is True
        assert any(f["slug"] == "raigad" for f in user_s.get(f"{API}/me/favorites").json())
        assert user_s.post(f"{API}/me/favorites/raigad").json()["favorited"] is False

    def test_itinerary(self, user_s):
        assert requests.post(f"{API}/me/itineraries", json={"title": "x", "fort_slugs": ["raigad"]}).status_code == 401
        it = user_s.post(f"{API}/me/itineraries", json={"title": "TEST_ trip", "fort_slugs": ["raigad", "pratapgad"], "days": 2}).json()
        assert any(x["itinerary_id"] == it["itinerary_id"] for x in user_s.get(f"{API}/me/itineraries").json())
        user_s.delete(f"{API}/me/itineraries/{it['itinerary_id']}")
        assert not any(x["itinerary_id"] == it["itinerary_id"] for x in user_s.get(f"{API}/me/itineraries").json())

    def test_upload_and_photo_submission_approval(self, user_s, admin_s):
        png = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8cfc0f01f0005000200a1e8a7e10000000049454e44ae426082")
        r = requests.post(f"{API}/uploads", files={"file": ("t.png", io.BytesIO(png), "image/png")}, cookies=user_s.cookies)
        assert r.status_code == 200, r.text
        up = r.json()
        assert requests.get(f"{BASE_URL}{up['url']}").status_code == 200
        bad = requests.post(f"{API}/uploads", files={"file": ("t.txt", io.BytesIO(b"hi"), "text/plain")}, cookies=user_s.cookies)
        assert bad.status_code == 400
        title = f"TEST_ photo {uuid.uuid4().hex[:6]}"
        s = user_s.post(f"{API}/submissions", json={"type": "photograph", "fort_slug": "raigad", "title": title,
                                                    "content": "A TEST photo of the fort gate", "images": [up["path"]]}).json()
        assert s["status"] == "pending"
        assert any(x["submission_id"] == s["submission_id"] for x in user_s.get(f"{API}/me/submissions").json())
        assert admin_s.patch(f"{API}/admin/submissions/{s['submission_id']}", json={"status": "approved"}).status_code == 200
        photos = requests.get(f"{API}/photos", params={"category": "Community Contributions"}).json()
        ph = [p for p in photos if p["title"] == title]
        assert ph and ph[0]["credit"] and ph[0]["license"]
        for p in ph:
            admin_s.delete(f"{API}/admin/photos/{p['photo_id']}")


# ---- admin ----
class TestAdmin:
    def test_non_admin_forbidden(self, user_s):
        for p in ("stats", "forts", "users", "comments", "submissions"):
            assert user_s.get(f"{API}/admin/{p}").status_code == 403, p
        assert requests.get(f"{API}/admin/stats").status_code == 401

    def test_stats(self, admin_s):
        d = admin_s.get(f"{API}/admin/stats").json()
        assert d["counts"]["forts"] >= 34 and len(d["traffic"]) == 14

    def test_fort_crud(self, admin_s):
        slug = f"test-fort-{uuid.uuid4().hex[:6]}"
        assert admin_s.post(f"{API}/admin/forts", json={"slug": slug, "name": "TEST Fort"}).status_code == 400
        r = admin_s.post(f"{API}/admin/forts", json={"slug": slug, "name": "TEST Fort", "district": "Pune", "type": "Hill Fort", "lat": 18.5, "lng": 73.8})
        assert r.status_code == 200, r.text
        assert requests.get(f"{API}/forts/{slug}").status_code == 200
        f = admin_s.get(f"{API}/admin/forts/{slug}").json()
        f["summary"] = "TEST updated summary"
        u = admin_s.put(f"{API}/admin/forts/{slug}", json=f)
        assert u.status_code == 200 and u.json()["summary"] == "TEST updated summary"
        admin_s.delete(f"{API}/admin/forts/{slug}")
        assert requests.get(f"{API}/forts/{slug}").status_code == 404

    def test_story_crud(self, admin_s):
        slug = f"test-story-{uuid.uuid4().hex[:6]}"
        r = admin_s.post(f"{API}/admin/stories", json={"slug": slug, "title": "TEST Story", "category": "Legends", "excerpt": "x"})
        assert r.status_code == 200
        u = admin_s.put(f"{API}/admin/stories/{slug}", json={"title": "TEST Story 2"})
        assert u.json()["title"] == "TEST Story 2"
        admin_s.delete(f"{API}/admin/stories/{slug}")
        assert requests.get(f"{API}/stories/{slug}").status_code == 404

    def test_users_role(self, admin_s, user_s):
        users = admin_s.get(f"{API}/admin/users").json()
        assert all("password_hash" not in u for u in users)
        uid = user_s.user["user_id"]
        assert admin_s.patch(f"{API}/admin/users/{uid}", json={"role": "user"}).status_code == 200

    def test_settings_empty_body(self, admin_s):
        r = admin_s.put(f"{API}/admin/settings", json={})
        assert r.status_code < 500, f"empty settings body -> {r.status_code}"

    def test_user_patch_empty_body(self, admin_s, user_s):
        r = admin_s.patch(f"{API}/admin/users/{user_s.user['user_id']}", json={})
        assert r.status_code < 500, f"empty user patch -> {r.status_code}"


# ---- moderation: 3 reports auto-hide, refresh token ----
class TestModeration:
    def test_three_reports_move_to_pending(self, admin_s):
        def reg():
            s = new_session()
            s.post(f"{API}/auth/register", json={"email": f"test_rep_{uuid.uuid4().hex[:6]}@example.com", "password": "test1234", "name": "TEST_Rep"})
            return s
        author = reg()
        c = author.post(f"{API}/forts/torna/comments", json={"text": "TEST_ to be reported"}).json()
        for _ in range(3):
            assert reg().post(f"{API}/comments/{c['comment_id']}/report", json={"reason": "TEST spam"}).status_code == 200
        items = requests.get(f"{API}/forts/torna/comments").json()["items"]
        assert not any(i["comment_id"] == c["comment_id"] for i in items)
        rep = admin_s.get(f"{API}/admin/comments", params={"status": "reported"}).json()
        assert any(x["comment_id"] == c["comment_id"] and x["report_count"] == 3 for x in rep)
        assert admin_s.delete(f"{API}/comments/{c['comment_id']}").status_code == 200

    def test_refresh(self):
        s = new_session()
        s.post(f"{API}/auth/login", json=ADMIN)
        assert s.post(f"{API}/auth/refresh").status_code == 200
        assert requests.post(f"{API}/auth/refresh").status_code == 401
