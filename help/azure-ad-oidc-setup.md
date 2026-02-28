---
title: Setting up Azure AD (Entra ID) OIDC Federation
category: Federation & SSO
tags: [azure, oidc, sso, entra]
order: 1
---

## Overview

This guide walks you through configuring Azure AD (Microsoft Entra ID) as an OIDC identity provider for the IDP Portal. Once configured, users in your Azure AD tenant can log in with their organizational accounts.

## Prerequisites

- Portal Admin access to the IDP Portal
- Admin access to your Azure AD / Microsoft Entra ID tenant

## Step 1: Register an App in Microsoft Entra ID

1. Go to the [Azure Portal](https://portal.azure.com) and navigate to **Microsoft Entra ID** > **App registrations**
2. Click **New registration**
3. Configure:
   - **Name**: `IDP Portal` (or your preferred name)
   - **Supported account types**: "Accounts in this organizational directory only" (single tenant)
   - **Redirect URI**: Select **Web** and enter the callback URL shown in the Portal Admin federation form (typically `https://your-server/api/federation/your-slug/callback`)
4. Click **Register**

## Step 2: Configure Client Secret

1. In your new app registration, go to **Certificates & secrets**
2. Click **New client secret**
3. Add a description and select an expiry period
4. Click **Add** and **copy the secret value immediately** — it won't be shown again

## Step 3: Gather Required Values

From the **Overview** page of your app registration, note:

| Field | Where to Find It |
|-------|-----------------|
| **Client ID** | Application (client) ID on the Overview page |
| **Client Secret** | The value from Step 2 |
| **Issuer URL** | `https://login.microsoftonline.com/{tenant-id}/v2.0` (replace `{tenant-id}` with your Directory (tenant) ID) |

## Step 4: Configure in the IDP Portal

1. Log in as a Portal Admin
2. Go to **Portal Administration** (under Settings in the sidebar)
3. In the **Federation Providers** card, click **Add Provider**
4. Fill in:
   - **Name**: e.g., "Azure AD" or your organization name
   - **Slug**: e.g., `azure-ad` (used in the login URL)
   - **Protocol**: OIDC
   - **Issuer URL**: The issuer URL from Step 3
   - **Client ID**: The Application (client) ID
   - **Client Secret**: The secret value
5. Click **Save**
6. Enable the provider using the toggle

## Step 5: Test the Integration

1. Open the Portal login page in an incognito/private browser window
2. You should see a button for your Azure AD provider
3. Click it and sign in with an Azure AD account
4. On first login, a new Portal user account is created automatically

## Troubleshooting

- **"Redirect URI mismatch"**: Ensure the redirect URI in Azure AD exactly matches the callback URL shown in the Portal Admin form
- **"AADSTS700016"**: The Application ID doesn't match — double-check the Client ID
- **"Issuer validation failed"**: Verify the Issuer URL includes the correct tenant ID and ends with `/v2.0`
- **Users can't see templates after SSO login**: Add them to the appropriate group in the Portal
