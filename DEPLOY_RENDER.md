# Deploying TrajectIQ to Render

This guide explains how to deploy TrajectIQ to Render.com for free.

## Prerequisites

1. A GitHub account
2. A Render.com account (free tier works)
3. The TrajectIQ code pushed to GitHub

## Step 1: Push to GitHub

First, push all the code to your GitHub repository:

```bash
cd TrajectIQ
git add .
git commit -m "Prepare for Render deployment"
git push origin main
```

## Step 2: Deploy Backend to Render

1. Go to [Render Dashboard](https://dashboard.render.com/)
2. Click **New** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `trajectiq-api`
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements-render.txt`
   - **Start Command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
   - **Environment**: `Python 3`
   - **Plan**: Free

5. Click **Create Web Service**

Wait for deployment to complete. Your API will be available at:
```
https://trajectiq-api.onrender.com
```

## Step 3: Deploy Frontend to Render

1. In Render Dashboard, click **New** → **Web Service**
2. Select the same GitHub repository
3. Configure:
   - **Name**: `trajectiq-dashboard`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment**: `Node`
   - **Plan**: Free

4. Add Environment Variable:
   - **Key**: `NEXT_PUBLIC_API_URL`
   - **Value**: `https://trajectiq-api.onrender.com`

5. Click **Create Web Service**

Your dashboard will be available at:
```
https://trajectiq-dashboard.onrender.com
```

## Alternative: One-Click Deploy with render.yaml

1. Fork the repository to your GitHub
2. Go to [Render Blueprint](https://dashboard.render.com/select-repo)
3. Select your forked repository
4. Render will detect `render.yaml` and create both services automatically

## Testing Your Deployment

### Test API Health
```bash
curl https://trajectiq-api.onrender.com/health
```

Expected response:
```json
{"status": "healthy"}
```

### Test Full Evaluation
```bash
curl -X POST https://trajectiq-api.onrender.com/api/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "resume_content": "John Doe, Software Engineer, 5 years Python experience",
    "job_requirements": {
      "job_id": "TEST-001",
      "job_title": "Software Engineer",
      "required_skills": [
        {"name": "Python", "minimum_years": 3, "is_critical": true}
      ]
    }
  }'
```

## Environment Variables

### Backend
| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 8000 |
| LOG_LEVEL | Logging level | INFO |

### Frontend
| Variable | Description | Required |
|----------|-------------|----------|
| NEXT_PUBLIC_API_URL | Backend API URL | Yes |

## Free Tier Limits

Render free tier includes:
- 750 hours/month per service
- Services spin down after inactivity (15 min)
- Cold start ~30 seconds

## Troubleshooting

### Backend Not Starting
- Check build logs for dependency issues
- Verify `requirements-render.txt` is correct

### Frontend Can't Connect to API
- Verify `NEXT_PUBLIC_API_URL` is set correctly
- Check CORS settings in backend

### Cold Start Issues
- Free tier services sleep after 15 minutes of inactivity
- First request may take 30+ seconds

## Upgrading to Paid Plan

For production use, consider upgrading:
- No cold starts
- More RAM/CPU
- Custom domains
- SSL certificates

## Architecture

```
┌──────────────────┐     ┌──────────────────┐
│   Frontend        │────▶│    Backend        │
│   (Next.js)       │     │    (FastAPI)      │
│   Render.com      │     │    Render.com     │
└──────────────────┘     └──────────────────┘
```

## Support

- GitHub Issues: [TrajectIQ Issues](https://github.com/your-repo/TrajectIQ/issues)
- Render Docs: [Render Documentation](https://render.com/docs)
