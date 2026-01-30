import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data)
};

// Users
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  getStaff: () => api.get('/users/staff')
};

// Properties
export const propertiesAPI = {
  getAll: () => api.get('/properties'),
  getOne: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`)
};

// Tenants
export const tenantsAPI = {
  getAll: (params) => api.get('/tenants', { params }),
  getOne: (id) => api.get(`/tenants/${id}`),
  create: (data) => api.post('/tenants', data),
  update: (id, data) => api.put(`/tenants/${id}`, data),
  delete: (id) => api.delete(`/tenants/${id}`)
};

// Collections
export const collectionsAPI = {
  getAll: (params) => api.get('/collections', { params }),
  getOne: (id) => api.get(`/collections/${id}`),
  create: (data) => api.post('/collections', data),
  generate: (data) => api.post('/collections/generate', data),
  update: (id, data) => api.put(`/collections/${id}`, data),
  recordPayment: (id, data) => api.put(`/collections/${id}/pay`, data),
  delete: (id) => api.delete(`/collections/${id}`),
  getMyAssigned: () => api.get('/collections/my/assigned')
};

// Dashboard
export const dashboardAPI = {
  getSummary: (params) => api.get('/dashboard/summary', { params }),
  getTrend: (params) => api.get('/dashboard/trend', { params }),
  getUpcoming: () => api.get('/dashboard/upcoming'),
  getOverdue: () => api.get('/dashboard/overdue')
};

// Reports
export const reportsAPI = {
  getCollections: (params) => api.get('/reports/collections', { params }),
  getTenants: (params) => api.get('/reports/tenants', { params }),
  getProperties: (params) => api.get('/reports/properties', { params })
};

// Notifications
export const notificationsAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearAll: () => api.delete('/notifications')
};

export default api;
