import React, { useEffect, useState, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import apiAI from "../api/aichat-api";

const AVAILABLE_MODELS = ["tinyllama", "mistral"];

/* -------------------------------
   Utils
-------------------------------- */
const formatTime = (isoString) => {
    if (!isoString) return "";
    try {
        return new Date(isoString).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return "";
    }
};

/* ===============================
   DASHBOARD
================================ */
const Dashboard = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();
    const messagesEndRef = useRef(null);

    const [profile, setProfile] = useState({ full_name: "", avatar: "" });
    const [profileLoading, setProfileLoading] = useState(true);

    const [sidebarChats, setSidebarChats] = useState([]);
    const [selectedChatId, setSelectedChatId] = useState(null);

    const [messages, setMessages] = useState([]);
    const [inputMessage, setInputMessage] = useState("");

    const [modelType, setModelType] = useState(AVAILABLE_MODELS[0]);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    /* -------------------------------
       Scroll to bottom
    -------------------------------- */
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleUnauthorized = () => {
        alert("Session expired. Please login again.");
        logout();
        navigate("/login", { replace: true });
    };

    /* -------------------------------
       Fetch Profile
    -------------------------------- */
    useEffect(() => {
        const fetchProfile = async () => {
            setProfileLoading(true);
            try {
                const res = await apiAI.get("/aibot/user-profile/");
                setProfile(res.data);
            } catch (err) {
                if (err.response?.status === 401) handleUnauthorized();
            } finally {
                setProfileLoading(false);
            }
        };
        fetchProfile();
    }, []);

    /* -------------------------------
       Sidebar Chats
    -------------------------------- */
    const loadSidebarChats = async () => {
        try {
            const res = await apiAI.get("/aibot/chat-sidebar/");
            setSidebarChats(res.data.chats || []);
        } catch (err) {
            if (err.response?.status === 401) handleUnauthorized();
        }
    };

    useEffect(() => {
        loadSidebarChats();
    }, []);

    /* -------------------------------
       FETCH CHAT DETAIL (V2 FIX)
    -------------------------------- */
    useEffect(() => {
        if (!selectedChatId) return;

        const fetchMessages = async () => {
            setLoading(true);
            setError("");

            try {
                const res = await apiAI.post("/aibot/chat-detail/", {
                    chat_id: selectedChatId,
                });

                const backendData = Array.isArray(res.data?.conversation)
                    ? res.data.conversation
                    : [];

                const uiMessages = [];

                backendData.forEach(item => {
                    if (item.user_message) {
                        uiMessages.push({
                            role: "user",
                            content: item.user_message,
                            timestamp: item.user_timestamp,

                        });
                    }

                    if (item.ai_response) {
                        uiMessages.push({
                            role: "assistant",
                            content: item.ai_response,
                            model: item.model,
                            time_taken: item.time_taken_ms,
                            timestamp: item.ai_timestamp,
                            intent_type: item.intent_type,
                        });
                    }
                });

                setMessages(uiMessages);
            } catch (err) {
                if (err.response?.status === 401) handleUnauthorized();
                else setError("Failed to load chat messages.");
            } finally {
                setLoading(false);
            }
        };

        fetchMessages();
    }, [selectedChatId]);

    /* -------------------------------
       SEND MESSAGE
    -------------------------------- */
    const handleSendMessage = async () => {
        if (!inputMessage.trim() || loading) return;

        const content = inputMessage.trim();
        const userTimestamp = new Date().toISOString();

        const optimisticUserMsg = {
            role: "user",
            content,
            timestamp: userTimestamp,
        };

        setMessages(prev => [...prev, optimisticUserMsg]);
        setInputMessage("");
        setLoading(true);
        setError("");

        try {
            const res = await apiAI.post("/aibot/chat/", {
                chat_id: selectedChatId,
                message: content,
                model_type: modelType,
                user_timestamp: userTimestamp,
            });

            if (!selectedChatId && res.data.chat_id) {
                setSelectedChatId(res.data.chat_id);
                await loadSidebarChats();
            }

            const aiMsg = {
                role: "assistant",
                content: res.data.ai_response,
                model: res.data.model_type,
                time_taken: res.data.time_taken_ms,
                timestamp: res.data.ai_response_timestamp,
            };

            setMessages(prev => [...prev, aiMsg]);
        } catch (err) {
            if (err.response?.status === 401) handleUnauthorized();
            else setError("Failed to send message.");
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setLoading(false);
        }
    };

    /* -------------------------------
       DELETE CHAT
    -------------------------------- */
    const handleDeleteChat = async (chatId) => {
        if (!window.confirm("Are you sure you want to delete this chat?")) return;

        try {
            await apiAI.post("/aibot/del-aichat/", { chat_id: chatId });
            setSidebarChats(prev => prev.filter(c => c.chat_id !== chatId));

            if (chatId === selectedChatId) {
                setSelectedChatId(null);
                setMessages([]);
            }
        } catch (err) {
            if (err.response?.status === 401) handleUnauthorized();
        }
    };

    /* ===============================
       UI
    ================================ */
    return (
        <div style={{ display: "flex", height: "100vh" }}>
            {/* SIDEBAR */}
            <div style={{ width: "250px", borderRight: "1px solid #ccc", padding: "1rem", overflowY: "auto" }}>
                <div style={{ marginBottom: "1rem" }}>
                    {profileLoading ? (
                        <p>Loading profile...</p>
                    ) : (
                        <div style={{ textAlign: "center" }}>
                            {profile.avatar && (
                                <img src={profile.avatar} alt="Avatar" style={{ width: 60, borderRadius: "50%" }} />
                            )}
                            <h4>{profile.full_name}</h4>
                        </div>
                    )}
                    <button onClick={logout} style={{ marginTop: "0.5rem", width: "100%" }}>
                        Logout
                    </button>
                </div>

                <button
                    onClick={() => {
                        setSelectedChatId(null);
                        setMessages([]);
                        setInputMessage("");
                    }}
                    style={{ width: "100%", padding: "0.5rem", marginBottom: "1rem" }}
                >
                    + New Chat
                </button>

                <h4>Chats</h4>
                {sidebarChats.length === 0 && <p>No chats yet.</p>}
                {sidebarChats.map(chat => (
                    <div
                        key={chat.chat_id}
                        style={{
                            padding: "0.5rem",
                            marginBottom: "0.5rem",
                            backgroundColor: chat.chat_id === selectedChatId ? "#eee" : "#fff",
                            cursor: "pointer",
                            border: "1px solid #ddd",
                            borderRadius: "4px",
                        }}
                    >
                        <div onClick={() => setSelectedChatId(chat.chat_id)}>
                            {chat.title}
                        </div>
                        <button
                            onClick={() => handleDeleteChat(chat.chat_id)}
                            style={{ marginTop: "0.25rem", fontSize: "0.8rem", color: "red" }}
                        >
                            Delete
                        </button>
                    </div>
                ))}
            </div>

            {/* CHAT */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <h3>AI Chat</h3>
                    <select value={modelType} onChange={e => setModelType(e.target.value)}>
                        {AVAILABLE_MODELS.map(m => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                {loading && <p style={{ color: "#007bff" }}>⏳ Processing message in <strong>{modelType}</strong>...</p>}
                {error && <p style={{ color: "red" }}>{error}</p>}

                <div style={{ flex: 1, overflowY: "auto", border: "1px solid #ccc", padding: "1rem", borderRadius: "4px" }}>
                    {messages.length === 0 && <p>Select a chat or start a new conversation.</p>}
                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            style={{
                                marginBottom: "1rem",
                                padding: "0.5rem",
                                borderRadius: "6px",
                                backgroundColor: msg.role === "user" ? "#e6f2ff" : "#f5f5f5",
                                borderLeft: msg.role === "assistant" ? "3px solid #007bff" : "3px solid #6c757d",
                            }}
                        >
                            <div style={{ fontWeight: "bold", marginBottom: "0.25rem" }}>
                                {msg.role === "user" ? profile.full_name || "You" : "AI Assistant"}
                                <span style={{ marginLeft: "10px", fontSize: "0.8rem", color: "#6c757d" }}>
                                    {formatTime(msg.timestamp)}
                                </span>
                            </div>

                            <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>

                            {msg.role === "assistant" && (
                                <div style={{ fontSize: "0.75rem", color: "#007bff", marginTop: "0.5rem" }}>
                                    {msg.model && (
                                        <span>
                                            Model: <strong>{msg.model}</strong>
                                        </span>
                                    )}

                                    {msg.time_taken !== undefined && (
                                        <span style={{ marginLeft: "15px" }}>
                                            Response Time:{" "}
                                            <strong>{(msg.time_taken / 1000).toFixed(2)}s</strong>

                                            <span style={{ marginLeft: "12px" }}>
                                                Intent Type: <strong>{msg.intent_type}</strong>
                                            </span>
                                        </span>
                                    )}
                                </div>

                            )}
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                <div style={{ display: "flex", marginTop: "1rem" }}>
                    <input
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSendMessage()}
                        style={{ flex: 1, padding: "0.5rem" }}
                        placeholder="Type a message..."
                        disabled={loading}
                    />
                    <button
                        onClick={handleSendMessage}
                        style={{ padding: "0.5rem 1rem", marginLeft: "0.5rem" }}
                        disabled={loading || !inputMessage.trim()}
                    >
                        Send
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
