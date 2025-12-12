import React, { useState } from "react";
import axios from "axios";
import "./register.css";
import { useNavigate } from "react-router-dom";

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    // Frontend validation: password match
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // Optional: Check password length or strength
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/auth/register/", {
        username: formData.username,
        password: formData.password,
      });

      setMessage(response.data.message);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      if (err.response && err.response.data) {
        setError(
          err.response.data.username
            ? err.response.data.username[0]
            : "Registration failed."
        );
      } else {
        setError("Server error. Please try again later.");
      }
    }
  };

  return (
    <div className="ivc-auth-page-wrapper">
      
      {/* --- HEADER (UPDATED NAVIGATION) --- */}
      <header className="ivc-auth-header">
        <div className="header-content-auth">
          
          {/* Logo & Brand */}
          <div 
            className="logo-container-auth" 
            onClick={() => navigate("/")} 
            style={{ cursor: 'pointer' }}
          >
            <h1 className="ivc-minimal-logo">IVC</h1>
            <span className="logo-subtitle">Indus Valley Corporation</span>
          </div>
          
          {/* Navigation and Actions */}
          <div className="ivc-auth-nav">
            <span 
              className="nav-link-auth" 
              onClick={() => navigate("/")}
            >
              Home
            </span>
            <span 
              className="nav-link-auth" 
              onClick={() => alert("Redirecting to Enterprise page...")} // Separate link for Enterprise
            >
              Enterprise
            </span>
            <span 
              className="nav-link-auth" 
              onClick={() => alert("Redirecting to Contact page...")} // Separate link for Contact
            >
              Contact
            </span>
            <p className="auth-header-action">
              Already a member? 
              <span onClick={() => navigate("/login")} className="login-link-header">
                Login
              </span>
            </p>
          </div>

        </div>
      </header>

      {/* --- MAIN CONTENT (Existing Register Component) --- */}
      <main className="register-main-content">
        <div className="register-container">
          <div className="register-grid-card">
            
            {/* LEFT SIDE: Visual/Marketing Content (Desktop Only) */}
            <div className="register-visual-side">
              <h1 className="ivc-logo-visual">IVC</h1>
              <h3 className="visual-slogan">Unlock an ecosystem of applications.</h3>
              <p className="visual-subtext">Single Sign-On | Seamless Access | Unified Billing</p>
              
            </div>

            {/* RIGHT SIDE: The Form */}
            <div className="register-card">
              <h2 className="register-title">Create an Account</h2>
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
                <input
                  type="password"
                  name="confirmPassword"
                  placeholder="Confirm Password"
                  className="register-input"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                />
                <button type="submit" className="register-btn">
                  Register
                </button>
              </form>

              {message && <p className="success-message">{message}</p>}
              {error && <p className="error-message">{error}</p>}

              <p className="login-redirect">
                Already have an account?{" "}
                <span onClick={() => navigate("/login")} className="login-link">
                  Login here
                </span>
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="ivc-auth-footer">
        <div className="footer-content-auth">
          <p className="copyright">&copy; {new Date().getFullYear()} Indus Valley Corporation. All rights reserved.</p>
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

export default Register;