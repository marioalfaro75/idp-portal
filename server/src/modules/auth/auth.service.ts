import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { prisma } from '../../prisma';
import { UnauthorizedError, ConflictError, AppError } from '../../utils/errors';
import type { AuthResponse, JwtPayload } from '@idp/shared';

function generateToken(user: { id: string; email: string }, role: { name: string; permissions: string }): { token: string; jti: string; expiresAt: Date } {
  const jti = uuid();
  const permissions = JSON.parse(role.permissions) as string[];
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: role.name, permissions, jti },
    process.env.JWT_SECRET!,
    { expiresIn } as jwt.SignOptions,
  );

  const decoded = jwt.decode(token) as JwtPayload;
  const expiresAt = new Date(decoded.exp * 1000);

  return { token, jti, expiresAt };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({ where: { email }, include: { role: true } });
  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password');
  }
  if (!user.isActive) {
    throw new UnauthorizedError('Account is disabled');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const { token, jti, expiresAt } = generateToken(user, user.role);
  await prisma.session.create({ data: { jti, userId: user.id, expiresAt } });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: JSON.parse(user.role.permissions),
      },
    },
  };
}

export async function setup(email: string, password: string, displayName: string): Promise<AuthResponse> {
  const existing = await prisma.systemSetting.findUnique({ where: { key: 'setup.complete' } });
  if (existing?.value === 'true') {
    throw new ConflictError('Setup already completed');
  }

  const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
  if (!adminRole) {
    throw new AppError(500, 'Admin role not found. Run database seed first.');
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictError('User already exists');
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { email, displayName, passwordHash, roleId: adminRole.id },
    include: { role: true },
  });

  await prisma.systemSetting.create({ data: { key: 'setup.complete', value: 'true' } });

  const { token, jti, expiresAt } = generateToken(user, user.role);
  await prisma.session.create({ data: { jti, userId: user.id, expiresAt } });

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: JSON.parse(user.role.permissions),
      },
    },
  };
}

export async function logout(jti: string): Promise<void> {
  await prisma.session.deleteMany({ where: { jti } });
}

export async function isSetupComplete(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: 'setup.complete' } });
  return setting?.value === 'true';
}

export async function getMe(userId: string): Promise<AuthResponse['user']> {
  const user = await prisma.user.findUnique({ where: { id: userId }, include: { role: true } });
  if (!user) throw new UnauthorizedError('User not found');
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: {
      id: user.role.id,
      name: user.role.name,
      permissions: JSON.parse(user.role.permissions),
    },
  };
}
