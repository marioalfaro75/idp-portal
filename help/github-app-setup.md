---
title: Setting up the GitHub App Integration
category: GitHub Integration
tags: [github, app, admin, setup, actions]
order: 1
---

## Overview

The IDP Portal uses a GitHub App for two key features:

- **GitHub Actions Deployments** — deploy Terraform infrastructure via GitHub Actions workflows instead of running Terraform locally on the server
- **Service Scaffolding** — create new repositories from templates and optionally trigger setup workflows

The App provides centralized, secure authentication using short-lived installation tokens — no personal access tokens needed.

## Prerequisites

- **Portal Admin** access to the IDP Portal
- **Owner** or **Admin** access to the GitHub organization where the App will be installed
- A GitHub organization (the App must be installed on an org, not a personal account)

## Step 1: Create a GitHub App

1. Go to your GitHub organization's settings page:
   ```
   https://github.com/organizations/YOUR-ORG/settings/apps
   ```
2. Click **New GitHub App**
3. Fill in the basic information:
   - **GitHub App name**: e.g., `IDP Portal` (must be unique across GitHub)
   - **Homepage URL**: Your portal's URL (e.g., `https://portal.yourcompany.com`)
4. Under **Webhook**, uncheck **Active** — the portal uses polling, not webhooks
5. Set the required **Permissions**:

### Required Permissions

| Section | Permission | Access Level | Used For |
|---------|-----------|-------------|----------|
| **Repository** | Contents | **Read & write** | Pushing template files, reading workflow YAML |
| **Repository** | Actions | **Read & write** | Dispatching workflows, polling run status, fetching logs |
| **Repository** | Workflows | **Read & write** | Auto-fixing workflow YAML (committing changes to `.github/workflows/`) |
| **Repository** | Secrets | **Read & write** | Pushing cloud credentials as repo secrets |
| **Organization** | Administration | **Read & write** | Creating repositories for service scaffolding (`repos.createInOrg`) |
| **Organization** | Members | **Read-only** | Listing organization members |

6. Under **Where can this GitHub App be installed?**, select **Only on this account**
7. Click **Create GitHub App**
8. You'll be taken to the App's settings page. Note the **App ID** displayed near the top.

## Step 2: Generate a Private Key

1. On the App's settings page, scroll down to the **Private keys** section
2. Click **Generate a private key**
3. A `.pem` file will be downloaded automatically — **keep this file safe**, it's used to authenticate as the App
4. You'll paste the contents of this file into the portal in Step 4

## Step 3: Install the App on Your Organization

1. In the App's settings page, click **Install App** in the left sidebar
2. Click **Install** next to your organization
3. Choose repository access:
   - **All repositories** — simplest option, grants access to all current and future repos
   - **Only select repositories** — more restrictive, you'll need to add repos individually as needed
4. Click **Install**
5. After installation, you'll be redirected to the installation settings page. Note the **Installation ID** — it's the number at the end of the URL:
   ```
   https://github.com/organizations/YOUR-ORG/settings/installations/12345678
                                                                    ^^^^^^^^
                                                              This is the Installation ID
   ```

## Step 4: Configure the App in the Portal

1. Log in to the IDP Portal as a **Portal Admin**
2. Navigate to **Portal Administration** (under Settings in the sidebar)
3. Find the **GitHub App** card and click **Configure** (or fill in the form if unconfigured)
4. Enter the three values:
   - **App ID**: The App ID from Step 1 (e.g., `123456`)
   - **Installation ID**: The Installation ID from Step 3 (e.g., `12345678`)
   - **Private Key**: Open the `.pem` file from Step 2 in a text editor and paste the full contents, including the `-----BEGIN RSA PRIVATE KEY-----` and `-----END RSA PRIVATE KEY-----` lines
5. Click **Save Configuration**

The private key is encrypted at rest using AES-256-GCM before being stored.

## Step 5: Test the Connection

1. After saving, the GitHub App card will show a **Connected** status with your organization name
2. Click the **Test** button to verify the integration
3. A successful test confirms:
   - The App ID and private key are valid
   - The Installation ID exists and is accessible
   - The App can authenticate and generate installation tokens
4. If the test fails, see the Troubleshooting section below

## Step 6: Set GitHub Actions Defaults (Recommended)

In the **GitHub Actions Defaults** card on the Portal Administration page, configure default values that pre-populate when users deploy via GitHub Actions:

| Setting | Description | Example |
|---------|-------------|---------|
| **Default Repository** | The repo where template files are pushed and workflows run | `myorg/infra-deployments` |
| **Default Workflow** | The workflow file to dispatch | `deploy.yml` |
| **Default Branch** | The Git ref to use | `main` |

These are defaults — users can override them per deployment. Setting a default repository is also required for the **Help** section to load articles from GitHub.

## Step 7: Prepare a Deployment Repository

Create a repository (or use an existing one) for your Terraform deployments. It needs a GitHub Actions workflow file.

### Minimal Workflow Example

Create `.github/workflows/deploy.yml` in your deployment repo:

