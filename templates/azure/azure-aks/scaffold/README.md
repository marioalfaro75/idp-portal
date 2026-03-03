# {{service_name}}

Kubernetes service deployed on Azure AKS.

## Owner

{{owner}}

## Infrastructure

- **Provider:** Azure
- **Resource Group:** {{resource_group_name}}
- **Location:** {{location}}
- **Cluster:** {{cluster_name}}
- **Container Registry:** Azure Container Registry
- **Deployment:** Helm on AKS via GitHub Actions

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
kubectl apply -f k8s/
# Or use Helm
helm upgrade --install {{service_name}} ./helm
```

## Deployment

Trigger the **Deploy** workflow from GitHub Actions or the IDP Portal.
