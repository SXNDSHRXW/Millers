# MILLERS Beatstore Backend

This backend handles Stripe payments and automatically sends beat files to customers via email after purchase.

## How It Works

1. Customer clicks "Buy" on your Beatstore page
2. Backend creates a Stripe Checkout session
3. Customer pays on Stripe's secure page
4. Stripe sends a webhook to your backend
5. Backend emails the beat files to the customer
6. Beat is marked as sold (removed from store)

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your details:

```bash
cp .env.example .env
```

Edit `.env`:

```env
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_live_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Email Configuration
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Your website URL
FRONTEND_URL=https://yourdomain.com

PORT=3000
```

### 3. Get Your Stripe Keys

1. Create a Stripe account: https://stripe.com
2. Go to Developers → API Keys
3. Copy your Secret Key and Publishable Key
4. Switch to "Live" mode for production

### 4. Set Up Stripe Webhook

1. In Stripe Dashboard, go to Developers → Webhooks
2. Click "Add endpoint"
3. Enter your backend URL: `https://your-backend.com/webhook`
4. Select event: `checkout.session.completed`
5. Copy the Webhook Signing Secret to your `.env` file

### 5. Configure Email (Gmail)

**Option A: Gmail App Password (Recommended for testing)**
1. Enable 2-Factor Authentication on your Google account
2. Go to Google Account → Security → App Passwords
3. Generate an app password for "Mail"
4. Use that password in `EMAIL_PASS`

**Option B: SendGrid (Recommended for production)**
```javascript
// Replace nodemailer config in server.js with:
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
```

### 6. Upload Your Beat Files

Upload your beat files to a secure hosting service:

- **AWS S3** (recommended)
- **Google Cloud Storage**
- **Cloudinary**
- **Dropbox Direct Links**
- **Your own server**

Update the `beatFiles` object in `server.js` with your actual file URLs:

```javascript
const beatFiles = {
    'beat1': {
        name: 'Midnight Trap',
        wav: 'https://your-storage.com/beats/beat1.wav',
        stems: 'https://your-storage.com/beats/beat1_stems.zip'
    },
    // ... more beats
};
```

### 7. Update Frontend API URL

In `beatstore.html`, update the API_URL:

```javascript
const API_URL = 'https://millerss.co.uk'; // Your backend URL
```

### 8. Run the Server

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

### 9. Deploy Your Backend

Deploy to a hosting service:

- **Railway** (recommended, free tier available): https://railway.app
- **Render** (free tier): https://render.com
- **Heroku**: https://heroku.com
- **DigitalOcean**: https://digitalocean.com
- **AWS EC2**: https://aws.amazon.com

**Railway Deployment (Easiest):**
1. Push code to GitHub
2. Connect Railway to your GitHub repo
3. Add environment variables in Railway dashboard
4. Deploy!

## File Structure

```
backend/
├── server.js          # Main server file
├── package.json       # Dependencies
├── .env.example       # Environment template
├── .env               # Your secrets (don't commit this!)
└── README.md          # This file
```

## Security Notes

1. **Never commit `.env` file** - add it to `.gitignore`
2. **Use HTTPS** in production
3. **Validate webhooks** using Stripe signature
4. **Store files securely** - use signed URLs if possible
5. **Rate limit** your API endpoints

## Testing

### Test the Flow Locally

1. Start the server: `npm run dev`
2. Use Stripe Test Mode
3. Use test card: `4242 4242 4242 4242`
4. Any future date, any CVC, any ZIP

### Test Webhook Locally (using Stripe CLI)

```bash
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/webhook
```

Copy the webhook signing secret to your `.env` file.

## Troubleshooting

### Emails not sending?
- Check Gmail app password is correct
- Check spam folders
- Try SendGrid for better deliverability

### Webhooks not working?
- Verify webhook URL is correct
- Check webhook secret matches
- Ensure server is publicly accessible

### Files not attaching?
- Ensure file URLs are publicly accessible
- Check file sizes (email providers have limits ~25MB)
- Use download links instead of attachments for large files

## Customization

### Change Email Template
Edit the HTML in the `sendBeatFiles` function in `server.js`.

### Add More Beats
Add entries to the `beatFiles` object and update `beatstore.html`.

### Use Different Email Provider
Replace nodemailer configuration with your preferred provider (SendGrid, Mailgun, AWS SES).

## Support

For issues or questions:
- Stripe Docs: https://stripe.com/docs
- Nodemailer Docs: https://nodemailer.com
- Email: contact@millersaudio.com
