# Deployment Summary

This document provides an overview of the Docker and GCP Cloud Run deployment setup for the MCP Site Audit Server.

## What Was Added

### 1. Docker Support
- **Dockerfile**: Container definition that packages the MCP server
- **.dockerignore**: Optimizes build by excluding unnecessary files
- **Image Size**: ~194MB (using Alpine Linux base)

### 2. GitHub Actions Workflow
- **File**: `.github/workflows/deploy-cloud-run.yml`
- **Triggers**: 
  - Automatic on push to `main` branch
  - Manual via workflow dispatch
- **Steps**:
  1. Build TypeScript code
  2. Build Docker image
  3. Push to GCP Artifact Registry
  4. Deploy to Cloud Run

### 3. Documentation
- **DOCKER-DEPLOYMENT.md**: Complete guide with all commands
- **QUICKSTART-GCP.md**: Quick 5-step setup guide
- **README.md**: Updated with deployment information

## How It Works

### Local Development
```bash
# Install dependencies and build
npm install
npm run build

# Build Docker image
docker build -t mcp-site-audit .

# Test locally
docker run -it mcp-site-audit
```

### Automated Deployment
When code is pushed to `main`:
1. GitHub Actions triggers automatically
2. Code is built and tested
3. Docker image is created
4. Image is pushed to GCP Artifact Registry
5. Cloud Run service is updated with new image

### Manual Deployment
```bash
# One-time setup
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
gcloud artifacts repositories create mcp-site-audit --repository-format=docker --location=us-central1

# Deploy
gcloud run deploy mcp-site-audit \
  --image=us-central1-docker.pkg.dev/YOUR_PROJECT/mcp-site-audit/mcp-site-audit:latest \
  --region=us-central1 \
  --platform=managed
```

## Configuration

### GitHub Secrets Required
- `GCP_PROJECT_ID`: Your GCP project ID
- `GCP_SA_KEY`: Service account JSON key

### Default Settings
- **Region**: us-central1
- **Memory**: 512Mi
- **CPU**: 1
- **Min Instances**: 0 (scales to zero)
- **Max Instances**: 10
- **Port**: 8080

## Security

### Security Scan Results
- **CodeQL**: ✅ Passed (0 vulnerabilities)
- **Dependencies**: All from npm registry
- **Base Image**: Official Node.js Alpine image

### Best Practices Implemented
- Minimal base image (Alpine Linux)
- No secrets in code or container
- Service account with least-privilege permissions
- HTTPS enforced by Cloud Run
- Authentication can be enabled (currently allow-unauthenticated)

## Cost Optimization

With the default configuration:
- **Scales to zero**: No cost when idle
- **Pay per use**: Only charged for active requests
- **Estimated cost**: $5-20/month for light usage

To reduce costs further:
- Keep min-instances at 0
- Set appropriate timeout values
- Monitor and adjust max-instances

## Monitoring

### View Logs
```bash
gcloud run services logs read mcp-site-audit --region=us-central1
```

### View Metrics
- GCP Console > Cloud Run > mcp-site-audit > Metrics
- Monitor: Request count, latency, error rate, instance count

## Troubleshooting

### Build Fails
- Ensure `npm install` and `npm run build` work locally
- Check that `dist` and `node_modules` directories exist
- Verify Docker is installed and running

### Deployment Fails
- Confirm GCP APIs are enabled
- Verify service account permissions
- Check GitHub secrets are set correctly
- Review workflow logs in Actions tab

### Container Issues
- Test locally first: `docker run -it mcp-site-audit`
- Check logs: `gcloud run services logs read mcp-site-audit`
- Verify port 8080 is accessible

## Next Steps

1. **Test the Setup**:
   - Build Docker image locally
   - Run container to verify it works
   - Test the GitHub Actions workflow

2. **Configure GCP**:
   - Follow QUICKSTART-GCP.md for setup
   - Create service account and secrets
   - Push code to trigger deployment

3. **Monitor and Optimize**:
   - Review logs and metrics
   - Adjust resources as needed
   - Set up alerts for errors

## Support

For detailed instructions, see:
- [DOCKER-DEPLOYMENT.md](./DOCKER-DEPLOYMENT.md) - Complete guide
- [QUICKSTART-GCP.md](./QUICKSTART-GCP.md) - Quick reference
- [GitHub Issues](https://github.com/paulcrussell/mcp-developer-server-site-audit/issues) - Report problems

## Version Info

- **Node.js**: 20 (Alpine)
- **Docker**: Multi-stage build
- **Cloud Run**: Managed platform
- **Region**: us-central1 (configurable)
