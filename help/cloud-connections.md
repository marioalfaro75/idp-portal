---
title: Managing Cloud Connections
category: Cloud Credentials
tags: [aws, azure, gcp, credentials, cloud]
order: 1
---

## Overview

Cloud connections store the credentials needed to deploy infrastructure to your cloud provider. All credentials are encrypted at rest using AES-256-GCM encryption.

## Supported Providers

### AWS
Required credentials:
- **Access Key ID**
- **Secret Access Key**
- **Region** (e.g., `us-east-1`)

These are passed to Terraform as `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` environment variables.

### Azure
Required credentials:
- **Subscription ID**
- **Tenant ID**
- **Client ID** (Service Principal Application ID)
- **Client Secret** (Service Principal password)

These map to Terraform's `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`, `ARM_CLIENT_ID`, and `ARM_CLIENT_SECRET`.

### GCP
Required credentials:
- **Project ID**
- **Credentials JSON** (service account key file contents)

The JSON is written to a temp file and passed as `GOOGLE_APPLICATION_CREDENTIALS`.

## Adding a Cloud Connection

1. Navigate to **Cloud Connections** in the sidebar
2. Click **Add Connection**
3. Select the cloud provider
4. Enter a descriptive name (e.g., "Production AWS", "Dev Azure Subscription")
5. Fill in the required credentials
6. Click **Save**

## Security

- Credentials are encrypted before being stored in the database
- The encryption key is derived from the `ENCRYPTION_KEY` environment variable
- Credentials are only decrypted at deployment time and passed to Terraform as environment variables
- They are never exposed in API responses after creation

## Best Practices

- Use **least-privilege** credentials — create service accounts with only the permissions needed for the templates you plan to deploy
- Use separate credentials for different environments (dev, staging, production)
- Rotate credentials regularly and update them in the portal
- Give connections clear, descriptive names so you can easily identify them during deployment
