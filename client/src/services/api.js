import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('fridgit_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('fridgit_token');
      localStorage.removeItem('fridgit_user');
      // Check auth mode to redirect to the right page
      try {
        const res = await axios.get('/api/auth/mode');
        window.location.href = res.data.secure ? '/login' : '/pick-user';
      } catch {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
