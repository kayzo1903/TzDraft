# Cloudflare R2 Setup Guide

## Prerequisites
- Cloudflare account (free tier available)
- Domain connected to Cloudflare (optional for R2)

## Step 1: Enable R2 in Cloudflare Dashboard

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Select your account
3. Go to **R2** in the sidebar (or search for "R2")
4. Click **Create bucket** if prompted, or proceed to create one

## Step 2: Create R2 Bucket

1. In R2 dashboard, click **Create bucket**
2. Enter bucket name: `tzdraft`
3. Choose location (default is fine)
4. Click **Create bucket**

## Step 3: Get Account ID

Your Account ID is visible in the R2 dashboard URL or:
1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Look at the URL: `https://dash.cloudflare.com/{ACCOUNT_ID}/`
3. Copy the ACCOUNT_ID from the URL

**Example**: If URL is `https://dash.cloudflare.com/1234567890abcdef/r2`, then Account ID is `1234567890abcdef`

## Step 4: Create R2 S3 Credentials

1. In Cloudflare Dashboard, open **R2**
2. Go to **Manage R2 API tokens**
3. Create a token with read/write access for your bucket
4. Copy the generated **Access Key ID**
5. Copy the generated **Secret Access Key**

These are the S3-compatible credentials the AWS SDK expects. A generic Cloudflare API token is not enough for the S3 upload client used by the backend.

## Step 5: Configure Bucket Access

### Option A: Public Access (Recommended for development)
1. In R2 dashboard, select your `tzdraft` bucket
2. Go to **Settings** tab
3. Under **Public access**, click **Allow access**
4. This will generate a public URL like: `https://pub-xxxx.r2.dev`

### Option B: Private Access (Production)
Keep bucket private and use S3-compatible R2 credentials for writes.

## Step 6: Update .env File

In your `backend/.env` file:

```bash
# Cloudflare R2 Storage
R2_ACCOUNT_ID="your-account-id-here"
R2_BUCKET_NAME="tzdraft"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_PUBLIC_URL="https://pub-xxxx.r2.dev"  # From step 5A
```

## Step 7: Test Connection

Run this to test your R2 setup:

```bash
cd backend
npm run test:r2  # or however you test storage
```

## Troubleshooting

### Common Issues:

1. **"Invalid account ID"**
   - Double-check the Account ID from dashboard URL

2. **"Access denied"**
   - Verify the R2 Access Key ID and Secret Access Key are correct
   - Regenerate the R2 credentials if needed

3. **"Bucket not found"**
   - Confirm bucket name is exactly `tzdraft`

4. **Public URL not working**
   - Make sure you enabled public access in bucket settings

## Security Notes

- **Never commit R2 credentials to git**
- Use different tokens for development/production
- Rotate tokens regularly
- For production, scope R2 credentials to the minimum bucket access you need

## Resources

- [Cloudflare R2 Documentation](https://developers.cloudflare.com/r2/)
- [API Token Creation](https://developers.cloudflare.com/api/tokens/create/)
- [R2 Pricing](https://www.cloudflare.com/plans/developer-platform/)</content>
<parameter name="filePath">c:\Users\Admin\Desktop\TzDraft\docs\r2-setup-guide.md
