# Use a lightweight Node image as the base
FROM node:20-slim

# 1. Install specific system dependencies required for Puppeteer & Chrome
# We also install 'dumb-init' to prevent "Zombie Processes" (common Chrome issue in Docker)
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
# This ensures we have a real browser for Puppeteer to control
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
    && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
    && apt-get update \
    && apt-get install -y google-chrome-stable --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 3. Set Puppeteer Environment Variables
# Tell Puppeteer: "Don't download your own Chrome, use the one I just installed."
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

WORKDIR /app

# 4. Install Dependencies
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies like typescript) for the build
RUN npm install

# 5. Generate Prisma Client (CRITICAL STEP)
COPY prisma ./prisma
RUN npx prisma generate

# 6. Copy Source Code
COPY . .

# 7. Build the TypeScript Code
# (Assumes you have a "build" script in package.json like "next build" or "tsc")
RUN npm run build

# 8. Start the App
EXPOSE 8080

# Use dumb-init to manage the Chrome processes safely
ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["npm", "start"]