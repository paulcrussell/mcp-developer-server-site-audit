# Quick Start Guide for GCP Cloud Run Deployment

This is a condensed guide to get your MCP Site Audit Server running on GCP Cloud Run quickly.

## Prerequisites Checklist

- [ ] GCP account with billing enabled
- [ ] GCP project created
- [ ] `gcloud` CLI installed and configured
- [ ] Docker installed locally (for testing)
- [ ] GitHub repository access

## Quick Setup (5 steps)

### 1. Enable GCP Services

```bash
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com
```

### 2. Create Artifact Registry Repository

```bash
gcloud artifacts repositories create mcp-site-audit \
  --repository-format=docker \
  --location=us-central1 \
  --description="MCP Site Audit Docker images"
```

### 3. Set Up Service Account for GitHub Actions

```bash
# Create service account
gcloud iam service-accounts create github-actions \
  --display-name="GitHub Actions"

# Grant permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:github-actions@${PROJECT_ID}.iam.gserviceaccount.com" \
  --role="roles/iam.serviceAccountUser"

# Create key
gcloud iam service-accounts keys create github-actions-key.json \
  --iam-account=github-actions@${PROJECT_ID}.iam.gserviceaccount.com
```

### 4. Configure GitHub Secrets

In your GitHub repository: Settings > Secrets and variables > Actions

Add these secrets:
- **Name**: `GCP_PROJECT_ID`  
  **Value**: Your GCP project ID (e.g., `my-project-123`)

- **Name**: `GCP_SA_KEY`  
  **Value**: Entire contents of `github-actions-key.json` file

### 5. Deploy

Push your code to the `main` branch or manually trigger the workflow:
- Go to Actions tab in GitHub
- Select "Deploy to GCP Cloud Run" workflow
- Click "Run workflow"

## Test Your Deployment

After deployment completes, test your Cloud Run service:

```bash
# Get the service URL
gcloud run services describe mcp-site-audit \
  --region=us-central1 \
  --format="value(status.url)"

# Test (will show MCP server message)
curl https://your-service-url.run.app
```

## Common Issues

### "Permission denied" errors
- Verify service account has all three required roles
- Check that service account exists: `gcloud iam service-accounts list`

### "Repository not found" errors
- Ensure Artifact Registry repository was created
- Verify the repository name matches in workflow (default: `mcp-site-audit`)

### Workflow fails on "Push Docker image"
- Confirm Artifact Registry API is enabled
- Check service account has `artifactregistry.writer` role

## Customization

Edit `.github/workflows/deploy-cloud-run.yml` to customize:

```yaml
env:
  PROJECT_ID: ${{ secrets.GCP_PROJECT_ID }}
  SERVICE_NAME: mcp-site-audit      # Change service name
  REGION: us-central1                # Change region
```

## Cost Estimates

With default configuration (min-instances=0):
- **Idle time**: ~$0 (scales to zero)
- **Active requests**: ~$0.00001 per request + compute time
- **Monthly cost estimate**: $5-20 for light usage

## Next Steps

- [ ] Review logs: `gcloud run services logs read mcp-site-audit --region=us-central1`
- [ ] Set up monitoring in GCP Console > Cloud Run
- [ ] Configure custom domain (optional)
- [ ] Enable authentication (for production)

For detailed information, see [DOCKER-DEPLOYMENT.md](./DOCKER-DEPLOYMENT.md).
