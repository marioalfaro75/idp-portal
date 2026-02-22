export interface Group {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  members?: GroupMember[];
  templates?: GroupTemplate[];
  _count?: { members: number; templates: number };
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  user?: { id: string; email: string; displayName: string };
  joinedAt: string;
}

export interface GroupTemplate {
  id: string;
  groupId: string;
  templateId: string;
  template?: { id: string; name: string; provider: string; category: string };
  assignedAt: string;
}

export interface CreateGroupRequest {
  name: string;
  description?: string;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
}

export interface UpdateGroupMembersRequest {
  userIds: string[];
}

export interface UpdateGroupTemplatesRequest {
  templateIds: string[];
}
