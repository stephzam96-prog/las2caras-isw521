import { httpClient } from './httpClient';
import type {
  LoginPayload,
  LoginResponse,
  RegisterPayload,
  RegisterResponse,
  UserResponse,
} from '../types';

export const authService = {
  login(payload: LoginPayload): Promise<LoginResponse> {
    return httpClient.post<LoginResponse>('/auth/login', payload, { auth: false });
  },
  register(payload: RegisterPayload): Promise<RegisterResponse> {
    return httpClient.post<RegisterResponse>('/auth/register', payload, { auth: false });
  },
  getMe(): Promise<UserResponse> {
    return httpClient.get<UserResponse>('/auth/me');
  },
  activate(token: string): Promise<UserResponse> {
    return httpClient.get<UserResponse>(`/auth/activate/${token}`, { auth: false });
  },
};
