---
title: Understanding Templates
category: Templates & Deployments
tags: [templates, terraform, catalog, infrastructure]
order: 0
---

## What Are Templates?

Templates are pre-built Terraform configurations that define cloud infrastructure patterns. Think of them as **blueprints** — each template describes a specific piece of infrastructure (e.g., an S3 bucket, a Kubernetes cluster, a VPC) that you can deploy with your own settings.

## How Templates Work

1. **Browse** the Template Catalog to find the infrastructure you need
2. **Configure** variables like region, instance size, naming, and tags
3. **Deploy** using either local Terraform execution or GitHub Actions

Templates are read-only — you don't edit them directly. Instead, you fill in variables at deploy time to customize the infrastructure to your needs.

## Template Properties

Each template includes:

- **Provider** — which cloud it targets (AWS, Azure, or GCP)
- **Category** — the type of infrastructure (compute, networking, storage, database, containers, security, monitoring, serverless, or IAM)
- **Variables** — configurable inputs with types, defaults, and descriptions
- **Outputs** — values produced after deployment (e.g., resource IDs, endpoints)

## Scaffoldable Templates

Some templates are marked as **scaffoldable**. This means they can be used to create a new GitHub repository with the Terraform configuration, CI/CD workflows, and project structure already set up — turning a template into a managed **Service**.

> Not sure whether to deploy or scaffold? **Deploy** if you just need the infrastructure running. **Scaffold** if you want a version-controlled repo where your team can iterate on the infrastructure over time.

## Templates vs Services vs Deployments

| Concept | What It Is |
|---------|-----------|
| **Template** | A reusable blueprint for infrastructure. You don't modify it — you configure and deploy it. |
| **Deployment** | A specific instance of a template that has been deployed with particular variable values and credentials. |
| **Service** | A scaffolded project — a GitHub repo created from a template, with its own CI/CD pipeline and lifecycle. |

## Filtering and Search

Use the catalog filters to narrow down templates:

- **Provider** — filter by AWS, Azure, or GCP
- **Category** — filter by infrastructure type
- **Search** — find templates by name or description
- **Scaffoldable** — toggle to show only templates that support scaffolding
