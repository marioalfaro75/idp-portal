# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace package files for dependency install
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/

RUN npm ci

# Copy all source code
COPY shared/ shared/
COPY server/ server/
COPY client/ client/

# Generate Prisma client
RUN cd server && npx prisma generate

# Build all workspaces: shared → server → client
RUN npm run build

# Stage 2: Production
FROM node:20-alpine

# Install Terraform from HashiCorp releases
RUN apk add --no-cache unzip && \
    ARCH=$(uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/') && \
    wget -q "https://releases.hashicorp.com/terraform/1.9.8/terraform_1.9.8_linux_${ARCH}.zip" -O /tmp/terraform.zip && \
    unzip /tmp/terraform.zip -d /usr/local/bin/ && \
    rm /tmp/terraform.zip && \
    terraform version

WORKDIR /app

# Copy workspace package files for production install
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/

# Install production dependencies only
RUN npm ci --omit=dev --workspace=server --workspace=shared

# Copy built artifacts from builder
COPY --from=builder /app/shared/dist/ shared/dist/
COPY --from=builder /app/server/dist/ server/dist/
COPY --from=builder /app/client/dist/ client/dist/

# Copy Prisma schema + seed for migrations/seeding in production
COPY --from=builder /app/server/prisma/ server/prisma/

# Copy templates and help articles
COPY templates/ templates/
COPY help/ help/

# Re-generate Prisma client in production node_modules
RUN cd server && npx prisma generate

# Create data directory for SQLite
RUN mkdir -p server/data

ENV NODE_ENV=production
EXPOSE 3001

CMD ["node", "server/dist/index.js"]
