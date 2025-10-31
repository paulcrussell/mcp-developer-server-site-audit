# Use Node.js LTS version
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and node_modules
# Note: Build node_modules locally before building the container
COPY package*.json ./
COPY node_modules ./node_modules

# Copy built files
COPY dist ./dist

# Set environment variables
ENV NODE_ENV=production

# Expose port for Cloud Run (required even for stdio servers)
EXPOSE 8080

# Run the MCP server
CMD ["node", "dist/index.js"]
