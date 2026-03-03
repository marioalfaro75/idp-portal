# {{service_name}}

AWS Step Functions workflow with Lambda tasks.

## Owner

{{owner}}

## Infrastructure

- **Provider:** AWS
- **Region:** {{region}}
- **State Machine:** {{state_machine_name}}
- **Functions:** validate, process
- **Deployment:** Lambda + Step Functions via GitHub Actions

## Development

```bash
npm install
npm run build
```

## Architecture

1. **Validate** -- Validates input data
2. **Process** -- Processes validated data

## Deployment

Trigger the **Deploy** workflow from GitHub Actions or the IDP Portal.
