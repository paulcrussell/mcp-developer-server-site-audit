# Docker and GCP Cloud Run Deployment Guide

This guide explains how to containerize and deploy the MCP Site Audit Server to Google Cloud Platform (GCP) Cloud Run.

## Prerequisites

### For Local Docker Usage
- Docker installed on your machine
- Node.js 20+ (for building the TypeScript code)

### For GCP Cloud Run Deployment
- A Google Cloud Platform account
- A GCP project with billing enabled
- The following GCP APIs enabled:
  - Cloud Run API
  - Artifact Registry API
  - Cloud Build API (optional, if using Cloud Build)

## Building the Docker Image Locally

1. **Build the TypeScript code first:**
   ```bash
   npm install
   npm run build
   ```

2. **Build the Docker image:**
   ```bash
   docker build -t mcp-site-audit:latest .
   ```

3. **Run the container locally:**
   ```bash
   docker run -it mcp-site-audit:latest
   ```

   Note: This is an MCP server that uses stdio (standard input/output) for communication, so running it interactively will show the server startup message.

## Manual GCP Cloud Run Deployment

### Step 1: Set up GCP Project

1. Create or select a GCP project:
   ```bash
   gcloud projects create YOUR_PROJECT_ID
   gcloud config set project YOUR_PROJECT_ID
   ```

2. Enable required APIs:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable artifactregistry.googleapis.com
   ```

3. Create an Artifact Registry repository:
   ```bash
   gcloud artifacts repositories create mcp-site-audit \
     --repository-format=docker \
     --location=us-central1 \
     --description="MCP Site Audit Server Docker images"
   ```

### Step 2: Build and Push the Image

1. **Build the TypeScript code:**
   ```bash
   npm install
   npm run build
   ```

2. **Configure Docker authentication:**
   ```bash
   gcloud auth configure-docker us-central1-docker.pkg.dev
   ```

3. **Build and tag the Docker image:**
   ```bash
   docker build -t us-central1-docker.pkg.dev/YOUR_PROJECT_ID/mcp-site-audit/mcp-site-audit:latest .
   ```

4. **Push to Artifact Registry:**
   ```bash
   docker push us-central1-docker.pkg.dev/YOUR_PROJECT_ID/mcp-site-audit/mcp-site-audit:latest
   ```

### Step 3: Deploy to Cloud Run

```bash
gcloud run deploy mcp-site-audit \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT_ID/mcp-site-audit/mcp-site-audit:latest \
  --platform=managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --timeout=300
```

## Automated GitHub Actions Deployment

This repository includes a GitHub Actions workflow (`.github/workflows/deploy-cloud-run.yml`) that automatically builds and deploys the container to GCP Cloud Run when code is pushed to the `main` branch.

### Setup Instructions

1. **Create a GCP Service Account:**
   ```bash
   gcloud iam service-accounts create github-actions \
     --display-name="GitHub Actions Service Account"
   ```

2. **Grant necessary permissions:**
   ```bash
   # Get your project number
   PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format="value(projectNumber)")
   
   # Grant Cloud Run Admin role
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/run.admin"
   
   # Grant Artifact Registry Writer role
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/artifactregistry.writer"
   
   # Grant Service Account User role (required for Cloud Run deployment)
   gcloud projects add-iam-policy-binding YOUR_PROJECT_ID \
     --member="serviceAccount:github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com" \
     --role="roles/iam.serviceAccountUser"
   ```

3. **Create and download a service account key:**
   ```bash
   gcloud iam service-accounts keys create github-actions-key.json \
     --iam-account=github-actions@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```

4. **Add GitHub Secrets:**
   
   In your GitHub repository, go to Settings > Secrets and variables > Actions, then add:
   
   - `GCP_PROJECT_ID`: Your GCP project ID
   - `GCP_SA_KEY`: The entire contents of the `github-actions-key.json` file

5. **Push to main branch:**
   
   The workflow will automatically trigger on pushes to the `main` branch and deploy to Cloud Run.

### Workflow Configuration

The workflow can be customized by editing `.github/workflows/deploy-cloud-run.yml`:

- **Region**: Change `REGION` environment variable (default: `us-central1`)
- **Service Name**: Change `SERVICE_NAME` environment variable (default: `mcp-site-audit`)
- **Resources**: Adjust memory, CPU, and instance limits in the deploy step
- **Trigger**: Modify the `on:` section to change when deployment occurs

## Cloud Run Configuration Options

### Resource Allocation
- **Memory**: 512Mi (can be adjusted from 128Mi to 32Gi)
- **CPU**: 1 (can be adjusted from 0.08 to 8)
- **Timeout**: 300 seconds (max 3600 seconds for 2nd gen)

### Scaling
- **Min instances**: 0 (scales to zero when not in use to save costs)
- **Max instances**: 10 (adjust based on expected traffic)

### Authentication
The default configuration allows unauthenticated access (`--allow-unauthenticated`). For production use, consider:
- Requiring authentication
- Using Cloud Run IAM for access control
- Implementing API keys or other authentication mechanisms

## Monitoring and Logs

View logs and metrics in the GCP Console:
- **Logs**: Console > Cloud Run > [service] > Logs
- **Metrics**: Console > Cloud Run > [service] > Metrics

Or use gcloud CLI:
```bash
# View recent logs
gcloud run services logs read mcp-site-audit --region=us-central1

# Tail logs in real-time
gcloud run services logs tail mcp-site-audit --region=us-central1
```

## Cost Considerations

Cloud Run pricing is based on:
- **CPU and Memory**: Charged per second when handling requests
- **Requests**: $0.40 per million requests
- **Networking**: Egress charges apply

With `min-instances=0`, the service scales to zero when not in use, minimizing costs.

## Troubleshooting

### Build Failures
- Ensure `npm run build` completes successfully locally
- Check that all dependencies are in `package.json`
- Verify Node.js version compatibility (20+)

### Deployment Failures
- Verify service account has correct permissions
- Check that Artifact Registry repository exists
- Ensure GCP APIs are enabled
- Review Cloud Run logs for startup errors

### Container Startup Issues
- The server runs on stdio by default. For Cloud Run, ensure port 8080 is exposed
- Check that all runtime dependencies are included
- Verify environment variables are set correctly

## Security Best Practices

1. **Service Account Permissions**: Use minimum required permissions
2. **Authentication**: Enable authentication for production deployments
3. **Secrets Management**: Use Secret Manager for sensitive data
4. **Network Security**: Use VPC connectors if accessing private resources
5. **Image Scanning**: Enable vulnerability scanning in Artifact Registry

## Additional Resources

- [Cloud Run Documentation](https://cloud.google.com/run/docs)
- [Artifact Registry Documentation](https://cloud.google.com/artifact-registry/docs)
- [GitHub Actions for GCP](https://github.com/google-github-actions)
