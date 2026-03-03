# {{service_name}}

Full-stack service with PostgreSQL on AWS RDS.

## Owner

{{owner}}

## Infrastructure

- **Provider:** AWS
- **Region:** {{region}}
- **Database:** RDS PostgreSQL ({{database_name}})
- **Container Registry:** Amazon ECR
- **Deployment:** ECR + migrations via GitHub Actions

## Development

```bash
npm install
cp .env.example .env
# Update DATABASE_URL in .env
npx prisma migrate dev
npm run dev
```

## API Endpoints

- `GET /health` -- Health check with database connectivity
- `GET /posts` -- List all posts
- `POST /posts` -- Create a post
- `GET /posts/:id` -- Get a post by ID
- `DELETE /posts/:id` -- Delete a post

## Deployment

Trigger the **Deploy** workflow from GitHub Actions or the IDP Portal.
