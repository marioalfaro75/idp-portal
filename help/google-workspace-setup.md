---
title: Setting up Google Workspace OIDC Federation
category: Federation & SSO
tags: [google, oidc, sso, workspace]
order: 2
---

## Overview

Configure Google Workspace as an OIDC identity provider so users in your Google organization can log in to the IDP Portal with their Google accounts.

## Prerequisites

- Portal Admin access to the IDP Portal
- Admin access to your Google Cloud project

## Step 1: Create OAuth 2.0 Credentials in Google Cloud

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Select or create a project
3. Navigate to **APIs & Services** > **Credentials**
4. Click **Create Credentials** > **OAuth client ID**
5. If prompted, configure the **OAuth consent screen** first:
   - User type: **Internal** (for Google Workspace orgs) or **External**
   - Fill in the required fields (app name, support email)
   - Add the scope: `openid`, `email`, `profile`
6. Back in Credentials, select **Web application** as the application type
7. Under **Authorized redirect URIs**, add the callback URL from the Portal Admin federation form (typically `https://your-server/api/federation/your-slug/callback`)
8. Click **Create** and note the **Client ID** and **Client Secret**

## Step 2: Configure in the IDP Portal

1. Go to **Portal Administration** > **Federation Providers** > **Add Provider**
2. Fill in:
   - **Name**: e.g., "Google Workspace"
   - **Slug**: e.g., `google` (used in the login URL)
   - **Protocol**: OIDC
   - **Issuer URL**: `https://accounts.google.com`
   - **Client ID**: From Step 1
   - **Client Secret**: From Step 1
3. **Save** and **enable** the provider

## Step 3: Test

1. Open the login page in a private/incognito window
2. Click the Google provider button
3. Sign in with a Google Workspace account
4. You should be redirected back and logged in

## Notes

- Google's OIDC discovery endpoint is at `https://accounts.google.com/.well-known/openid-configuration`
- For Google Workspace (Internal) apps, only users in your organization can sign in
- For External apps in "Testing" mode, you must add test users explicitly
