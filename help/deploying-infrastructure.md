---
title: Deploying Infrastructure
category: Templates & Deployments
tags: [deploy, terraform, infrastructure, templates]
order: 1
---

## Overview

The IDP Portal lets you deploy cloud infrastructure from pre-built Terraform templates. You can run deployments locally (Terraform runs on the server) or via GitHub Actions.

## Deployment Flow

### 1. Choose a Template

Browse the **Template Catalog** and select a template. Each template targets a specific cloud provider (AWS, Azure, or GCP) and infrastructure category (compute, networking, storage, etc.).

### 2. Select Cloud Credentials

Pick a cloud connection that matches the template's provider. If you don't have one yet, go to **Cloud Connections** to add credentials first.

### 3. Fill in Variables

Each template has configurable variables (e.g., region, instance type, name). Required variables are marked and validated before deployment.

### 4. Choose Execution Method

- **Local Execution**: Terraform runs directly on the portal server. You'll see live output streamed in real time via SSE (Server-Sent Events). Best for quick, interactive deployments.
- **GitHub Actions**: The portal pushes the template to a GitHub repo, dispatches a workflow, and polls for completion. Logs are fetched after the workflow finishes. Best for auditable, CI/CD-integrated deployments.

### 5. Monitor Progress

After deploying, you're taken to the **Deployment Detail** page where you can:
- Watch live logs (local) or see workflow status (GitHub Actions)
- View plan output, apply output, and any errors
- See Terraform outputs (e.g., IP addresses, resource IDs)

## Destroying Infrastructure

From the Deployment Detail page, you can trigger a **destroy** operation to tear down the infrastructure created by a deployment. This runs `terraform destroy` with the same variables and credentials.

## Execution Methods Compared

| Feature | Local | GitHub Actions |
|---------|-------|---------------|
| Live log streaming | Yes (SSE) | No (polled on completion) |
| Audit trail | Portal logs | Portal + GitHub Actions logs |
| Requires | Terraform binary on server | GitHub App configured |
| Best for | Development, quick iterations | Production, team workflows |

## Tips

- Always review the **plan output** before confirming an apply
- Use descriptive deployment names so you can identify them later
- If a GitHub Actions deployment seems stuck, check the GitHub Actions tab in your repo for more details
- Deployment logs (plan, apply, destroy) are stored and accessible from the Deployment Detail page
