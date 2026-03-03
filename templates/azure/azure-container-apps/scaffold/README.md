# {{service_name}}

Container service deployed on Azure Container Apps.

## Owner

{{owner}}

## Infrastructure

- **Provider:** Azure
- **Resource Group:** {{resource_group_name}}
- **Location:** {{location}}
- **Container App:** {{app_name}}
- **Container Registry:** Azure Container Registry
- **Deployment:** Container Apps via GitHub Actions

## Development

```bash
npm install
npm run dev
```

## Docker

```bash
docker build -t {{service_name}} .
docker run -p 80:80 {{service_name}}
```

## Deployment

Trigger the **Deploy** workflow from GitHub Actions or the IDP Portal.
