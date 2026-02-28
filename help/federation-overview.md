---
title: Federation Overview — Adding SSO to the Portal
category: Federation & SSO
tags: [federation, sso, oidc, saml, overview]
order: 0
---

## What is Federation?

Federation lets your users log in to the IDP Portal using their existing organizational identity provider (IdP) — Azure AD, Google Workspace, Okta, or any OIDC/SAML-compatible provider. Instead of creating separate portal passwords, users click a "Continue with..." button on the login page and authenticate through their IdP.

## Supported Protocols

The portal supports two industry-standard SSO protocols:

| Protocol | Best For | How It Works |
|----------|----------|--------------|
| **OIDC** (OpenID Connect) | Most modern IdPs | Browser redirects to the IdP, user authenticates, IdP returns an authorization code that the portal exchanges for identity tokens. |
| **SAML 2.0** | Enterprise IdPs, legacy systems | Browser redirects to the IdP, user authenticates, IdP POSTs a signed XML assertion back to the portal. |

**If your IdP supports both**, OIDC is generally simpler to configure.

## Supported Identity Providers

| Provider | OIDC | SAML |
|----------|:----:|:----:|
| Azure AD (Microsoft Entra ID) | Yes | Yes |
| Google Workspace | Yes | Yes |
| Okta | Yes | Yes |
| Custom / Other | Yes | Yes |

## How It Works in the Portal

1. **Portal Admin** configures one or more federation providers in **Portal Administration > Federation Providers**
2. Enabled providers appear as buttons on the **login page** (e.g., "Continue with Azure AD")
3. When a user clicks the button, they are redirected to the IdP to authenticate
4. After successful authentication, the IdP redirects back to the portal with proof of identity
5. The portal creates a local user account (if **Auto-create Users** is enabled) or matches an existing one by email
6. The user is logged in with a session token

## Key Configuration Concepts

### Callback URL
The URL your IdP redirects to after authentication. The portal generates this automatically based on your provider's slug:
```
{SERVER_URL}/api/federation/{slug}/callback
```
You must register this URL in your IdP's configuration (called "Redirect URI" in OIDC, "ACS URL" in SAML).

### Slug
A URL-safe identifier for your provider (e.g., `azure-ad`, `google`, `okta`). It's used in the login and callback URLs. Must be lowercase alphanumeric with hyphens only.

### Provider Type
Tells the portal which IdP you're using so it can show the right icon on the login page and provide helpful placeholder values. Choose "Custom" for any IdP not in the list.

### Default Role
The role assigned to users who are auto-created via federation. Typically set to **Viewer** — admins can upgrade roles later.

### Auto-create Users
When enabled, users who don't yet exist in the portal are automatically created on first SSO login. When disabled, only pre-existing portal users (matched by email) can log in via SSO.

## Setup Checklist

1. Ensure you have **Portal Admin** access
2. Have admin access to your identity provider
3. Decide on a slug (e.g., `azure-ad`)
4. Go to **Portal Administration > Federation Providers > Add Provider**
5. Note the **Callback URL** shown in the form — you'll need it when configuring the IdP
6. Configure the IdP (see provider-specific guides below)
7. Fill in the portal form with values from the IdP
8. **Save** and **Enable** the provider
9. Test in an incognito/private browser window

## Provider-Specific Guides

- **Azure AD (OIDC)** — Setting up Azure AD (Entra ID) OIDC Federation
- **Azure AD (SAML)** — Setting up Azure AD (Entra ID) SAML Federation
- **Google Workspace (OIDC)** — Setting up Google Workspace OIDC Federation
- **Okta (OIDC)** — Setting up Okta OIDC Federation
- **Okta (SAML)** — Setting up Okta SAML Federation

## Security Notes

- All provider secrets (client secrets, certificates) are **encrypted at rest** using AES-256-GCM
- OIDC logins use a **state parameter** with an httpOnly cookie for CSRF protection
- SAML assertions are **signature-verified** using the IdP's public certificate
- Federation login sessions use the same JWT + server-side session revocation as password logins
