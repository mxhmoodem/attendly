export interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
    displayName?: string;
  };
  error?: string;
}
