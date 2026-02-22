import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
});

export const updateGroupSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().max(500).optional(),
});

export const updateGroupMembersSchema = z.object({
  userIds: z.array(z.string().uuid()),
});

export const updateGroupTemplatesSchema = z.object({
  templateIds: z.array(z.string().uuid()),
});
