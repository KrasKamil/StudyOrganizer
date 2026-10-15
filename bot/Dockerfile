FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Hugging Face Spaces default port is 7860
EXPOSE 7860
ENV PORT=7860

# Run the Discord bot bridge
CMD ["node", "index.js"]
