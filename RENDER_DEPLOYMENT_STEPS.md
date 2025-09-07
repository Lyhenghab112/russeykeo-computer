# Render Deployment Steps for Keo Computer Shop

## ✅ Completed Steps
1. ✅ Updated `render.yaml` configuration
2. ✅ Updated `.gitignore` to exclude unnecessary files
3. ✅ Pushed code to GitHub repository: `https://github.com/Lyhenghab112/russeykeo-computer.git`

## 🚀 Next Steps for Render Deployment

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with your GitHub account
3. Connect your GitHub repository

### Step 2: Deploy Web Service
1. Click "New" → "Web Service"
2. Connect your GitHub repository: `Lyhenghab112/russeykeo-computer`
3. Configure the service:
   - **Name**: `keo-computer-shop`
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --bind 0.0.0.0:$PORT app:app`

### Step 3: Set Environment Variables
In Render dashboard, add these environment variables:

**Required Variables:**
- `SECRET_KEY`: (Render will generate this automatically)
- `FLASK_ENV`: `production`
- `MYSQL_HOST`: `your-mysql-host` (from external MySQL service)
- `MYSQL_USER`: `your-mysql-username`
- `MYSQL_PASSWORD`: `your-mysql-password`
- `MYSQL_DB`: `your-database-name`
- `MYSQL_PORT`: `3306`
- `SMTP_USERNAME`: `lyhenghab3@gmail.com`
- `SMTP_PASSWORD`: `dxhn mirg iaco vkta`

### Step 4: Set Up MySQL Database
You have two options:

#### Option A: External MySQL (Recommended)
1. **PlanetScale** (Free tier):
   - Go to [planetscale.com](https://planetscale.com)
   - Create new database
   - Get connection details
   - Use these in Render environment variables

2. **Railway MySQL** (Free tier):
   - Go to [railway.app](https://railway.app)
   - Create new MySQL database
   - Get connection string

#### Option B: Use Render's render.yaml (More Complex)
Your `render.yaml` includes a MySQL service, but this requires more configuration.

### Step 5: Deploy and Test
1. Click "Create Web Service" in Render
2. Wait for deployment to complete (5-10 minutes)
3. Your app will be available at: `https://keo-computer-shop.onrender.com`

### Step 6: Database Migration
After deployment, you'll need to:
1. Connect to your MySQL database
2. Import your existing database schema
3. Run any migration scripts if needed

## 🔧 Troubleshooting

### Common Issues:
1. **Build fails**: Check build logs in Render dashboard
2. **Database connection fails**: Verify environment variables
3. **App crashes**: Check service logs
4. **Static files not loading**: Ensure proper file paths

### Logs Location:
- Render Dashboard → Your Service → Logs tab

## 💰 Cost
- **Render Free Tier**: 750 hours/month (enough for small apps)
- **External MySQL**: Free (PlanetScale/Railway free tiers)
- **Total**: $0/month

## 📝 Important Notes
- Your app will sleep after 15 minutes of inactivity (free tier)
- First request after sleep takes ~30 seconds to wake up
- Consider upgrading to paid plan for always-on service

## 🎯 Next Actions
1. Go to [render.com](https://render.com) and start deployment
2. Set up external MySQL database
3. Configure environment variables
4. Deploy and test your application
