export type Role = 'ADMIN' | 'USER';

export interface User {
  id: string;
  username: string;
  email?: string;
  phoneNumber?: string;
  role: Role;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface ActivationCredentials {
  username: string;
  activationCode: string;
}

export interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  adminLogin: (credentials: LoginCredentials) => Promise<void>;
  activateUser: (credentials: ActivationCredentials) => Promise<void>;
  logout: () => void;
}
