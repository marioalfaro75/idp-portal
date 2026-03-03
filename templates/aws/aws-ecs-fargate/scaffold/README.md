# {{service_name}}

Container service deployed on AWS ECS Fargate.

## Owner

{{owner}}

## Infrastructure

- **Provider:** AWS
- **Region:** {{region}}
- **Container Registry:** Amazon ECR
- **Deployment:** ECS Fargate via GitHub Actions

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
