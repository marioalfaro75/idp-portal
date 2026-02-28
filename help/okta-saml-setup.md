---
title: Setting up Okta SAML Federation
category: Federation & SSO
tags: [okta, saml, sso]
order: 5
---

## Overview

This guide configures Okta as a SAML 2.0 identity provider for the IDP Portal. Use this if your organization prefers SAML over OIDC, or if you need to match existing SAML configurations.

> **Tip:** If you have a choice, the Okta OIDC guide is simpler to follow.

## Prerequisites

- **Portal Admin** access to the IDP Portal
- **Admin** access to your Okta organization

## Step 1: Start the Provider in the Portal

1. Log in as a Portal Admin
2. Go to **Portal Administration** > **Federation Providers** > **Add Provider**
3. Fill in:
   - **Name**: e.g., `Okta SAML`
   - **Slug**: e.g., `okta-saml`
   - **Provider Type**: Okta
   - **Protocol**: SAML
4. Note the two URLs shown at the bottom:
   - **Callback URL** (ACS URL): `https://your-server/api/federation/okta-saml/callback`
   - **Metadata URL**: `https://your-server/api/federation/okta-saml/metadata`
5. Leave the form open while you configure Okta

## Step 2: Create a SAML App Integration in Okta

1. Log in to the [Okta Admin Console](https://your-domain-admin.okta.com)
2. Navigate to **Applications** > **Applications**
3. Click **Create App Integration**
4. Select:
   - **Sign-in method**: SAML 2.0
5. Click **Next**

## Step 3: Configure General Settings

1. **App name**: `IDP Portal` (or your preferred name)
2. Optionally upload an app logo
3. Click **Next**

## Step 4: Configure SAML Settings

Fill in the SAML configuration:

1. **General:**
   - **Single sign-on URL**: Paste the **Callback URL** (ACS URL) from Step 1
   - **Audience URI (SP Entity ID)**: Enter `https://your-server/api/federation/okta-saml` (this will be the SP Entity ID / Issuer in the portal)
   - **Name ID format**: EmailAddress
   - **Application username**: Email

2. **Attribute Statements** (add these for the portal to extract user information):

   | Name | Name format | Value |
   |------|-------------|-------|
   | `email` | Basic | `user.email` |
   | `displayName` | Basic | `user.displayName` |
   | `firstName` | Basic | `user.firstName` |
   | `lastName` | Basic | `user.lastName` |

3. Click **Next**

## Step 5: Complete the Okta Setup

1. On the **Feedback** page, select "I'm an Okta customer adding an internal app"
2. Click **Finish**

## Step 6: Gather the Required Values

After creating the app, go to the **Sign On** tab:

1. Click **View SAML setup instructions** (or look under the **SAML Signing Certificates** section)
2. Collect:

| Portal Field | Where to Find It in Okta |
|-------------|--------------------------|
| **Entry Point URL** | **Identity Provider Single Sign-On URL** (also called **SSO URL**) — e.g., `https://mycompany.okta.com/app/appname/exk123456/sso/saml` |
| **SP Entity ID / Issuer** | The **Audience URI** you set in Step 4 |
| **IdP Certificate** | Under **SAML Signing Certificates**, click **Actions** > **Download certificate** on the active certificate. Open it in a text editor. |

> **Important:** Copy the full certificate content including the `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` lines.

## Step 7: Complete the Portal Configuration

Back in the Portal Admin federation form:

1. Enter:
   - **Entry Point URL**: The Identity Provider SSO URL from Okta
   - **SP Entity ID / Issuer**: The Audience URI (e.g., `https://your-server/api/federation/okta-saml`)
   - **IdP Certificate**: Paste the full certificate content
   - **Signature Algorithm**: SHA-256 (Recommended)
2. Set the remaining options:
   - **Default Role**: Choose the role for auto-created users (e.g., Viewer)
   - **Auto-create Users**: Enable if you want new users created on first login
   - **Enabled**: Check to activate the provider
3. Click **Create Provider**

## Step 8: Assign Users in Okta

Before users can log in, they must be assigned to the app:

1. In the Okta Admin Console, go to your SAML app
2. Click the **Assignments** tab
3. Click **Assign** > **Assign to People** or **Assign to Groups**
4. Select users/groups and click **Done**

## Step 9: Test the Integration

1. Open the Portal login page in a **private/incognito** browser window
2. Click "Continue with Okta SAML" (or your provider name)
3. Sign in with an assigned Okta account
4. After authentication, you should be redirected back and logged in

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "SAML validation failed" | Certificate mismatch or expired | Download a fresh certificate from Okta's Sign On tab and update it in the portal |
| "Invalid audience" | SP Entity ID mismatch | Ensure the Audience URI in Okta exactly matches the SP Entity ID in the portal |
| "ACS URL mismatch" | Wrong callback URL | Ensure the Single sign-on URL in Okta matches the Callback URL from the portal |
| "User is not assigned to the app" | User not assigned in Okta | Assign the user in the Assignments tab of the Okta app |
| "Account not provisioned" | Auto-create Users is disabled | Enable Auto-create Users or pre-create the user in the portal with a matching email |
| No email in SAML response | Missing attribute statement | Check that the `email` attribute statement is configured as shown in Step 4 |
