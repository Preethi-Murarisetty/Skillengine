export interface AuthUser {
  id?: string | number;
  user_id?: string | number;
  userId?: string | number;
  email?: string;
  fullName?: string;
  full_name?: string;
  name?: string;
  [key: string]: unknown;
}

export function useAuth(): {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (userData: Record<string, unknown>) => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};