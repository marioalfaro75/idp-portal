# {{service_name}}

Static site deployed on Azure CDN.

## Owner

{{owner}}

## Infrastructure

- **Provider:** Azure
- **Resource Group:** {{resource_group_name}}
- **Location:** {{location}}
- **CDN Profile:** {{cdn_profile_name}}
- **CDN Endpoint:** {{cdn_endpoint_name}}
- **Deployment:** Azure Storage + CDN purge via GitHub Actions

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deployment

Trigger the **Deploy** workflow from GitHub Actions or the IDP Portal.
