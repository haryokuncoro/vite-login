import axios from 'axios';

const API = axios.create({
  baseURL: 'http://localhost:4000/api',
  headers: { 'Content-Type': 'application/json' }
});

export const login = (payload) => API.post('/auth/login', payload);
export const registerUser = (payload) => API.post('/auth/register', payload);
export const forgotPassword = (payload) => API.post('/auth/forgot-password', payload);
export const verify2FA = (payload) => API.post('/auth/verify-2fa', payload);
