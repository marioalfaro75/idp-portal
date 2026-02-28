---
title: Setting up Okta OIDC Federation
category: Federation & SSO
tags: [okta, oidc, sso]
order: 4
---

## Overview

This guide configures Okta as an OIDC identity provider for the IDP Portal. Once configured, users in your Okta organization can log in with their Okta credentials.

## Prerequisites

- **Portal Admin** access to the IDP Portal
- **Admin** access to your Okta organization

## Step 1: Start the Provider in the Portal

1. Log in as a Portal Admin
2. Go to **Portal Administration** > **Federation Providers** > **Add Provider**
3. Fill in:
   - **Name**: e.g., `Okta`
   - **Slug**: e.g., `okta`
   - **Provider Type**: Okta
   - **Protocol**: OIDC
4. Note the **Callback URL** shown at the bottom:
   ```
   https://your-server/api/federation/okta/callback
   ```
5. Leave the form open while you configure Okta

## Step 2: Create an App Integration in Okta

1. Log in to the [Okta Admin Console](https://your-domain-admin.okta.com)
2. Navigate to **Applications** > **Applications**
3. Click **Create App Integration**
4. Select:
   - **Sign-in method**: OIDC — OpenID Connect
   - **Application type**: Web Application
5. Click **Next**

## Step 3: Configure the App Integration

1. **App integration name**: `IDP Portal` (or your preferred name)
2. **Grant type**: Ensure **Authorization Code** is checked (default)
3. **Sign-in redirect URIs**: Paste the **Callback URL** from Step 1
4. **Sign-out redirect URIs**: Leave blank (optional)
5. **Controlled access**:
   - **Allow everyone in your organization to access**: If all users should have access
   - **Limit access to selected groups**: To restrict to specific Okta groups
6. Click **Save**

## Step 4: Gather the Required Values

After saving, you'll be on the app's settings page:

| Portal Field | Where to Find It in Okta |
|-------------|--------------------------|
| **Client ID** | **Client ID** in the **Client Credentials** section |
| **Client Secret** | **Client Secret** in the **Client Credentials** section (click the eye icon to reveal) |
| **Issuer URL** | `https://{your-okta-domain}` — e.g., `https://mycompany.okta.com`. You can also find this under **Security** > **API** > **Authorization Servers** > **default** > **Issuer URI** |

> **Note:** The Issuer URL is your Okta domain without a trailing slash. For Okta developer accounts, it may look like `https://dev-12345678.okta.com`.

## Step 5: Complete the Portal Configuration

Back in the Portal Admin federation form:

1. Enter:
   - **Issuer URL**: `https://your-domain.okta.com` (your Okta domain)
   - **Client ID**: From Step 4
   - **Client Secret**: From Step 4
   - **Scopes**: Leave as default (`openid profile email`)
2. Set the remaining options:
   - **Default Role**: Choose the role for auto-created users (e.g., Viewer)
   - **Auto-create Users**: Enable if you want new users created on first login
   - **Enabled**: Check to activate the provider
3. Click **Create Provider**

## Step 6: Test the Integration

1. Open the Portal login page in a **private/incognito** browser window
2. Click "Continue with Okta" (or your provider name)
3. Sign in with an Okta account
4. After authentication, you should be redirected back and logged in

## Optional: Assign Users in Okta

If you selected "Limit access to selected groups" in Step 3, assign users or groups:

1. In the Okta Admin Console, go to your app integration
2. Click the **Assignments** tab
3. Click **Assign** > **Assign to People** or **Assign to Groups**
4. Select users/groups and click **Done**

Only assigned users will be able to authenticate.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "redirect_uri mismatch" | Callback URL doesn't match Okta config | Ensure the Sign-in redirect URI in Okta exactly matches the Callback URL from the portal |
| "invalid_client" | Wrong Client ID or Secret | Check the Client Credentials section in the Okta app settings |
| "Issuer validation failed" | Wrong Issuer URL | Use just the Okta domain (e.g., `https://mycompany.okta.com`) without any path. Check **Security > API > Authorization Servers** for the exact Issuer URI |
| "User is not assigned to the client application" | User not assigned in Okta | Assign the user to the app integration in Okta's Assignments tab |
| "Account not provisioned" | Auto-create Users is disabled | Enable Auto-create Users or pre-create the user in the portal |
