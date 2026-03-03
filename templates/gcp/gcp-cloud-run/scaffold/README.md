# {{service_name}}

Container service deployed on GCP Cloud Run.

## Owner

{{owner}}

## Infrastructure

- **Provider:** GCP
- **Project:** {{project_id}}
- **Region:** {{region}}
- **Container Registry:** Artifact Registry
- **Deployment:** Cloud Run via GitHub Actions

## Development

```bash
npm install
npm run dev
```

## Docker

```bash
docker build -t {{service_name}} .
docker run -p 8080:8080 {{service_name}}
```

## Deployment

Trigger the **Deploy** workflow from GitHub Actions or the IDP Portal.
