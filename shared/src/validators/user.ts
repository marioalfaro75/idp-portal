import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2),
  roleId: z.string().min(1),
});

export const updateUserSchema = z.object({
  email: z.string().email().optional(),
  displayName: z.string().min(2).optional(),
  roleId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(8).optional(),
});
