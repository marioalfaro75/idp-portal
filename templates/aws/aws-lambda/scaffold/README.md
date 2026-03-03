# {{service_name}}

AWS Lambda function with API Gateway.

## Owner

{{owner}}

## Infrastructure

- **Provider:** AWS
- **Region:** {{region}}
- **Function:** {{function_name}}
- **Runtime:** {{runtime}}
- **Deployment:** Lambda via GitHub Actions

## Development

```bash
npm install
npm run build
```

## Package

```bash
npm run package
```

This creates `function.zip` ready for deployment.

## Deployment

Trigger the **Deploy** workflow from GitHub Actions or the IDP Portal.
