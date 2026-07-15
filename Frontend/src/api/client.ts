import axios, { AxiosError } from 'axios';
import type { ApiError } from '../types';

const baseURL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<ApiError>;
    if (!axiosError.response) {
      return 'Backend server is currently undergoing maintenance. Please try again later.';
    }
    if (axiosError.response.status === 502) {
      return 'Backend server is currently undergoing maintenance. Please try again later.';
    }
    const message = axiosError.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
    return axiosError.message;
  }
  if (error instanceof Error) return error.message;
  return 'Backend server is currently undergoing maintenance. Please try again later.';
}
