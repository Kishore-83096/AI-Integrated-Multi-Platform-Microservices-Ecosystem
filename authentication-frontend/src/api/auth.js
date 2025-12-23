// src/api/auth.js
import api from "./index";

// Auth & user profile
export const loginUser = (data) => api.post("api/auth/login/", data);
export const registerUser = (data) => api.post("api/auth/register/", data);
export const getProfile = () => api.get("api/auth/profile/");
export const updateProfile = (data) => api.put("api/auth/profile/update/", data);

// Payment & address
export const getPaymentCards = () => api.get("api/auth/payment-cards/");
export const getAddresses = () => api.get("api/auth/addresses/");

// Subscription plans
export const getPlans = () => api.get("api/auth/plans/");
export const getSubscriptions = () => api.get("api/auth/subscriptions/");

// Password reset
export const passwordResetRequest = (data) => api.post("api/auth/password-reset/", data);
export const passwordResetConfirm = (data) => api.post("api/auth/password-reset-confirm/", data);
