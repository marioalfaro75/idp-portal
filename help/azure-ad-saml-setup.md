---
title: Setting up Azure AD (Entra ID) SAML Federation
category: Federation & SSO
tags: [azure, saml, sso, entra, microsoft]
order: 2
---

## Overview

This guide configures Azure AD (Microsoft Entra ID) as a SAML 2.0 identity provider for the IDP Portal. Use SAML when your organization requires it, or if you already have SAML-based SSO for other apps.

> **Tip:** If you have a choice, OIDC is simpler to set up. See the Azure AD OIDC guide instead.

## Prerequisites

- **Portal Admin** access to the IDP Portal
- **Application Administrator** (or higher) role in your Azure AD / Microsoft Entra ID tenant

## Step 1: Start the Provider in the Portal

1. Log in as a Portal Admin
2. Go to **Portal Administration** > **Federation Providers** > **Add Provider**
3. Fill in:
   - **Name**: e.g., `Azure AD SAML`
   - **Slug**: e.g., `azure-ad-saml`
   - **Provider Type**: Azure AD
   - **Protocol**: SAML
4. Note the two URLs shown at the bottom:
   - **Callback URL** (ACS URL): `https://your-server/api/federation/azure-ad-saml/callback`
   - **Metadata URL**: `https://your-server/api/federation/azure-ad-saml/metadata`
5. Leave the form open while you configure Azure AD

## Step 2: Create an Enterprise Application in Azure AD

1. Go to the [Azure Portal](https://portal.azure.com) > **Microsoft Entra ID** > **Enterprise applications**
2. Click **New application** > **Create your own application**
3. Enter a name (e.g., `IDP Portal SAML`) and select **Integrate any other application you don't find in the gallery (Non-gallery)**
4. Click **Create**

## Step 3: Configure SAML SSO

1. In your new enterprise application, go to **Single sign-on** in the left sidebar
2. Select **SAML** as the sign-on method
3. In **Section 1 — Basic SAML Configuration**, click **Edit** and configure:
   - **Identifier (Entity ID)**: Enter your portal's SP Entity ID. Use: `https://your-server/api/federation/azure-ad-saml` (this should match the **SP Entity ID / Issuer** value you'll enter in the portal)
   - **Reply URL (Assertion Consumer Service URL)**: Paste the **Callback URL** from Step 1: `https://your-server/api/federation/azure-ad-saml/callback`
   - **Sign on URL**: Leave blank
4. Click **Save**

## Step 4: Configure Attributes & Claims

1. In **Section 2 — Attributes & Claims**, click **Edit**
2. Ensure these claims are configured (Azure AD typically sets them by default):

| Claim Name | Source Attribute | Purpose |
|-----------|-----------------|---------|
| `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress` | `user.mail` | User's email (required) |
| `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name` | `user.displayname` | Display name |
| Unique User Identifier (Name ID) | `user.userprincipalname` | User identifier |

3. Click **Save** if you made changes

## Step 5: Download the Certificate

1. In **Section 3 — SAML Signing Certificate**, find **Certificate (Base64)**
2. Click **Download** to save the certificate file
3. Open the downloaded `.cer` file in a text editor — you'll need the full PEM content including the `-----BEGIN CERTIFICATE-----` and `-----END CERTIFICATE-----` lines

## Step 6: Gather the Required Values

From **Section 4 — Set up {App Name}**, collect:

| Portal Field | Azure AD Field |
|-------------|---------------|
| **Entry Point URL** | **Login URL** (e.g., `https://login.microsoftonline.com/{tenant-id}/saml2`) |
| **SP Entity ID / Issuer** | The **Identifier (Entity ID)** you set in Step 3 |
| **IdP Certificate** | The certificate content from Step 5 |

## Step 7: Complete the Portal Configuration

Back in the Portal Admin federation form:

1. Enter:
   - **Entry Point URL**: The Login URL from Azure AD (Step 6)
   - **SP Entity ID / Issuer**: The Entity ID you configured in Step 3 (e.g., `https://your-server/api/federation/azure-ad-saml`)
   - **IdP Certificate**: Paste the full certificate content (including BEGIN/END lines)
   - **Signature Algorithm**: SHA-256 (Recommended) — matches Azure AD's default
2. Set the remaining options:
   - **Default Role**: Choose the role for auto-created users (e.g., Viewer)
   - **Auto-create Users**: Enable if you want new users created on first login
   - **Enabled**: Check to activate the provider
3. Click **Create Provider**

## Step 8: Test the Integration

1. Open the Portal login page in a **private/incognito** browser window
2. Click "Continue with Azure AD SAML" (or your provider name)
3. Sign in with an Azure AD account
4. After authentication, you should be redirected back and logged in

## Optional: Assign Users

By default Azure AD may require user assignment. Go to the Enterprise application > **Users and groups** > **Add user/group** to grant access to specific users or groups.

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "SAML validation failed" | Certificate mismatch or wrong Entry Point URL | Verify the certificate is the Base64 version (not raw/binary) and the Entry Point URL matches the Login URL from Azure AD |
| "AADSTS700016" | Entity ID mismatch | Ensure the Identifier in Azure AD's SAML config matches the SP Entity ID in the portal exactly |
| "Reply URL does not match" | Wrong ACS URL | Copy the exact Callback URL from the portal and paste it as the Reply URL in Azure AD |
| "Account not provisioned" | Auto-create Users is disabled | Enable Auto-create Users or pre-create the user in the portal |
| No email in SAML response | Missing email claim | Check that the `emailaddress` claim is configured in Azure AD's Attributes & Claims section |
