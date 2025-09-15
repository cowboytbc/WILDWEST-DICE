# Render Deployment Guide for WildWest Dice Bot

## Prerequisites

1. **GitHub Repository**: [https://github.com/cowboytbc/WILDWEST-DICE](https://github.com/cowboytbc/WILDWEST-DICE)
2. **Render Account**: Sign up at [render.com](https://render.com)
3. **Deployed Smart Contract** on Base network
4. **Telegram Bot Token** from [@BotFather](https://t.me/BotFather)

## Step 1: Prepare Environment Variables

Before deploying, gather these values:

### Required Environment Variables

```bash
# Telegram Configuration
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrSTUvwxyz
TELEGRAM_BOT_USERNAME=WILDWESTDICE_bot

# Blockchain Configuration  
PRIVATE_KEY=your_wallet_private_key_here
BASE_RPC_URL=https://mainnet.base.org
CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
WILDWEST_TOKEN_ADDRESS=0x0987654321098765432109876543210987654321

# Environment
NODE_ENV=production
NETWORK=base

# Optional
ADMIN_TELEGRAM_ID=123456789
```

## Step 2: Deploy on Render

### Create New Web Service

1. **Login to Render** and click "New +"
2. **Select "Web Service"**
3. **Connect GitHub** repository: `cowboytbc/WILDWEST-DICE`
4. **Configure the service:**

   - **Name**: `wildwest-dice-bot`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

### Configure Environment Variables

In Render dashboard, add all environment variables from Step 1:

1. Go to your service → **Environment**
2. **Add each variable** from the list above
3. **Save changes**

### Database Setup (Optional)

If you want persistent PostgreSQL instead of SQLite:

1. **Create PostgreSQL Database** in Render
2. **Copy DATABASE_URL** from database info
3. **Add DATABASE_URL** to your service environment variables
4. **Update database.js** to handle PostgreSQL (optional enhancement)

## Step 3: Deploy

1. **Push your code** to GitHub:
```bash
git add .
git commit -m "Ready for Render deployment"
git push origin main
```

2. **Render will automatically deploy** when you push to main branch

3. **Monitor deployment** in Render dashboard logs

## Step 4: Verify Deployment

1. **Check Render logs** for successful startup
2. **Test bot** by messaging it on Telegram
3. **Verify database** connectivity
4. **Test game creation** and blockchain interaction

## Important Configuration

### Environment Variables Security

- ✅ **PRIVATE_KEY**: Keep this SECRET - it's your wallet!
- ✅ **TELEGRAM_BOT_TOKEN**: Never commit this to GitHub
- ✅ **DATABASE_URL**: Render provides this automatically

### Render Settings

- **Auto-Deploy**: Enabled (deploys on git push)
- **Health Check Path**: Not needed (background service)
- **Instance Type**: Free tier works for small usage

### Monitoring

Check these in Render dashboard:
- **Service Health**: Should show "Live"
- **Logs**: Monitor for errors
- **Metrics**: CPU and memory usage

## Troubleshooting

### Common Issues

1. **Bot not responding**: Check TELEGRAM_BOT_TOKEN
2. **Blockchain errors**: Verify BASE_RPC_URL and network
3. **Database issues**: Check DATABASE_URL or SQLite permissions
4. **Build failures**: Check Node.js version and dependencies

### Logs

Monitor Render logs for:
```
✅ Bot started successfully
✅ Connected to database
✅ Blockchain service initialized
❌ Look for any error messages
```

### Environment Variable Checklist

- [ ] TELEGRAM_BOT_TOKEN (from @BotFather)
- [ ] PRIVATE_KEY (wallet with ETH for gas)
- [ ] BASE_RPC_URL (Base network RPC)
- [ ] CONTRACT_ADDRESS (deployed contract)
- [ ] WILDWEST_TOKEN_ADDRESS (WWT token)
- [ ] NODE_ENV=production
- [ ] PORT=3000 (Render provides this)

## Scaling

### Free Tier Limits
- **Hours**: 750 hours/month
- **Bandwidth**: Unlimited
- **Database**: 1GB PostgreSQL

### Upgrade Options
- **Starter**: $7/month - Always on
- **Standard**: $25/month - More resources
- **Pro**: $85/month - High availability

## Security Best Practices

1. **Never commit** `.env` file to GitHub
2. **Use environment variables** for all secrets
3. **Rotate keys** periodically
4. **Monitor logs** for suspicious activity
5. **Keep dependencies** updated

## Support

- **Render Docs**: [render.com/docs](https://render.com/docs)
- **GitHub Issues**: [github.com/cowboytbc/WILDWEST-DICE/issues](https://github.com/cowboytbc/WILDWEST-DICE/issues)
- **Render Community**: [community.render.com](https://community.render.com)

Your WildWest Dice Bot will be live on Render! 🤠🎲🚀