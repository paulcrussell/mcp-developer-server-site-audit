# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files
COPY dist ./dist

# Set environment variables
ENV NODE_ENV=production

# Expose port for Cloud Run (required even for stdio servers)
EXPOSE 8080

# Run the MCP server
CMD ["node", "dist/index.js"]
