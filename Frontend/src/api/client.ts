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
      return 'Cannot reach server. Make sure Backend is running on port 3000 (npm run start:dev).';
    }
    if (axiosError.response.status === 502) {
      return 'Backend unavailable (502). Start the Backend server: cd Backend && npm run start:dev';
    }
    const message = axiosError.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string') return message;
    return axiosError.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong';
}
