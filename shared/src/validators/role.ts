import { z } from 'zod';
import { PERMISSIONS } from '../constants/permissions';

const permissionValues = Object.values(PERMISSIONS) as [string, ...string[]];

export const createRoleSchema = z.object({
  name: z.string().min(2).max(50),
  permissions: z.array(z.enum(permissionValues)),
});

export const updateRoleSchema = z.object({
  name: z.string().min(2).max(50).optional(),
  permissions: z.array(z.enum(permissionValues)).optional(),
});
