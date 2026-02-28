---
title: Getting Started with the IDP Portal
category: Getting Started
tags: [overview, basics, onboarding]
order: 1
---

## Welcome to the Internal Developer Portal

The IDP Portal is a self-service platform for provisioning cloud infrastructure using Terraform. It provides a web interface for browsing templates, deploying infrastructure, scaffolding services, and managing cloud credentials — all behind role-based access control.

## Key Concepts

### Templates
Pre-built Terraform configurations for common infrastructure patterns across AWS, Azure, and GCP. Browse the **Template Catalog** to see what's available, then deploy directly from the portal.

### Deployments
When you deploy a template, the portal runs Terraform on your behalf — either locally on the server or via GitHub Actions. You can monitor progress in real time and view logs from the **Deployments** page.

### Cloud Connections
Before deploying, you need cloud credentials. Add your AWS access keys, Azure service principal, or GCP service account in **Cloud Connections**. Credentials are encrypted at rest using AES-256-GCM.

### Services
Use the **Service Scaffolding** feature to create new repositories from templates via GitHub. This sets up a new repo with the right structure and CI/CD workflows.

### Groups
Admins can organize users into groups and assign templates to those groups. If you don't see a template you need, ask your admin to check your group membership.

## First Steps

1. **Log in** using your email/password or via your organization's SSO provider
2. **Browse Templates** — go to the Template Catalog and explore available infrastructure patterns
3. **Add Cloud Credentials** — navigate to Cloud Connections and add credentials for your cloud provider
4. **Deploy** — pick a template, fill in the variables, select your credentials, and deploy

## Need Help?

If you can't find what you're looking for in these articles, reach out to your portal administrator.
