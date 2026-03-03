# {{service_name}}

Kubernetes service deployed on GCP GKE.

## Owner

{{owner}}

## Infrastructure

- **Provider:** GCP
- **Project:** {{project_id}}
- **Region:** {{region}}
- **Cluster:** {{cluster_name}}
- **Container Registry:** Artifact Registry
- **Deployment:** Helm on GKE via GitHub Actions

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

## Kubernetes

```bash
kubectl apply -f k8s/
# Or use Helm
helm upgrade --install {{service_name}} ./helm
```

## Deployment

Trigger the **Deploy** workflow from GitHub Actions or the IDP Portal.
