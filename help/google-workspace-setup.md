---
title: Setting up Google Workspace OIDC Federation
category: Federation & SSO
tags: [google, oidc, sso, workspace]
order: 3
---

## Overview

Configure Google Workspace as an OIDC identity provider so users in your Google organization can log in to the IDP Portal with their Google accounts.

## Prerequisites

- **Portal Admin** access to the IDP Portal
- **Admin** access to a [Google Cloud project](https://console.cloud.google.com) linked to your Google Workspace organization

## Step 1: Start the Provider in the Portal

1. Log in as a Portal Admin
2. Go to **Portal Administration** > **Federation Providers** > **Add Provider**
3. Fill in:
   - **Name**: e.g., `Google Workspace`
   - **Slug**: e.g., `google` (auto-generated from name)
   - **Provider Type**: Google Workspace
   - **Protocol**: OIDC
4. Note the **Callback URL** shown at the bottom of the form:
   ```
   https://your-server/api/federation/google/callback
   ```
5. Leave the form open while you configure Google

## Step 2: Configure the OAuth Consent Screen

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Select or create a project (use one linked to your Workspace org)
3. Navigate to **APIs & Services** > **OAuth consent screen**
4. Choose the user type:
   - **Internal**: Only users in your Google Workspace organization can log in (recommended for corporate use)
   - **External**: Any Google account can log in (requires publishing for production use)
5. Fill in the required fields:
   - **App name**: `IDP Portal` (or your preferred name)
   - **User support email**: Your admin email
   - **Developer contact email**: Your admin email
6. Click **Save and Continue**
7. On the **Scopes** page, click **Add or remove scopes** and add:
   - `openid`
   - `email`
   - `profile`
8. Click **Save and Continue** through the remaining pages

## Step 3: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth client ID**
3. Select **Web application** as the application type
4. Enter a name (e.g., `IDP Portal`)
5. Under **Authorized redirect URIs**, click **Add URI** and paste the **Callback URL** from Step 1
6. Click **Create**
7. A dialog will show your **Client ID** and **Client Secret** — copy both values (you can also download the JSON)

## Step 4: Complete the Portal Configuration

Back in the Portal Admin federation form:

1. Enter:
   - **Issuer URL**: `https://accounts.google.com` (this is the same for all Google accounts)
   - **Client ID**: The Client ID from Step 3 (ends with `.apps.googleusercontent.com`)
   - **Client Secret**: The Client Secret from Step 3 (starts with `GOCSPX-`)
   - **Scopes**: Leave as default (`openid profile email`)
2. Set the remaining options:
   - **Default Role**: Choose the role for auto-created users (e.g., Viewer)
   - **Auto-create Users**: Enable if you want new users created on first login
   - **Enabled**: Check to activate the provider
3. Click **Create Provider**

## Step 5: Test the Integration

1. Open the Portal login page in a **private/incognito** browser window
2. Click "Continue with Google Workspace" (or your provider name)
3. Sign in with a Google Workspace account from your organization
4. After authentication, you should be redirected back and logged in
5. Verify the user was created with the correct default role

## Important Notes

- **Internal apps**: Only users within your Google Workspace organization can authenticate. This is the most secure option for corporate environments.
- **External apps in "Testing" mode**: You must manually add test users in the OAuth consent screen. Limited to 100 test users.
- **External apps in "Production" mode**: Requires Google verification, which can take several weeks. All Google accounts can log in.
- Google's OIDC discovery endpoint is at `https://accounts.google.com/.well-known/openid-configuration`

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "redirect_uri_mismatch" | The callback URL doesn't match | Ensure the **Authorized redirect URI** in Google Cloud exactly matches the Callback URL shown in the portal form — including the protocol (`https`) and any port number |
| "access_denied" | User not authorized | For Internal apps, ensure the user is in your Workspace org. For External apps in Testing mode, add the user as a test user in the OAuth consent screen |
| "invalid_client" | Wrong Client ID or Secret | Regenerate credentials in Google Cloud Console and update in the portal |
| "Account not provisioned" | Auto-create Users is disabled | Enable Auto-create Users, or create the user in the portal first with a matching email |
| Google shows consent screen every time | App is in testing/unverified state | This is normal for External apps in Testing mode. For Internal apps, this shouldn't happen. |
