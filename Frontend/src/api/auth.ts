import { api } from './client';
import type { Role, User } from '../types';

export interface SignupPayload {
  name: string;
  email: string;
  password: string;
  role: Role;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export async function signup(payload: SignupPayload) {
  const { data } = await api.post<{ message: string; user: User; token?: string }>(
    '/auth/signup',
    payload,
  );
  return data;
}

export async function login(payload: LoginPayload) {
  const { data } = await api.post<{ message: string; user: User; token?: string }>(
    '/auth/login',
    payload,
  );
  return data;
}

export async function logout() {
  const { data } = await api.post<{ message: string }>('/auth/logout');
  return data;
}

export async function getMe() {
  const { data } = await api.get<{ user: User }>('/auth/me');
  return data.user;
}
