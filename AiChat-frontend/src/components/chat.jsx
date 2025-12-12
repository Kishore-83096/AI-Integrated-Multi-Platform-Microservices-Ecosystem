import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./chat.css";

const Chat = () => {
    const navigate = useNavigate();
    
    // 1. Initialize messages from Local Storage
    const [messages, setMessages] = useState(() => {
        const savedMessages = localStorage.getItem("chat_session_messages");
        return savedMessages ? JSON.parse(savedMessages) : [];
    });
    
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [isSidebarOpen, setSidebarOpen] = useState(true);
    
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    // 2. Save messages to Local Storage whenever they change
    useEffect(() => {
        localStorage.setItem("chat_session_messages", JSON.stringify(messages));
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    // Auto-grow textarea
    const adjustTextareaHeight = () => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 150) + 'px';
        }
    };

    useEffect(() => {
        adjustTextareaHeight();
    }, [input]);

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("chat_session_messages");
        navigate("/");
    };

    const startNewChat = () => {
        if (messages.length > 0) {
             if (window.confirm("Start a new chat? This will clear the current conversation.")) {
                setMessages([]);
                localStorage.removeItem("chat_session_messages");
                setInput("");
                if (textareaRef.current) textareaRef.current.focus();
            }
        } else {
             if (textareaRef.current) textareaRef.current.focus();
        }
    };

    const sendMessage = async () => {
        if (!input.trim()) return;

        const userMessage = { sender: "user", text: input };
        setMessages((prev) => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        // Reset textarea height
        if (textareaRef.current) textareaRef.current.style.height = 'auto';

        try {
            const token = localStorage.getItem("access_token");
            
            // Replace with your actual API endpoint
            // NOTE: This API call is currently non-functional without a backend.
            const res = await fetch("http://localhost:8001/chat/aibot/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ message: userMessage.text }),
            });

            const data = await res.json();
            setLoading(false);

            if (data.reply) {
                const aiMessage = { sender: "ai", text: data.reply };
                setMessages((prev) => [...prev, aiMessage]);
            } else {
                // Placeholder response for development
                const placeholderResponse = "This is a placeholder AI response. The server connection failed or returned an unexpected format.";
                setMessages((prev) => [
                    ...prev,
                    { sender: "ai", text: placeholderResponse },
                ]);
            }
        } catch (err) {
            setLoading(false);
            // Placeholder response for development
            const placeholderResponse = "Server unreachable. Please check your network connection and backend server (e.g., http://localhost:8001).";
            setMessages((prev) => [
                ...prev,
                { sender: "ai", text: placeholderResponse },
            ]);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !e.shiftKey && !loading) {
            e.preventDefault();
            sendMessage();
        }
    };

    return (
        <div className="app-container">
            {/* Sidebar */}
            <aside className={`sidebar ${isSidebarOpen ? "open" : "collapsed"}`}>
                <div className="sidebar-header">
                    {/* New Chat Button */}
                    <button className="new-chat-btn" onClick={startNewChat} title="New Chat">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 5v14M5 12h14"/>
                        </svg>
                        <span className="btn-text">New Chat</span>
                    </button>
                    
                    {/* Toggle Button - ALWAYS VISIBLE and fixed */}
                    <button 
                        className="toggle-sidebar-btn" 
                        onClick={() => setSidebarOpen(!isSidebarOpen)}
                        title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
                    >
                        {isSidebarOpen ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                                <path d="M15 16l-4-4 4-4" /> 
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                                <path d="M13 16l4-4-4-4" /> 
                            </svg>
                        )}
                    </button>
                </div>

                <div className="sidebar-content">
                    {/* History list goes here */}
                </div>

                <div className="sidebar-footer">
                    <div className="user-profile">
                        <div className="avatar">U</div>
                        <div className="user-details">
                            <span className="username">User Account</span>
                            <span className="status">Pro Plan</span>
                        </div>
                    </div>
                    
                </div>
            </aside>

            {/* Main Content */}
            <main className="main-content">
                
                {/* --- NEW: Persistent Header for the Chat Area (Desktop) --- */}
                <header className="main-chat-header">
                    <h1 className="company-name">AiChat  IVC (Indus Valley Corporations)</h1>

                    <button className="logout-header-btn" onClick={handleLogout}>
                        Logout
                    </button>
                </header>

                {/* Mobile Header (For small screens) */}
                <header className="mobile-header">
                    <button onClick={() => setSidebarOpen(true)} className="mobile-menu-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>
                    <span className="brand-title">AiChat</span>
                </header>

                {/* Chat Area */}
                <div className="chat-area">
                    {messages.length === 0 ? (
                        <div className="welcome-screen">
                            <div className="logo-big">IVC</div>
                            <h2>How can I help you today?</h2>
                        </div>
                    ) : (
                        <div className="messages-feed">
                            {messages.map((msg, index) => (
                                <div key={index} className={`message-wrapper ${msg.sender}`}>
                                    <div className="message-content">
                                        <div className="avatar-icon">
                                            {msg.sender === 'user' ? (
                                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                                            ) : (
                                                 <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2 2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"></path><path d="M12 22a2 2 0 0 1 2-2v-2a2 2 0 0 1-2-2 2 2 0 0 1-2 2v2a2 2 0 0 1 2 2z"></path><path d="M20 12a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2a2 2 0 0 1 2 2z"></path><path d="M6 12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2 2 2 0 0 1 2-2h2a2 2 0 0 1 2 2z"></path></svg>
                                            )}
                                        </div>
                                        <div className="text-bubble">
                                            <div className="sender-name">
                                                {msg.sender === 'user' ? 'You' : 'AI Assistant'}
                                            </div>
                                            <div className="markdown-body">{msg.text}</div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            
                            {loading && (
                                <div className="message-wrapper ai">
                                    <div className="message-content">
                                        <div className="avatar-icon ai-icon">
                                            <div className="typing-dot"></div>
                                        </div>
                                        <div className="text-bubble">
                                            <span className="thinking-text">Thinking...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="input-container-wrapper">
                    <div className="input-box">
                        <textarea
                            ref={textareaRef}
                            placeholder="Message AiChat..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyPress}
                            disabled={loading}
                            rows={1}
                        />
                        <button 
                            className={`send-button ${input.trim() ? 'active' : ''}`}
                            onClick={sendMessage}
                            disabled={!input.trim() || loading}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="22" y1="2" x2="11" y2="13"></line>
                                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                            </svg>
                        </button>
                    </div>
                    <div className="disclaimer">
                        AiChat can make mistakes. Consider checking important information.
                    </div>
                </div>
            </main>
        </div>
    );
};

export default Chat;