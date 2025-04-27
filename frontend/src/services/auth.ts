import { AxiosResponse } from 'axios';
import api from './api';
import { LoginCredentials, ActivationCredentials, User } from '@/types/auth';

interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/login', credentials);
    return response.data;
  },

  async adminLogin(credentials: LoginCredentials): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/admin/login', credentials);
    return response.data;
  },

  async activateUser(credentials: ActivationCredentials): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await api.post('/auth/activate', credentials);
    return response.data;
  },

  async getMe(): Promise<User> {
    const response: AxiosResponse<User> = await api.get('/auth/me');
    return response.data;
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.patch('/auth/update-password', {
      currentPassword,
      newPassword,
    });
  },
};
