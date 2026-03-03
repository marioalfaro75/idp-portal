# {{service_name}}

Static site deployed on GCP Cloud CDN.

## Owner

{{owner}}

## Infrastructure

- **Provider:** GCP
- **Project:** {{project_id}}
- **Region:** {{region}}
- **GCS Bucket:** {{bucket_name}}
- **CDN:** {{cdn_name}}
- **Deployment:** GCS rsync + CDN cache invalidation via GitHub Actions

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
