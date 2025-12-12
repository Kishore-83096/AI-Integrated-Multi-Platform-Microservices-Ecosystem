import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./subscribe.css"; // Import external CSS file

// Mock plans for preview/fallback
const MOCK_PLANS = [
  {
    id: 1,
    name: "Basic Access",
    description: "Essential features for individual use, including 10GB storage and standard support.",
    price: 9.99,
    duration_days: 30,
    max_devices: 3,
    features: ["10GB Storage", "Standard Support", "HD Streaming"],
    isPopular: false,
  },
  {
    id: 2,
    name: "Pro Unlimited (Recommended)",
    description: "The recommended choice for families and small teams. Everything in Basic, plus advanced features.",
    price: 24.99,
    duration_days: 30,
    max_devices: 10,
    features: ["Unlimited Storage", "Priority Support", "4K Streaming", "Offline Sync"],
    isPopular: true,
  },
  {
    id: 3,
    name: "Enterprise Plus",
    description: "Designed for large organizations requiring custom scaling and dedicated support and security.",
    price: 89.99,
    duration_days: 365,
    max_devices: 50,
    features: ["Custom Integrations", "24/7 Dedicated Manager", "SLA Guarantee", "Advanced Security"],
    isPopular: false,
  },
];

function Subscribe() {
  const [plans, setPlans] = useState(MOCK_PLANS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [subscriptionMessage, setSubscriptionMessage] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlans = async () => {
      setLoading(true);
      try {
        const response = await axios.get("http://localhost:8000/api/auth/plans/");
        setPlans(response.data);
        setError("");
      } catch (err) {
        console.error("Error fetching plans:", err);
        setError("Failed to load plans. Showing mock plans.");
        setPlans(MOCK_PLANS); // fallback
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const handleSubscribe = (planId) => {
    setSubscriptionMessage(`Subscription initiated for plan ID ${planId}.`);
    setTimeout(() => setSubscriptionMessage(null), 3500);
  };

  return (
    <main className="subscribe-page">
      <h1>Choose a Subscription Plan</h1>

      {subscriptionMessage && (
        <div className="message-box">
          {subscriptionMessage}
          <button onClick={() => setSubscriptionMessage(null)}>&times;</button>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="plans-grid">
        {plans.map((plan) => (
          <div key={plan.id} className={`plan-card ${plan.isPopular ? "popular-card" : ""}`}>
            <h3>{plan.name}</h3>
            <p>{plan.description}</p>
            <p><strong>Price:</strong> ${plan.price}</p>
            <p><strong>Duration:</strong> {plan.duration_days} days</p>
            <p><strong>Max Devices:</strong> {plan.max_devices}</p>
            <div className="features">
              <p><strong>Key Features:</strong> {plan.features.join(" | ")}</p>
            </div>
            <button className="subscribe-btn" onClick={() => handleSubscribe(plan.id)}>
              Subscribe Now
            </button>
          </div>
        ))}
      </div>

      <button className="back-btn" onClick={() => navigate("/dashboard")}>
        Back to Dashboard
      </button>
    </main>
  );
}

export default Subscribe;
