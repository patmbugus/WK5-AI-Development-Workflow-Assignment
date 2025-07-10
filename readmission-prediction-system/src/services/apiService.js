import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

class ApiService {
  // Prediction endpoint
  async predictReadmission(patientData) {
    try {
      const response = await api.post('/predict/readmission', patientData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Prediction failed');
    }
  }

  // Patient endpoints
  async getPatients() {
    try {
      const response = await api.get('/patients');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch patients');
    }
  }

  async getPatientDetails(patientId) {
    try {
      const response = await api.get(`/patients/${patientId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch patient details');
    }
  }

  // Metrics endpoints
  async getSystemMetrics() {
    try {
      const response = await api.get('/metrics');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch metrics');
    }
  }

  async getBiasMonitoring() {
    try {
      const response = await api.get('/bias-monitoring');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.error || 'Failed to fetch bias monitoring data');
    }
  }

  // Health check
  async healthCheck() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      throw new Error('API health check failed');
    }
  }
}

export default new ApiService();

 