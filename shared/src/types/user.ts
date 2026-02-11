export interface User {
  id: string;
  email: string;
  displayName: string;
  isActive: boolean;
  roleId: string;
  role?: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  displayName: string;
  roleId: string;
}

export interface UpdateUserRequest {
  email?: string;
  displayName?: string;
  roleId?: string;
  isActive?: boolean;
  password?: string;
}

export interface CreateRoleRequest {
  name: string;
  permissions: string[];
}

export interface UpdateRoleRequest {
  name?: string;
  permissions?: string[];
}