```yaml
name: Terraform Deploy

on:
  workflow_dispatch:
    inputs:
      template_slug:
        description: 'template_slug'
        required: true
        type: string
      template_provider:
        description: 'template_provider'
        required: true
        type: string
      variables:
        description: 'variables'
        required: true
        type: string
      deployment_id:
        description: 'deployment_id'
        required: true
        type: string
      deployment_name:
        description: 'deployment_name'
        required: true
        type: string
      action:
        description: 'action'
        required: true
        type: string

jobs:
  terraform:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: terraform
    steps:
      - uses: actions/checkout@v4

      - uses: hashicorp/setup-terraform@v3
        with:
          terraform_wrapper: false

      - name: Terraform Init
        run: terraform init

      - name: Terraform Format
        run: terraform fmt

      - name: Terraform Plan
        run: terraform plan -input=false -out=tfplan

      - name: Terraform Apply
        if: github.event_name == 'workflow_dispatch' && inputs.action == 'apply'
        run: terraform apply -auto-approve tfplan

      - name: Terraform Destroy
        if: github.event_name == 'workflow_dispatch' && inputs.action == 'destroy'
        run: terraform destroy -auto-approve -input=false
```

> **Tip:** You don't have to get the workflow perfect. The portal automatically validates and fixes common issues before dispatching — see the Auto-Fix section below.

### What the Portal Auto-Fixes

When dispatching a deployment, the portal inspects the workflow YAML and automatically applies fixes if needed:

| Fix | What It Does |
|-----|-------------|
| **workflow_dispatch inputs** | Adds the 6 required inputs if missing |
| **terraform_wrapper: false** | Adds to `hashicorp/setup-terraform` step (prevents wrapper script issues) |
| **working-directory: terraform** | Sets `defaults.run.working-directory` so Terraform commands run in the right directory |
| **terraform fmt** | Changes `terraform fmt -check` to `terraform fmt` (auto-formats instead of failing) |
| **Apply condition** | Sets the Apply step to run only when `inputs.action == 'apply'` |
| **Destroy step** | Adds a Terraform Destroy step if missing |
| **State persistence** | Adds artifact-based state save/restore to persist `.tfstate` between runs |
| **Env vars** | Injects cloud credential environment variables from repo secrets |

All fixes are committed to the repo automatically before dispatch. The commit message is: "Auto-fix workflow: add workflow_dispatch inputs for IDP deployments".

### How Cloud Credentials Are Handled

When deploying, the portal pushes cloud credentials as **encrypted repository secrets**. The workflow auto-fix injects the corresponding environment variables into the workflow:

| Provider | Secrets Pushed | Env Vars Set |
|----------|---------------|-------------|
| **AWS** | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` | Same names |
| **Azure** | `ARM_SUBSCRIPTION_ID`, `ARM_TENANT_ID`, `ARM_CLIENT_ID`, `ARM_CLIENT_SECRET` | Same names |
| **GCP** | `GOOGLE_PROJECT`, `GOOGLE_CREDENTIALS` | Same names |

Secrets are encrypted using the repository's public key before being sent to GitHub. They are never exposed in workflow logs.

### How State Persistence Works

Terraform state files (`.tfstate`) contain sensitive data and should not be committed to the repo. The portal adds artifact-based state persistence to the workflow:

1. **Before Terraform runs**: A "Restore Terraform State" step downloads the state artifact from the previous run (if it exists)
2. **After Terraform runs**: A "Save Terraform State" step uploads the `.tfstate` file as a GitHub Actions artifact

Artifacts are named `terraform-state-{deployment_id}`, so each deployment's state is isolated.

## How a GitHub Actions Deployment Works End-to-End

1. User selects a template, fills in variables, chooses **GitHub Actions** execution, picks a repo/workflow/branch, and clicks **Deploy**
2. The portal pushes the template's `.tf` files to the repo under a `terraform/` directory
3. Cloud credentials from the selected connection are pushed as encrypted repo secrets
4. The workflow YAML is validated and auto-fixed if needed
5. A `workflow_dispatch` event is sent to GitHub with the deployment inputs
6. GitHub Actions runs the workflow (init, plan, apply/destroy)
7. The portal polls for the run status every 30 seconds
8. When the workflow completes, the portal fetches per-job logs, extracts Terraform outputs and any error summaries, and updates the deployment status
9. The user can view logs, outputs, and errors on the **Deployment Detail** page

## Removing the GitHub App Configuration

1. In the **GitHub App** card, click **Remove**
2. Confirm the removal
3. This clears the App ID, Installation ID, and private key from the portal's database
4. It does **not** uninstall the App from GitHub — do that separately from GitHub if desired

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "GitHub App is not configured" | No App ID / Installation ID / Private Key saved | Complete the configuration in Portal Administration |
| "Bad credentials" (401) | Invalid App ID or private key | Verify the App ID matches what's shown in GitHub App settings. Regenerate the private key and paste the full `.pem` contents |
| "Integration not found" (404) | Invalid Installation ID | Check the installation URL in GitHub — the number at the end is the Installation ID |
| "Resource not accessible by integration" (403) | Missing permissions | Check the App's permissions in GitHub settings. Ensure Contents, Actions, Workflows, and Secrets are all Read & Write |
| "Workflow does not have 'workflow_dispatch' trigger" | Workflow couldn't be auto-fixed | This shouldn't normally happen, but check that the workflow file exists on the specified branch |
| Workflow dispatched but never starts | Branch protection or required checks blocking | Check the repo's branch protection rules and ensure the workflow file exists on the target branch |
| Deployment stuck in "dispatched" | Run ID not found after 10 minutes | The portal auto-fails these. Check GitHub Actions tab in the repo for the actual run status |
| "Secrets: Read and write permission required" | App can't push credentials | Update the App's repository permissions to include Secrets: Read & write |
| Service scaffolding fails to create repo | Missing org admin permission | Ensure the App has Organization > Administration: Read & write permission |
