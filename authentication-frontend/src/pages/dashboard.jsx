import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { getProfile } from "../api/auth"; // Make sure you have this API call
import { clearTokens } from "../utils/tokenmanager";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { token, user, login, logout } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch profile on component mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getProfile(); // GET /auth/profile/
        setProfile(response.data);

        // Store user data in context if not already
        if (!user) login(token, response.data);
      } catch (err) {
        setError("Failed to fetch profile. Please login again.");
      } finally {
        setLoading(false);
      }
    };

    if (token) fetchProfile();
    else setLoading(false);
  }, [token, user, login]);

  const handleLogout = () => {
    clearTokens(); // Remove access & refresh tokens
    logout(); // Clear auth context
    navigate("/login", { replace: true });
  };

  if (loading) return <p>Loading profile...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div className="dashboard-container">
      <h2>Dashboard</h2>

      {profile ? (
        <div className="profile-info">
          <p><strong>Full Name:</strong> {profile.full_name}</p>
          <p><strong>Username:</strong> {profile.user.username}</p>
          <p><strong>Email:</strong> {profile.user.email}</p>
          <p><strong>Bio:</strong> {profile.bio || "-"}</p>
          <p><strong>Phone:</strong> {profile.phone_number || "-"}</p>
          <p><strong>Date of Birth:</strong> {profile.date_of_birth || "-"}</p>
          <p><strong>Gender:</strong> {profile.gender || "-"}</p>
          <p><strong>Shipping Address:</strong> {profile.shipping_address || "-"}</p>
          <p><strong>Billing Address:</strong> {profile.billing_address || "-"}</p>
          <p><strong>Preferred Payment:</strong> {profile.preferred_payment_method || "-"}</p>
          <p><strong>UPI ID:</strong> {profile.upi_id || "-"}</p>

          {profile.avatar && (
            <img
              src={profile.avatar}
              alt="Profile Avatar"
              style={{ width: "150px", height: "150px", objectFit: "cover", borderRadius: "50%" }}
            />
          )}
        </div>
      ) : (
        <p>No profile data available.</p>
      )}
       <button onClick={() => navigate("/aichat")}>Go to AI Chatbot</button>

      <button
        onClick={handleLogout}
        style={{
          marginTop: "20px",
          padding: "10px 20px",
          backgroundColor: "red",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
        }}
      >
        Logout
      </button>
    </div>
  );
};

export default Dashboard;
