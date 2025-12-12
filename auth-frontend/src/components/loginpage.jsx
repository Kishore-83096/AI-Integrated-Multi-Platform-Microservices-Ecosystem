import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./register";

function Login() {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Retry-safe API call
  const safeFetch = async (url, options, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await axios(url, options);
        return response;
      } catch (err) {
        if (i === retries - 1) throw err;
        const delay = Math.pow(2, i) * 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    try {
      const response = await safeFetch("http://localhost:8000/api/auth/login/", {
        method: "POST",
        data: formData,
      });

      const { access, refresh, message } = response.data;

      localStorage.setItem("access", access);
      localStorage.setItem("refresh", refresh);

      setMessage(message || "Login successful!");
      setTimeout(() => navigate("/dashboard"), 1000);
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.error || "Invalid credentials.");
      } else {
        setError("Network error. Could not connect to the server.");
      }
    }
  };

  return (
    <div className="ivc-auth-page-wrapper">
      {/* --- HEADER --- */}
      <header className="ivc-auth-header">
        <div className="header-content-auth">
          <div
            className="logo-container-auth"
            onClick={() => navigate("/")}
            style={{ cursor: "pointer" }}
          >
            <h1 className="ivc-minimal-logo">IVC</h1>
            <span className="logo-subtitle">Indus Valley Corporation</span>
          </div>

          <div className="ivc-auth-nav">
            <span className="nav-link-auth" onClick={() => navigate("/")}>
              Home
            </span>
            <span className="nav-link-auth" onClick={() => console.log("Enterprise page")}>
              Enterprise
            </span>
            <span className="nav-link-auth" onClick={() => console.log("Contact page")}>
              Contact
            </span>
            <p className="auth-header-action">
              New to IVC?
              <span onClick={() => navigate("/register")} className="login-link-header">
                Register
              </span>
            </p>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="register-main-content">
        <div className="register-container">
          <div className="register-grid-card">
            <div className="register-visual-side">
              <h1 className="ivc-logo-visual">IVC</h1>
              <h3 className="visual-slogan">Securely access your IVC ecosystem.</h3>
              <p className="visual-subtext">Single Sign-On | Seamless Access | Unified Billing</p>
            </div>

            <div className="register-card">
              <h2 className="register-title">Log In</h2>
              <form onSubmit={handleSubmit} className="register-form">
                <input
                  type="text"
                  name="username"
                  placeholder="Username"
                  className="register-input"
                  value={formData.username}
                  onChange={handleChange}
                  required
                />
                <input
                  type="password"
                  name="password"
                  placeholder="Password"
                  className="register-input"
                  value={formData.password}
                  onChange={handleChange}
                  required
                />

                <button type="submit" className="register-btn">
                  Log In
                </button>
              </form>

              {message && <p className="success-message">{message}</p>}
              {error && <p className="error-message">{error}</p>}

              <p className="login-redirect">
                Don’t have an account?{" "}
                <span onClick={() => navigate("/register")} className="login-link">
                  Register now
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="ivc-auth-footer">
        <div className="footer-content-auth">
          <p className="copyright">
            &copy; {new Date().getFullYear()} Indus Valley Corporation. All rights reserved.
          </p>
          <div className="footer-links-auth">
            <a href="#privacy">Privacy Policy</a>
            <a href="#terms">Terms of Service</a>
            <a href="#support">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Login;
