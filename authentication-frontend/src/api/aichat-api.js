import axios from "axios";
import { getAccessToken } from "../utils/tokenmanager";

const apiAI = axios.create({
  baseURL: "http://127.0.0.1:8001",
  //timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

apiAI.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default apiAI;
