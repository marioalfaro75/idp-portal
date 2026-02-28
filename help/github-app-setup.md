---
title: Configuring the GitHub App
category: Administration
tags: [github, app, admin, setup]
order: 1
---

## Overview

The IDP Portal uses a GitHub App for GitHub Actions deployments and service scaffolding. The App provides centralized, secure authentication without requiring individual user tokens.

## Prerequisites

- Portal Admin access
- Owner or admin access to the GitHub organization where the App will be installed

## Step 1: Create a GitHub App

1. Go to your GitHub organization's settings: `https://github.com/organizations/YOUR-ORG/settings/apps`
2. Click **New GitHub App**
3. Configure:
   - **App name**: e.g., `IDP Portal`
   - **Homepage URL**: Your portal URL
   - **Webhook**: Uncheck "Active" (not needed)
4. Set **Permissions**:
   - **Repository permissions**:
     - Contents: **Read & write** (for pushing template files)
     - Actions: **Read & write** (for dispatching and monitoring workflows)
     - Secrets: **Read & write** (for setting repo secrets with cloud credentials)
   - **Organization permissions**:
     - Members: **Read-only** (for listing org members)
5. Click **Create GitHub App**
6. Note the **App ID** from the app's settings page

## Step 2: Generate a Private Key

1. In your GitHub App settings, scroll to **Private keys**
2. Click **Generate a private key**
3. A `.pem` file will be downloaded — keep it safe

## Step 3: Install the App

1. In the App settings, go to **Install App** in the left sidebar
2. Click **Install** next to your organization
3. Choose which repositories the App can access (all or selected)
4. After installation, note the **Installation ID** from the URL (the number at the end of the installation settings URL)

## Step 4: Configure in the Portal

1. Log in as a Portal Admin
2. Go to **Portal Administration** (under Settings)
3. In the **GitHub App** card, click **Configure**
4. Enter:
   - **App ID**: From Step 1
   - **Installation ID**: From Step 3
   - **Private Key**: Paste the contents of the `.pem` file from Step 2
5. Click **Save**
6. Click **Test Connection** to verify the setup

## Step 5: Set Default Repository (Optional)

In the **GitHub Actions Defaults** card on the Portal Administration page, you can set:
- **Default Repository**: The default repo for deployments (format: `owner/repo`)
- **Default Workflow**: The workflow file to dispatch (e.g., `deploy.yml`)
- **Default Branch**: The branch to use (e.g., `main`)

These serve as defaults that users can override when deploying.

## Troubleshooting

- **"GitHub App is not configured"**: Complete the configuration in Portal Administration
- **"Bad credentials"**: The private key may be incorrect — regenerate and re-enter it
- **"Resource not accessible by integration"**: The App doesn't have the required permissions — check the App's permission settings in GitHub
- **Workflow not dispatching**: Ensure the target repository's workflow YAML has a `workflow_dispatch` trigger
