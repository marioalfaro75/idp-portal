# {{service_name}}

AWS SQS consumer Lambda function.

## Owner

{{owner}}

## Infrastructure

- **Provider:** AWS
- **Region:** {{region}}
- **Queue:** {{queue_name}}
- **Deployment:** Lambda via GitHub Actions

## Development

```bash
npm install
npm run build
```

## Architecture

Lambda function triggered by SQS messages. Failed messages are sent to a dead-letter queue for retry.

## Deployment

Trigger the **Deploy** workflow from GitHub Actions or the IDP Portal.
