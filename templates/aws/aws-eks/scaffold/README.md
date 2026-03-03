# {{service_name}}

Kubernetes service deployed on AWS EKS.

## Owner

{{owner}}

## Infrastructure

- **Provider:** AWS
- **Region:** {{region}}
- **Cluster:** {{cluster_name}}
- **Container Registry:** Amazon ECR
- **Deployment:** Helm on EKS via GitHub Actions

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

## Kubernetes

```bash
# Apply manifests directly
kubectl apply -f k8s/

# Or use Helm
helm upgrade --install {{service_name}} ./helm
```

## Deployment

Trigger the **Deploy** workflow from GitHub Actions or the IDP Portal.
