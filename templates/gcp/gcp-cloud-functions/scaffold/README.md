# {{service_name}}

GCP Cloud Function (2nd gen).

## Owner

{{owner}}

## Infrastructure

- **Provider:** GCP
- **Project:** {{project_id}}
- **Region:** {{region}}
- **Function:** {{function_name}}
- **Runtime:** {{runtime}}
- **Entry Point:** {{entry_point}}
- **Deployment:** Cloud Functions via GitHub Actions

## Development

```bash
pip install -r requirements.txt
functions-framework --target={{entry_point}} --debug
```

## Deployment

Trigger the **Deploy** workflow from GitHub Actions or the IDP Portal.
