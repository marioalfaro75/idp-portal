# {{service_name}}

Static site deployed on AWS CloudFront + S3.

## Owner

{{owner}}

## Infrastructure

- **Provider:** AWS
- **Region:** {{region}}
- **S3 Bucket:** {{bucket_name}}
- **CDN:** CloudFront
- **Deployment:** S3 sync + CloudFront invalidation via GitHub Actions

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
