import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Loader } from "@/components/common";

export default function AuthCallback() {
  const done = useRef(false);
  const nav = useNavigate();
  const { setUser } = useAuth();
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const sid = new URLSearchParams(window.location.hash.slice(1)).get("session_id");
    const to = sessionStorage.getItem("returnTo") || "/profile";
    sessionStorage.removeItem("returnTo");
    api.post("/auth/google/session", { session_id: sid })
      .then(({ data }) => { setUser(data); window.history.replaceState(null, "", window.location.pathname); nav(to, { replace: true }); })
      .catch(() => { setUser(false); nav("/login", { replace: true }); });
  }, [nav, setUser]);
  return <Loader />;
}
