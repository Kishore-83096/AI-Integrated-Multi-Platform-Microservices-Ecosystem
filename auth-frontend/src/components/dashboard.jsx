import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./dashboard.css";

// =================================================================
// 🌟 AVATAR UTILITY FUNCTIONS (Placed outside the component) 🌟
// =================================================================

// Utility to correctly format the avatar URL and add the cache buster
const resolveAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    // Assuming Django serves media from http://localhost:8000
    if (avatarPath.startsWith('http')) {
        return avatarPath;
    }
    // If it's a relative path (e.g., /media/users/avatars/...)
    return `http://localhost:8000${avatarPath}`;
};

// Utility to get user initials for fallback
const getInitials = (fullName, username) => {
    const name = fullName || username || 'User';
    const parts = name.split(/\s+/).filter(p => p.length > 0);

    if (parts.length === 1) {
        return parts[0][0].toUpperCase();
    }
    if (parts.length > 1) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return 'U';
};

// =================================================================
// 🌟 DASHBOARD COMPONENT START 🌟
// =================================================================
function Dashboard() {
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState("");
    const [recentActivity, setRecentActivity] = useState([]);
    const [appStats, setAppStats] = useState({});
    const navigate = useNavigate();

    // Robust API call utility
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

    const loadProfile = async (token) => {
        setError("");
        try {
            const response = await safeFetch("http://localhost:8000/api/auth/profile/", {
                method: "GET",
                headers: { Authorization: `Bearer ${token}` },
            });
            setProfile(response.data);
            loadAppStatistics();
            loadRecentActivity();
        } catch (err) {
            console.error("Profile load failed:", err);
            setError("Failed to load profile. Please log in again.");
        }
    };

    const loadAppStatistics = () => {
        setAppStats({
            totalApps: 6,
            activeSubscriptions: 3,
            storageUsed: "45.2 GB",
            monthlyUsage: "128 hours",
        });
    };

    const loadRecentActivity = () => {
        setRecentActivity([
            { id: 1, app: "Bagit", action: "New order received", time: "2 hours ago", icon: "🛒" },
            { id: 2, app: "Cloud Storage", action: "File uploaded", time: "5 hours ago", icon: "☁️" },
            { id: 3, app: "Vibe", action: "Playlist created", time: "1 day ago", icon: "🎵" },
            { id: 4, app: "OTT", action: "Movie watched", time: "2 days ago", icon: "🎬" },
            { id: 5, app: "AI Chat", action: "New conversation started", time: "3 days ago", icon: "🤖" },
        ]);
    };

    useEffect(() => {
        const token = localStorage.getItem("access");
        if (!token) {
            navigate("/login");
            return;
        }
        loadProfile(token);
    }, [navigate]);

    const handleLogout = () => {
        localStorage.removeItem("access");
        localStorage.removeItem("refresh");
        navigate("/login");
    };

    const handleAppClick = (appUrl) => {
        window.open(appUrl, "_blank", "noopener,noreferrer");
    };

    // Updated Subscribe button to navigate internally
    const handleSubscribeClick = () => {
        navigate("/subscribe");
    };

    const user = profile?.user;

    const appCategories = [
        {
            category: "Business & Shopping",
            apps: [{ id: "bagit", name: "Bagit", icon: "🛍️", url: "https://bagit.example.com" }],
        },
        {
            category: "Media & Entertainment",
            apps: [
                { id: "vibe", name: "Vibe", icon: "🎵", url: "https://vibe.example.com" },
                { id: "ott", name: "OTT", icon: "🎬", url: "https://ott.example.com" },
            ],
        },
        {
            category: "Productivity & Storage",
            apps: [{ id: "cloud", name: "IVC Drive", icon: "☁️", url: "https://cloud.example.com" }],
        },
        {
            category: "Communication & AI",
            apps: [
                { id: "ai-chat", name: "AI Chat", icon: "🤖", url: "https://ai-chat.example.com" },
                { id: "sol", name: "Sol", icon: "💬", url: "https://sol.example.com" },
            ],
        },
    ];

    const allApps = appCategories.flatMap((cat) => cat.apps);

    return (
        <main className="dashboard-main-content">
            {/* Welcome Section - Top */}
            <div className="dashboard-header">
                <div className="welcome-section">
                    <h1>Welcome to Your Digital Hub</h1>
                    <div className="user-greeting">
                        Hello, <span className="highlight">{user ? user.username : "User"}</span>!
                    </div>
                </div>
                <button className="subscribe-header-btn" onClick={handleSubscribeClick}>
                    Subscribe
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}

            {/* Main Content with Proper Vertical Alignment */}
            <div className="dashboard-content">
                {/* Top Section: Account Summary and Stats side by side */}
                <div className="top-section">
                    {/* Account Summary */}
                    <div className="account-summary">
                        <div className="profile-summary">
                            {profile && (
                                <div className="profile-avatar">
                                    {profile.avatar ? (
                                        <img
                                            src={`${resolveAvatarUrl(profile.avatar)}?t=${new Date(profile.updated_at).getTime()}`}
                                            alt={`${profile.full_name || user?.username}'s avatar`}
                                            className="profile-avatar-img"
                                        />
                                    ) : (
                                        <div className="profile-initials-fallback">
                                            {getInitials(profile.full_name, user?.username)}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className="profile-info">
                                <h3>{user ? profile?.full_name || user.username : "User"}</h3>
                                <p>{user ? user.email : "Loading..."}</p>
                            </div>
                        </div>
                        <div className="quick-actions">
                            <button className="quick-action-btn" onClick={() => navigate("/profile")}>
                                Account Settings
                            </button>
                            <button className="quick-action-btn" onClick={() => navigate("/billing")}>
                                Billing & Plans
                            </button>
                        </div>
                    </div>

                    {/* Stats Section */}
                    <div className="stats-section">
                        <h2 className="section-title">Dashboard Overview</h2>
                        <div className="stats-grid">
                            <div className="stat-card">
                                <div className="stat-label">Total Applications</div>
                                <div className="stat-value">{appStats.totalApps}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Active Subscriptions</div>
                                <div className="stat-value">{appStats.activeSubscriptions}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Storage Used</div>
                                <div className="stat-value">{appStats.storageUsed}</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-label">Monthly Usage</div>
                                <div className="stat-value">{appStats.monthlyUsage}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Application Suite Section */}
                <div className="apps-section">
                    <h2 className="section-title">Your Application Suite</h2>
                    <div className="apps-grid">
                        {allApps.map((app) => (
                            <div
                                key={app.id}
                                className="app-icon-card"
                                onClick={() => handleAppClick(app.url)}
                            >
                                <div className="app-icon">{app.icon}</div>
                                <div className="app-name">{app.name}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity Section */}
                <div className="recent-activity-section">
                    <h2 className="activity-section-title">📋 Recent Activity</h2>
                    <ul className="activity-list">
                        {recentActivity.map((act) => (
                            <li key={act.id} className="activity-item">
                                <div className="activity-icon">{act.icon}</div>
                                <div className="activity-content">
                                    <div className="activity-app">{act.app}</div>
                                    <div className="activity-action">{act.action}</div>
                                    <div className="activity-time">{act.time}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </main>
    );
}

export default Dashboard;