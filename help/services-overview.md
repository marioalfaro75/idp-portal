---
title: Understanding Services
category: Services
tags: [services, scaffold, github, repositories]
order: 0
---

## What Are Services?

Services are **scaffolded infrastructure projects** — GitHub repositories created from a template with Terraform configurations, CI/CD workflows, and project structure already in place. While a deployment is a one-time action, a service gives your team a living, version-controlled project to manage infrastructure over time.

## How Services Are Created

1. Go to the **Template Catalog** and find a template marked as scaffoldable
2. Click **Scaffold** to start the scaffolding wizard
3. Name your service and configure the initial variables
4. The portal creates a new GitHub repository with everything set up

Once created, the service appears in the **Services** page where you can track its status, view the linked repo, and manage its lifecycle.

## Services vs Deployments

It's important to understand how services differ from deployments:

| | Deployments | Services |
|---|-----------|----------|
| **Created from** | Any template | Scaffoldable templates only |
| **Result** | Infrastructure provisioned directly | A GitHub repo with Terraform config + CI/CD |
| **Managed by** | The IDP Portal | Your team via Git + GitHub Actions |
| **Lifecycle** | Deploy, monitor, destroy from the portal | Iterate, review PRs, run pipelines in GitHub |
| **Best for** | Quick, one-off infrastructure | Long-lived, team-managed infrastructure projects |

> **Choose a deployment** when you need infrastructure running quickly. **Choose a service** when you want your team to own and evolve the infrastructure through code reviews and CI/CD.

## Service Statuses

- **Active** — the service repository was created successfully and is ready for use
- **Scaffolding** — the service is being set up (repo creation in progress)
- **Failed** — something went wrong during scaffolding
- **Archived** — the service has been decommissioned

## Requirements

To scaffold services, you need:

- A **GitHub App** configured in Portal Admin settings
- A scaffoldable template (look for the scaffold badge in the catalog)
- Appropriate permissions (your role must allow service creation)
