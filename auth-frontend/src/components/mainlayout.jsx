import React, { useEffect, useState } from "react";
import { Routes, Route, Link, useNavigate } from "react-router-dom";
import Dashboard from "./dashboard";
import Subscribe from "./subscribe";
import Profile from "./profile";
import api from "../api/api"; // Axios instance
import "../components/mainlayout.css";

const MainLayout = () => {
  const navigate = useNavigate();
  const [avatarUrl, setAvatarUrl] = useState(null);

  // Fetch current user's profile to get avatar
  useEffect(() => {
    let mounted = true;
    async function fetchProfile() {
      try {
        const res = await api.get("profile/");
        if (!mounted) return;
        if (res.data?.avatar) {
          setAvatarUrl(resolveAvatarUrl(res.data.avatar));
        }
      } catch (err) {
        console.error("Failed to fetch profile:", err);
      }
    }
    fetchProfile();
    return () => {
      mounted = false;
    };
  }, []);

  function resolveAvatarUrl(avatarPath) {
    if (!avatarPath) return null;
    if (/^https?:\/\//.test(avatarPath)) return avatarPath;
    return `${window.location.origin}${avatarPath.startsWith("/") ? "" : "/"}${avatarPath}`;
  }

  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login", { state: { message: "You have been successfully logged out." } });
  };

  return (
    <div className="main-layout-wrapper">
      {/* --- HEADER --- */}
      <header className="ivc-app-header">
        <div className="header-content-app">
          <div
            className="logo-container-app"
            onClick={() => navigate("/dashboard")}
          >
            <h1 className="ivc-minimal-logo">IVC</h1>
            <span className="ivc-subtitle">Indus Valley Community</span>
          </div>

          <div className="header-actions">
            <nav className="header-nav">
              <Link to="/dashboard">Dashboard</Link>
              
            </nav>

            {/* Avatar + Logout */}
            <div className="header-user-actions">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="header-avatar"
                  onClick={() => navigate("/profile")}
                />
              ) : (
                <div
                  className="header-avatar placeholder"
                  onClick={() => navigate("/profile")}
                >
                  U
                </div>
              )}
              <button onClick={handleLogout} className="logout-btn">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="main-content-area">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/subscribe" element={<Subscribe />} />
          <Route path="/profile" element={<Profile />} />
        </Routes>
      </main>

      {/* --- FOOTER --- */}
      <footer className="ivc-app-footer">
        <div className="footer-content-app">
          <p className="copyright">
            &copy; {new Date().getFullYear()} Indus Valley Corporation. All rights reserved.
          </p>
          <div className="footer-links-app">
            <a href="#privacy" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
            <a href="#terms" onClick={(e) => e.preventDefault()}>Terms of Service</a>
            <a href="#support" onClick={(e) => e.preventDefault()}>Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
