import apiAI from "../aichat-api";

export const sendMessage = (data) => apiAI.post("/aibot/chat/", data);
export const getChatSidebar = () => apiAI.get("/aibot/chat-sidebar/");
export const getChatDetail = (chat_id) => apiAI.get("/aibot/chat-detail/", );
export const deleteChat = (chat_id) => apiAI.delete("/aibot/del-aichat/", );
export const createNewChat = () => apiAI.post("/aibot/user-profile/");
