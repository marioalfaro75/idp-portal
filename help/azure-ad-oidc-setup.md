---
title: Setting up Azure AD (Entra ID) OIDC Federation
category: Federation & SSO
tags: [azure, oidc, sso, entra, microsoft]
order: 1
---

## Overview

This guide walks you through configuring Azure AD (Microsoft Entra ID) as an OIDC identity provider for the IDP Portal. Once configured, users in your Azure AD tenant can log in with their organizational Microsoft accounts.

## Prerequisites

- **Portal Admin** access to the IDP Portal
- **Application Administrator** (or higher) role in your Azure AD / Microsoft Entra ID tenant

## Step 1: Start the Provider in the Portal

Before configuring Azure AD, create the provider in the portal so you have the callback URL.

1. Log in as a Portal Admin
2. Go to **Portal Administration** (under Settings in the sidebar)
3. In the **Federation Providers** card, click **Add Provider**
4. Fill in:
   - **Name**: e.g., `Azure AD` or your organization name
   - **Slug**: e.g., `azure-ad` (auto-generated from name; can be customized)
   - **Provider Type**: Azure AD
   - **Protocol**: OIDC
5. Note the **Callback URL** shown at the bottom of the form — you'll need it in the next step. It will look like:
   ```
   https://your-server/api/federation/azure-ad/callback
   ```
6. Leave the form open while you configure Azure AD

## Step 2: Register an App in Microsoft Entra ID

1. Go to the [Azure Portal](https://portal.azure.com) and navigate to **Microsoft Entra ID** > **App registrations**
2. Click **New registration**
3. Configure:
   - **Name**: `IDP Portal` (or your preferred name)
   - **Supported account types**: Select "Accounts in this organizational directory only" for single-tenant, or "Accounts in any organizational directory" for multi-tenant
   - **Redirect URI**: Select **Web** and paste the **Callback URL** from Step 1
4. Click **Register**

## Step 3: Create a Client Secret

1. In your new app registration, navigate to **Certificates & secrets** in the left sidebar
2. Under **Client secrets**, click **New client secret**
3. Enter a description (e.g., "IDP Portal") and select an expiry period
4. Click **Add**
5. **Copy the Value immediately** — it is only shown once. This is your **Client Secret**.

## Step 4: Gather the Required Values

From the **Overview** page of your app registration, collect these three values:

| Portal Field | Where to Find It in Azure |
|-------------|--------------------------|
| **Issuer URL** | Construct it: `https://login.microsoftonline.com/{tenant-id}/v2.0` — replace `{tenant-id}` with the **Directory (tenant) ID** from the Overview page |
| **Client ID** | **Application (client) ID** on the Overview page |
| **Client Secret** | The **Value** you copied in Step 3 |

## Step 5: Complete the Portal Configuration

Back in the Portal Admin federation form:

1. Enter:
   - **Issuer URL**: `https://login.microsoftonline.com/{your-tenant-id}/v2.0`
   - **Client ID**: The Application (client) ID from Azure
   - **Client Secret**: The secret value from Step 3
   - **Scopes**: Leave as default (`openid profile email`) unless you need custom claims
2. Set the remaining options:
   - **Default Role**: Choose the role for auto-created users (e.g., Viewer)
   - **Auto-create Users**: Enable if you want new users created on first login
   - **Enabled**: Check to activate the provider
3. Click **Create Provider**

## Step 6: Test the Integration

1. Open the Portal login page in a **private/incognito** browser window
2. You should see a "Continue with Azure AD" button (or your provider name)
3. Click it and sign in with an Azure AD account from your tenant
4. After authentication, you should be redirected back and logged in
5. Check that the user was created with the correct default role

## Optional: Restrict to Specific Users

By default, all users in your Azure AD tenant can log in. To restrict access:

- **In Azure AD**: Go to **Enterprise applications** > find your app > **Properties** > set **Assignment required** to **Yes**. Then under **Users and groups**, assign only the users/groups who should have access.
- **In the Portal**: Disable **Auto-create Users** and pre-create user accounts. Only users with matching email addresses will be able to log in.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "Redirect URI mismatch" (AADSTS50011) | The callback URL doesn't match what's registered in Azure AD | Copy the exact Callback URL from the portal form and paste it as the Redirect URI in Azure AD App Registration |
| "Application not found" (AADSTS700016) | Wrong Client ID | Double-check the Application (client) ID on the Azure AD app Overview page |
| "Issuer validation failed" | Wrong Issuer URL | Ensure the URL uses the correct tenant ID and ends with `/v2.0` |
| "Invalid client secret" | Wrong or expired secret | Generate a new client secret in Azure AD and update it in the portal |
| "Account not provisioned" | Auto-create Users is disabled and user doesn't exist | Enable Auto-create Users, or create the user in the portal first |
| "Account has been disabled" | The portal user's account is deactivated | A Portal Admin must re-enable the user in the Users page |
| Users can't see templates after login | User not in correct group | Add the user to the appropriate group in the Portal |
