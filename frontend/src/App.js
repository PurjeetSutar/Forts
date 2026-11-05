import { useEffect } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Lenis from "lenis";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/context/AuthContext";
import { I18nProvider } from "@/context/I18nContext";
import { api } from "@/lib/api";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthCallback from "@/components/AuthCallback";
import Home from "@/pages/Home";
import Directory from "@/pages/Directory";
import FortDetail from "@/pages/FortDetail";
import MapPage from "@/pages/MapPage";
import Planner from "@/pages/Planner";
import Stories from "@/pages/Stories";
import StoryDetail from "@/pages/StoryDetail";
import Gallery from "@/pages/Gallery";
import Community from "@/pages/Community";
import About from "@/pages/About";
import Contribute from "@/pages/Contribute";
import Login from "@/pages/Login";
import Profile from "@/pages/Profile";
import UserProfile from "@/pages/UserProfile";
import Admin from "@/pages/Admin";

function Effects() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    if (!pathname.startsWith("/admin")) api.post("/track", { path: pathname }).catch(() => {});
  }, [pathname]);
  useEffect(() => {
    if (pathname === "/map" || pathname.startsWith("/admin")) return;
    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    let id;
    const raf = (t) => { lenis.raf(t); id = requestAnimationFrame(raf); };
    id = requestAnimationFrame(raf);
    return () => { cancelAnimationFrame(id); lenis.destroy(); };
  }, [pathname]);
  return null;
}

function AppRouter() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
  return (
    <>
      <Effects />
      <Navbar />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/forts" element={<Directory />} />
          <Route path="/forts/:slug" element={<FortDetail />} />
          <Route path="/map" element={<MapPage />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/stories" element={<Stories />} />
          <Route path="/stories/:slug" element={<StoryDetail />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/community" element={<Community />} />
          <Route path="/about" element={<About />} />
          <Route path="/contribute" element={<Contribute />} />
          <Route path="/login" element={<Login />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/users/:id" element={<UserProfile />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <div className="App">
      <HelmetProvider>
        <I18nProvider>
          <AuthProvider>
            <BrowserRouter>
              <AppRouter />
              <Toaster position="bottom-right" toastOptions={{ className: "rounded-none" }} />
            </BrowserRouter>
          </AuthProvider>
        </I18nProvider>
      </HelmetProvider>
    </div>
  );
}
