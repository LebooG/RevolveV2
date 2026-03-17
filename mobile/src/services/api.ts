import axios, { AxiosInstance, AxiosError } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = 'https://api.revolverent.com/api/v1';

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    });

    // Attach auth token to every request
    this.client.interceptors.request.use(async (config) => {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle 401 responses globally
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          await SecureStore.deleteItemAsync('auth_token');
          // Navigation to login would be handled by auth context
        }
        return Promise.reject(error);
      }
    );
  }

  // ─── Auth ───────────────────────────────────────────────
  async requestOtp(phone: string) {
    return this.client.post('/auth/otp/request', { phone });
  }

  async verifyOtp(phone: string, code: string) {
    const res = await this.client.post('/auth/otp/verify', { phone, code });
    if (res.data.token) {
      await SecureStore.setItemAsync('auth_token', res.data.token);
    }
    return res;
  }

  async getProfile() {
    return this.client.get('/auth/profile');
  }

  async updateProfile(data: { name?: string; email?: string }) {
    return this.client.put('/auth/profile', data);
  }

  // ─── Properties ─────────────────────────────────────────
  async getProperties() {
    return this.client.get('/properties');
  }

  async getProperty(id: string) {
    return this.client.get(`/properties/${id}`);
  }

  async createProperty(data: {
    name: string;
    location: string;
    address: string;
    units: number;
  }) {
    return this.client.post('/properties', data);
  }

  async updateProperty(id: string, data: any) {
    return this.client.put(`/properties/${id}`, data);
  }

  // ─── Units ──────────────────────────────────────────────
  async getUnits(propertyId: string) {
    return this.client.get(`/properties/${propertyId}/units`);
  }

  async createUnit(propertyId: string, data: {
    unitNumber: string;
    rentAmount: number;
    type: string;
  }) {
    return this.client.post(`/properties/${propertyId}/units`, data);
  }

  // ─── Tenants ────────────────────────────────────────────
  async getTenants(propertyId?: string) {
    const params = propertyId ? { propertyId } : {};
    return this.client.get('/tenants', { params });
  }

  async getTenant(id: string) {
    return this.client.get(`/tenants/${id}`);
  }

  async addTenant(data: {
    name: string;
    phone: string;
    email?: string;
    unitId: string;
    leaseStart: string;
    leaseEnd: string;
    rentAmount: number;
  }) {
    return this.client.post('/tenants', data);
  }

  async removeTenant(id: string) {
    return this.client.delete(`/tenants/${id}`);
  }

  // ─── Payments ───────────────────────────────────────────
  async getPayments(filters?: {
    tenantId?: string;
    propertyId?: string;
    status?: string;
    from?: string;
    to?: string;
  }) {
    return this.client.get('/payments', { params: filters });
  }

  async initiatePayment(data: {
    tenantId: string;
    amount: number;
    phone: string;
    description?: string;
  }) {
    return this.client.post('/payments/mpesa/initiate', data);
  }

  async getPaymentStatus(transactionId: string) {
    return this.client.get(`/payments/${transactionId}/status`);
  }

  async getLedger(tenantId: string) {
    return this.client.get(`/payments/ledger/${tenantId}`);
  }

  // ─── Leases ─────────────────────────────────────────────
  async getLeases(tenantId?: string) {
    const params = tenantId ? { tenantId } : {};
    return this.client.get('/leases', { params });
  }

  async createLease(data: {
    tenantId: string;
    unitId: string;
    startDate: string;
    endDate: string;
    rentAmount: number;
    terms?: string;
  }) {
    return this.client.post('/leases', data);
  }

  async signLease(leaseId: string, signature: string) {
    return this.client.post(`/leases/${leaseId}/sign`, { signature });
  }

  // ─── Notifications ──────────────────────────────────────
  async getNotifications() {
    return this.client.get('/notifications');
  }

  async markNotificationRead(id: string) {
    return this.client.put(`/notifications/${id}/read`);
  }

  // ─── Messages ───────────────────────────────────────────
  async getConversations() {
    return this.client.get('/messages/conversations');
  }

  async getMessages(conversationId: string) {
    return this.client.get(`/messages/${conversationId}`);
  }

  async sendMessage(conversationId: string, content: string) {
    return this.client.post(`/messages/${conversationId}`, { content });
  }

  // ─── Dashboard / Stats ─────────────────────────────────
  async getDashboard() {
    return this.client.get('/dashboard');
  }

  async getRentSummary(month?: string) {
    const params = month ? { month } : {};
    return this.client.get('/dashboard/rent-summary', { params });
  }
}

export const api = new ApiService();
export default api;
