# {{service_name}}

GCP Pub/Sub subscriber Cloud Function.

## Owner

{{owner}}

## Infrastructure

- **Provider:** GCP
- **Project:** {{project_id}}
- **Region:** {{region}}
- **Topic:** {{topic_name}}
- **Deployment:** Cloud Functions via GitHub Actions

## Development

```bash
pip install -r requirements.txt
functions-framework --target=subscribe --signature-type=cloudevent --debug
```

## Architecture

Cloud Function triggered by Pub/Sub messages on the `{{topic_name}}` topic.

## Deployment

Trigger the **Deploy** workflow from GitHub Actions or the IDP Portal.
