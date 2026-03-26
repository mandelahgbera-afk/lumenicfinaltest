# LumenicData Application Form - Deployment Guide

## 🚨 CRITICAL FIX FOR FILE UPLOADS

This update fixes the issue where uploaded files (selfie, ID photos, CV) were not being submitted to Telegram.

---

## What Was Broken

1. **API Directory Structure**: The serverless function was at the root level instead of in `/api/` directory
2. **Vercel Configuration**: `vercel.json` was missing proper route configuration
3. **Error Handling**: Insufficient logging made debugging impossible

---

## Files Changed

| File | Change |
|------|--------|
| `api/submit-application.js` | **NEW** - Moved to proper API directory with comprehensive error handling |
| `vercel.json` | **UPDATED** - Added proper route configuration |
| `package.json` | **UPDATED** - Cleaned dependencies |
| `apply.js` | **UPDATED** - Better error handling and logging |

---

## Deployment Steps

### Step 1: Set Environment Variables in Vercel

Go to your Vercel Dashboard → Project Settings → Environment Variables

Add these variables:

```
TG_BOT_TOKEN=your_bot_token_here
TG_CHAT_ID=your_chat_id_here
```

**How to get these values:**

1. **Bot Token**: Message @BotFather on Telegram, create a bot, copy the token
2. **Chat ID**: 
   - Add your bot to the group/channel where you want notifications
   - Send a test message in that group
   - Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
   - Look for `"chat":{"id":-123456789` - that's your chat ID (negative number for groups)

### Step 2: Deploy

Push all files to your Git repository and Vercel will auto-deploy.

Required files to commit:
```
api/submit-application.js
apply.js
vercel.json
package.json
apply.html
styles.css
config.js
main.js
index.html
about.html
```

### Step 3: Test

1. Open the application form
2. Open browser DevTools (F12) → Console
3. Fill out the form and upload files
4. Submit
5. Check console logs - you should see:
   ```
   [Apply] File selected: a-selfie = photo.jpg (123.45KB)
   [Apply] File to upload: a-selfie = photo.jpg (123.45KB)
   [Apply] Converting: a-selfie (123.45KB)
   [Apply] ✓ Converted: a-selfie (base64: 123456 chars)
   [Apply] Payload ready: Files: 4
   [Apply] Sending request...
   [Apply] Response status: 200
   [Apply] ✓ Submission successful!
   ```

6. Check your Telegram - you should receive:
   - A text message with all form data
   - Each uploaded file as a separate message

---

## Troubleshooting

### "Backend not configured" Error

**Problem**: Environment variables not set

**Solution**: 
1. Go to Vercel Dashboard → Project Settings → Environment Variables
2. Add `TG_BOT_TOKEN` and `TG_CHAT_ID`
3. Redeploy the project

### "Cannot connect to server" Error

**Problem**: API route not configured properly

**Solution**: Make sure `vercel.json` is deployed with the route configuration

### Files Not Arriving in Telegram

**Check Vercel Function Logs:**
1. Go to Vercel Dashboard → Your Project → Functions
2. Click on `submit-application.js`
3. Look for logs starting with `[API]`

**Common Issues:**

| Log Message | Problem | Solution |
|-------------|---------|----------|
| `TG_BOT_TOKEN: ✗ MISSING` | Environment variable not set | Add in Vercel dashboard |
| `TG_CHAT_ID: ✗ MISSING` | Environment variable not set | Add in Vercel dashboard |
| `Missing file data (base64)` | File didn't upload properly | Check browser console for errors |
| `Telegram API error` | Invalid bot token or chat ID | Verify credentials |

### Test Telegram Bot Directly

```bash
# Test if bot token works
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getMe"

# Test sending message
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -d "chat_id=<YOUR_CHAT_ID>" \
  -d "text=Test message from LumenicData"
```

---

## File Upload Flow

```
┌─────────────────────────────────────────────────────────────────┐
│  USER SELECTS FILES                                             │
│  ↓                                                              │
│  Frontend validates file size (< 4MB)                          │
│  ↓                                                              │
│  USER CLICKS SUBMIT                                             │
│  ↓                                                              │
│  collectFormData() extracts File objects                        │
│  ↓                                                              │
│  fileToBase64() converts each file to base64                    │
│  ↓                                                              │
│  Payload: {formData: {...}, files: {a-selfie: {...}}}          │
│  ↓                                                              │
│  POST /api/submit-application                                   │
│  ↓                                                              │
│  API receives payload                                           │
│  ↓                                                              │
│  Buffer.from(base64, 'base64') decodes file                     │
│  ↓                                                              │
│  Telegram API: sendMessage (form data)                          │
│  Telegram API: sendPhoto/sendDocument (each file)               │
│  ↓                                                              │
│  Response: {success: true, filesReceived: 4}                    │
│  ↓                                                              │
│  Frontend shows success message                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Field Name Mapping

| HTML Input ID | Backend Field | Telegram Caption |
|---------------|---------------|------------------|
| `a-selfie` | `a-selfie` | 📸 Selfie Photo |
| `a-id-photo-front` | `a-id-photo-front` | 🪪 Government ID - FRONT |
| `a-id-photo-back` | `a-id-photo-back` | 🪪 Government ID - BACK |
| `a-cv` | `a-cv` | 📄 Resume/CV |

---

## Browser Console Debugging

When testing, look for these log prefixes in browser console:

- `[Apply]` - Frontend form handler logs
- Files selected, converted, sent to API

In Vercel Function Logs, look for:

- `[API]` - Backend API logs
- Environment check, file processing, Telegram API calls

---

## Support

If issues persist:

1. Check browser console for JavaScript errors
2. Check Vercel Function Logs for API errors
3. Test Telegram bot credentials directly
4. Verify all environment variables are set correctly

---

## Security Notes

- Never commit `TG_BOT_TOKEN` to git
- Use Vercel Environment Variables for secrets
- The bot token grants full access to your Telegram bot - keep it secure
