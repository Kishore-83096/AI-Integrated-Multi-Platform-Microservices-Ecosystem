import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./auth.css";

const AuthPage = () => {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const AUTH_BASE_URL = "http://localhost:8001/api/auth/";

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password) {
      setError("Username and password are required.");
      return;
    }

    try {
      const res = await fetch(`${AUTH_BASE_URL}login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok && data.access && data.refresh) {
        localStorage.setItem("access_token", data.access);
        localStorage.setItem("refresh_token", data.refresh);
        navigate("/chat");
      } else {
        setError(data.error || "Invalid credentials.");
      }
    } catch (err) {
      setError("Server unreachable. Try later.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (!username || !password || !confirmPassword) {
      setError("All fields are required.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const res = await fetch(`${AUTH_BASE_URL}register/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        alert("Registration successful! Please login.");
        setActiveTab("login");
        setUsername("");
        setPassword("");
        setConfirmPassword("");
      } else {
        setError(data.error || "Registration failed.");
      }
    } catch {
      setError("Server unreachable. Try later.");
    }
  };

  return (
    <div className="auth-page-wrapper full-black-white">
      {/* HEADER */}
      <header className="auth-header">
        <h1>IVC Company</h1>
        <span>AIChat Web Application</span>
      </header>

      {/* MAIN GRID */}
      <div className="auth-grid">
        {/* LEFT VISUAL SECTION */}
        <div className="auth-visual-side">
          <h1 className="visual-logo">AI CHAT</h1>
          <h2 className="visual-slogan">Smart. Fast. Seamless.</h2>
          <p className="visual-text">Access your intelligent chat platform securely.</p>
        </div>

        {/* RIGHT FORM CARD */}
        <div className="auth-card">
          <div className="tab-switcher">
            <button
              className={activeTab === "login" ? "tab active" : "tab"}
              onClick={() => {
                setActiveTab("login");
                setError("");
              }}
            >
              Login
            </button>

            <button
              className={activeTab === "register" ? "tab active" : "tab"}
              onClick={() => {
                setActiveTab("register");
                setError("");
              }}
            >
              Register
            </button>
          </div>

          {error && <p className="error-banner">{error}</p>}

          {activeTab === "login" ? (
            <form onSubmit={handleLogin} className="auth-form">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />

              <button type="submit" className="auth-btn">Login</button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="auth-form">
              <input
                type="text"
                placeholder="Username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="auth-input"
              />

              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="auth-input"
              />

              <input
                type="password"
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="auth-input"
              />

              <button type="submit" className="auth-btn">Register</button>
            </form>
          )}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="auth-footer">
        © {new Date().getFullYear()} IVC Company • All Rights Reserved
      </footer>
    </div>
  );
};

export default AuthPage;
