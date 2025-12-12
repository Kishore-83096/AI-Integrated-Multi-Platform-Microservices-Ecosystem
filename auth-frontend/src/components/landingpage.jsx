import React from "react";
import { useNavigate } from "react-router-dom";
import "./landingpage.css";

export default function LandingPage() {
  const navigate = useNavigate();

  const handleSubscribe = () => {
    alert("Premium subscription coming soon! Get access to all applications.");
  };

  const handleAppClick = (path) => {
    if (path) {
      navigate(path);
    } else {
      // fallback action for placeholders
      alert("This app is coming soon.");
    }
  };

  return (
    <div className="ivc-minimal-container">
      <header className="ivc-minimal-header">
        <div className="header-content">
          <div className="logo-container">
            <h1 className="ivc-minimal-logo">IVC</h1>
            <span className="logo-subtitle">Indus Valley Corporation</span>
          </div>
          <nav className="ivc-minimal-nav">
            <a href="#enterprise" className="nav-link">
              Enterprise
            </a>
            <a href="#contact" className="nav-link">
              Contact
            </a>
            <button 
              className="nav-btn primary-btn"
              onClick={() => navigate("/register")}
            >
              Register
            </button>
            <button 
              className="nav-btn secondary-btn" 
              onClick={() => navigate("/login")}
            >
              Sign In
            </button>
          </nav>
        </div>
      </header>

      <main className="ivc-hero-minimal-section">
        <div className="hero-grid-container">
          
          {/* LEFT SIDE: Value Proposition & Main CTAs */}
          <div className="hero-text-side">
            <div className="badge">
              Unified Digital Ecosystem
            </div>
            <h1 className="ivc-minimal-title">
              One Account,
              <span className="title-accent"> Infinite Possibilities</span>
            </h1>
            <p className="ivc-minimal-subtitle">
              Access our entire suite of premium applications with a single IVC account. 
              Streamline your digital experience across e-commerce, entertainment, storage, and more.
            </p>
            
            <div className="ivc-minimal-button-group">
              <button 
                className="ivc-minimal-btn text-btn" 
                onClick={handleSubscribe}
              >
                Learn about Premium →
              </button>
            </div>
            
            {/* NEW: Feature Strip - replaces the benefits-grid */}
            <div className="ivc-feature-strip">
              <div className="feature-item">🔐 Single Sign-On  </div>
              <div className="feature-item">🔄 Seamless Access </div>
              <div className="feature-item">🎯 Unified Billing </div>
            </div>

          </div>
          
          {/* RIGHT SIDE: Visual Showcase & New CTA Grid */}
          <div className="hero-visual-side">
             <div className="applications-showcase">
                <h3 className="showcase-title">Access 12+ Applications</h3>
                <div className="app-row">
                  <button
                    type="button"
                    className="app-item"
                    onClick={() => handleAppClick("/apps/ecommerce")}
                  >
                    <div className="app-icon">🛒</div>
                    <span>E-Commerce</span>
                  </button>
                  <button
                    type="button"
                    className="app-item"
                    onClick={() => handleAppClick("/apps/streaming")}
                  >
                    <div className="app-icon">🎬</div>
                    <span>Streaming</span>
                  </button>
                  <button
                    type="button"
                    className="app-item"
                    onClick={() => handleAppClick("/apps/music")}
                  >
                    <div className="app-icon">🎵</div>
                    <span>Music</span>
                  </button>
                  <button
                    type="button"
                    className="app-item"
                    onClick={() => handleAppClick("/apps/cloud")}
                  >
                    <div className="app-icon">☁️</div>
                    <span>Cloud</span>
                  </button>
                </div>
                <div className="app-row secondary-row">
                  <button
                    type="button"
                    className="app-item"
                    onClick={() => handleAppClick("/apps/education")}
                  >
                    <div className="app-icon">📚</div>
                    <span>Education</span>
                  </button>
                  <button
                    type="button"
                    className="app-item"
                    onClick={() => handleAppClick("/apps/productivity")}
                  >
                    <div className="app-icon">💼</div>
                    <span>Productivity</span>
                  </button>
                  <button
                    type="button"
                    className="app-item"
                    onClick={() => handleAppClick("/apps/news")}
                  >
                    <div className="app-icon">📰</div>
                    <span>News</span>
                  </button>
                  <div className="app-item empty-placeholder" role="presentation" aria-hidden="true">
                  </div>
                </div>
            </div>
            
            <div className="cta-grid">
                <button 
                    className="cta-grid-btn primary-btn" 
                    onClick={() => navigate("/register")}
                >
                    Create New Account
                </button>
                <button 
                    className="cta-grid-btn secondary-btn" 
                    onClick={() => navigate("/login")}
                >
                    Login
                </button>
            </div>

            
          </div>

        </div>
      </main>

      <footer className="ivc-minimal-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>Indus Valley Corporation</h4>
            <p>Simplifying digital experiences</p>
          </div>
          <div className="footer-links">
            <a href="#privacy">Privacy</a>
            <a href="#terms">Terms</a>
            <a href="#enterprise">Enterprise</a>
            <a href="#support">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}