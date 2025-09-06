# Render Deployment Guide

## Step 1: Upload to GitHub

1. **Create a new repository on GitHub**
   - Go to github.com
   - Click "New repository"
   - Name it: `computer-shop`
   - Make it public (required for free Render)

2. **Upload your code**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/computer-shop.git
   git push -u origin main
   ```

## Step 2: Set Up Free MySQL Database

### Option A: PlanetScale (Recommended)
1. Go to [planetscale.com](https://planetscale.com)
2. Sign up with GitHub
3. Create a new database
4. Get connection details:
   - Host: `your-host.planetscale.com`
   - Username: `your-username`
   - Password: `your-password`
   - Database: `your-database-name`

### Option B: freemysqlhosting.net
1. Go to [freemysqlhosting.net](https://freemysqlhosting.net)
2. Sign up for free account
3. Create new database
4. Get connection details

## Step 3: Deploy on Render

1. **Go to Render**
   - Visit [render.com](https://render.com)
   - Sign up with GitHub

2. **Create New Web Service**
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Choose your `computer-shop` repository

3. **Configure Service**
   - **Name**: `computer-shop`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`

4. **Set Environment Variables**
   - `FLASK_ENV`: `production`
   - `SECRET_KEY`: Generate a random string
   - `MYSQL_HOST`: Your MySQL host
   - `MYSQL_USER`: Your MySQL username
   - `MYSQL_PASSWORD`: Your MySQL password
   - `MYSQL_DB`: Your MySQL database name

5. **Deploy**
   - Click "Create Web Service"
   - Wait for deployment to complete
   - Your app will be available at `https://computer-shop.onrender.com`

## Step 4: Database Migration

After deployment, you need to set up your database:

1. **Connect to your MySQL database**
2. **Import your existing schema** (from your local database)
3. **Or run your migration scripts**

## Files Created for Render

- `render.yaml` - Render configuration
- `.gitignore` - Excludes unnecessary files from Git
- This guide - Step-by-step instructions

## Troubleshooting

- **Build fails**: Check the build logs in Render dashboard
- **Database connection fails**: Verify environment variables
- **App crashes**: Check the service logs

## Cost

- **Render**: Free (with limitations)
- **PlanetScale**: Free (1 database, 1GB storage)
- **Total**: $0/month
