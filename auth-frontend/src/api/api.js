import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000/api/auth/",
  headers: { Accept: "application/json" },
});

// attach access token if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access") || localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // useful during development to see why 401s happen
    // console.warn("No auth token found in localStorage");
  }
  return config;
});

// token refresh handling
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // if no response or not 401, forward error
    if (!error.response || error.response.status !== 401) {
      return Promise.reject(error);
    }

    // avoid retrying refresh endpoint or infinite loops
    if (originalRequest._retry) {
      return Promise.reject(error);
    }

    const refreshToken = localStorage.getItem("refresh");
    if (!refreshToken) {
      // no refresh token available — clear auth and redirect to login
      localStorage.removeItem("access");
      localStorage.removeItem("token");
      window.location.href = "/login";
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // queue the request until token is refreshed
      return new Promise(function (resolve, reject) {
        failedQueue.push({ resolve, reject });
      })
        .then((token) => {
          originalRequest.headers.Authorization = "Bearer " + token;
          return api(originalRequest);
        })
        .catch((err) => Promise.reject(err));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      // call refresh endpoint (adjust path if your backend uses a different one)
      const resp = await axios.post(`${api.defaults.baseURL}token/refresh/`, {
        refresh: refreshToken,
      });

      const newAccess = resp.data.access;
      if (!newAccess) throw new Error("No access token in refresh response");

      // store and apply the new token
      localStorage.setItem("access", newAccess);
      api.defaults.headers.common.Authorization = `Bearer ${newAccess}`;
      originalRequest.headers.Authorization = `Bearer ${newAccess}`;

      processQueue(null, newAccess);
      return api(originalRequest);
    } catch (err) {
      processQueue(err, null);
      // refresh failed — clear tokens and redirect to login
      localStorage.removeItem("access");
      localStorage.removeItem("refresh");
      localStorage.removeItem("token");
      window.location.href = "/login";
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  }
);

export default api;