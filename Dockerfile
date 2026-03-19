FROM node:20-slim

# Install LibreOffice Calc + Python3 for XLSM macro execution and PDF export
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice-calc \
    python3 \
    fonts-liberation \
    fonts-dejavu-core \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

EXPOSE 5000

CMD ["sh", "-c", "npm run db:push; npm run start"]
