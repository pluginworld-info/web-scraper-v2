# Use a lightweight Node image as the base
FROM node:20-slim

# 1. Install specific system dependencies required for Puppeteer & Chrome
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    procps \
    libxss1 \
    dumb-init \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 2. Manually Install Google Chrome Stable
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Set Puppeteer Environment Variables
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

# 4. Copy Manifests AND Prisma Schema
COPY package.json package-lock.json* ./

# 🔴 FIX: Copy the prisma folder BEFORE running npm install
# This ensures "prisma generate" (which runs during install) can find the schema.
COPY prisma ./prisma

# 5. Install Dependencies
# This will now succeed because the schema file exists when the postinstall script runs.
RUN npm install

# 6. Copy Source Code
COPY . .

# 7. Build the Next.js App
RUN npm run build

# 8. Start the App
EXPOSE 8080

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "start"]