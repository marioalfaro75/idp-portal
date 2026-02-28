---
title: Roles and Permissions
category: Administration
tags: [roles, permissions, rbac, access]
order: 2
---

## Overview

The IDP Portal uses role-based access control (RBAC) to manage what users can do. Each user is assigned a role, and each role grants a set of permissions.

## System Roles

The portal comes with four built-in system roles:

### Portal Admin
Full access to everything, including portal-level configuration (federation providers, GitHub App, system settings). This is the highest privilege level.

### Admin
Can manage users, roles, groups, cloud connections, templates, and deployments. Cannot modify portal-level settings like federation or GitHub App configuration.

### Editor
Can manage cloud connections, templates, deployments, services, and GitHub integrations. Cannot manage users, roles, or view audit logs.

### Viewer
Read-only access to cloud connections, templates, deployments, and services. Cannot create, modify, or delete anything.

## Permissions Reference

| Permission | Portal Admin | Admin | Editor | Viewer |
|-----------|:-----------:|:-----:|:------:|:------:|
| View users | Yes | Yes | — | — |
| Manage users | Yes | Yes | — | — |
| Manage roles | Yes | Yes | — | — |
| View cloud connections | Yes | Yes | Yes | Yes |
| Manage cloud connections | Yes | Yes | Yes | — |
| List templates | Yes | Yes | Yes | Yes |
| Edit templates | Yes | Yes | Yes | — |
| Sync templates | Yes | Yes | Yes | — |
| List deployments | Yes | Yes | Yes | Yes |
| Manage deployments | Yes | Yes | Yes | — |
| View audit logs | Yes | Yes | — | — |
| Manage settings | Yes | Yes | — | — |
| Manage GitHub | Yes | Yes | Yes | — |
| List services | Yes | Yes | Yes | Yes |
| Manage services | Yes | Yes | Yes | — |
| Manage groups | Yes | Yes | — | — |
| Portal administration | Yes | — | — | — |

## Custom Roles

Admins can create custom roles with any combination of the available permissions. This is useful for specialized roles like "Deployment Operator" (can deploy but not manage templates) or "Auditor" (can only view audit logs).

To create a custom role:
1. Go to **Roles** under Settings
2. Click **Add Role**
3. Name the role and select the permissions it should have
4. Save and assign the role to users

## Groups and Template Access

In addition to permissions, **groups** control which templates users can see and deploy. If a template is assigned to one or more groups, only members of those groups can access it. Templates not assigned to any group are visible to everyone with the appropriate permission.
