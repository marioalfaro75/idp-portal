export interface LoginRequest {
  email: string;
  password: string;
}

export interface SetupRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  role: {
    id: string;
    name: string;
    permissions: string[];
  };
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  permissions: string[];
  jti: string;
  iat: number;
  exp: number;
}

