# Stage 1: Build
FROM node:20-alpine AS builder

ARG COMMIT_HASH=unknown

WORKDIR /app

# Copy workspace package files for dependency install
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/

RUN npm ci

# Write BUILD_INFO.json from build arg (git is not available in Docker)
RUN node -e " \
  const pkg = JSON.parse(require('fs').readFileSync('package.json','utf-8')); \
  const hash = '${COMMIT_HASH}'; \
  require('fs').writeFileSync('BUILD_INFO.json', JSON.stringify({ \
    version: pkg.version, \
    commitHash: hash.substring(0,7), \
    fullCommitHash: hash, \
    buildTime: new Date().toISOString() \
  }, null, 2)); \
"

# Copy all source code
COPY shared/ shared/
COPY server/ server/
COPY client/ client/

# Generate Prisma client
RUN cd server && npx prisma generate

# Build all workspaces: shared → server → client (prebuild detects existing BUILD_INFO.json)
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

# Install security scanning tools: Trivy, TFLint, Conftest
RUN ARCH=$(uname -m | sed 's/x86_64/amd64/' | sed 's/aarch64/arm64/') && \
    TRIVY_ARCH=$(echo ${ARCH} | sed 's/amd64/64bit/' | sed 's/arm64/ARM64/') && \
    wget -q "https://github.com/aquasecurity/trivy/releases/download/v0.58.0/trivy_0.58.0_Linux-${TRIVY_ARCH}.tar.gz" -O /tmp/trivy.tar.gz && \
    tar xzf /tmp/trivy.tar.gz -C /usr/local/bin/ trivy && \
    rm /tmp/trivy.tar.gz && \
    trivy --version && \
    wget -q "https://github.com/terraform-linters/tflint/releases/download/v0.54.0/tflint_linux_${ARCH}.zip" -O /tmp/tflint.zip && \
    unzip /tmp/tflint.zip -d /usr/local/bin/ && \
    rm /tmp/tflint.zip && \
    tflint --version && \
    CONFTEST_ARCH=$(echo ${ARCH} | sed 's/amd64/x86_64/') && \
    wget -q "https://github.com/open-policy-agent/conftest/releases/download/v0.56.0/conftest_0.56.0_Linux_${CONFTEST_ARCH}.tar.gz" -O /tmp/conftest.tar.gz && \
    tar xzf /tmp/conftest.tar.gz -C /usr/local/bin/ conftest && \
    rm /tmp/conftest.tar.gz && \
    conftest --version

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

# Copy BUILD_INFO.json
COPY --from=builder /app/BUILD_INFO.json BUILD_INFO.json

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
