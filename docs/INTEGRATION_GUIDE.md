# TrajectIQ Enterprise - Email & ATS Integration Guide

## Email Integration Setup

### Overview

TrajectIQ can automatically scan your email inbox for resume attachments and evaluate candidates. This document explains how to set up email integration with your email provider.

### Supported Email Providers

| Provider | Server | Port | SSL | Notes |
|----------|--------|------|-----|-------|
| Gmail | imap.gmail.com | 993 | Yes | Requires App Password |
| Outlook/Office 365 | outlook.office365.com | 993 | Yes | May require App Password |
| Yahoo | imap.mail.yahoo.com | 993 | Yes | Requires App Password |
| Custom IMAP | Your server | 993 or 143 | Yes/No | Contact your IT admin |

---

### Gmail Setup (Most Common)

#### Step 1: Enable IMAP
1. Go to Gmail (gmail.com)
2. Click Settings (gear icon) → "See all settings"
3. Go to "Forwarding and POP/IMAP" tab
4. Under "IMAP access", select "Enable IMAP"
5. Click "Save Changes"

#### Step 2: Create an App Password
**IMPORTANT:** Gmail no longer accepts your regular password for third-party apps. You must create an App Password.

1. Go to your Google Account: myaccount.google.com
2. Select "Security" from the left menu
3. Under "How you sign in to Google", select "2-Step Verification" (enable it if not already enabled)
4. Scroll down and click "App passwords"
5. Click "Create" or "+"
6. Enter a name (e.g., "TrajectIQ")
7. Google will show a 16-character password (format: xxxx xxxx xxxx xxxx)
8. **Copy this password** - you won't see it again!

#### Step 3: Configure TrajectIQ
1. Open TrajectIQ
2. Go to "Email Integration" tab
3. Enter the following:
   - **Host:** `imap.gmail.com`
   - **Port:** `993`
   - **Username:** Your Gmail address (e.g., `yourname@gmail.com`)
   - **Password:** The App Password you created (not your Gmail password!)
   - **SSL:** Check the box
4. Click "Connect"

If successful, you'll see "Connected to imap.gmail.com" and can now scan for resumes.

---

### Outlook/Office 365 Setup

#### Option A: Modern Authentication (Recommended)
If your organization uses Modern Authentication, you may need to:
1. Contact your IT administrator
2. Request an App Password or API access

#### Option B: App Password (Personal Accounts)
1. Go to account.microsoft.com
2. Select "Security" → "Advanced security options"
3. Under "App passwords", create a new one for TrajectIQ
4. Use the same settings as Gmail but with:
   - **Host:** `outlook.office365.com`
   - **Port:** `993`

---

### Common Connection Issues

#### "Authentication failed"
- **Cause:** Wrong password or App Password not set up
- **Solution:** Create an App Password (see instructions above)

#### "Connection timeout"
- **Cause:** Server address wrong or firewall blocking
- **Solution:** 
  - Verify the IMAP server address
  - Check if your network allows IMAP (port 993)
  - Try disabling VPN temporarily

#### "SSL certificate error"
- **Cause:** SSL verification issue
- **Solution:** Ensure SSL checkbox is checked for secure servers

#### "Login disabled"
- **Cause:** Gmail/Outlook security policy
- **Solution:** 
  1. Check your email for security alerts
  2. Visit account security settings
  3. Allow "less secure apps" or create App Password

---

## ATS Integration Setup

### Supported ATS Providers

| Provider | API Key Required | Company ID | Features |
|----------|-----------------|------------|----------|
| Greenhouse | Yes | No | Full sync |
| Lever | Yes | No | Full sync |
| Workable | Yes | Yes (subdomain) | Full sync |

### Greenhouse Setup

#### Step 1: Get API Key
1. Log into Greenhouse
2. Go to "Configure" → "DEV Center" → "API Credentials"
3. Click "Create New API Key"
4. Select "Harvest" API
5. Give it a name (e.g., "TrajectIQ Integration")
6. Select permissions:
   - Candidates: Read
   - Jobs: Read
   - Applications: Read
7. Click "Create" and copy the API key

#### Step 2: Configure TrajectIQ
1. Go to "ATS Integration" tab
2. Select "Greenhouse" from dropdown
3. Paste your API key
4. Leave Company ID empty
5. Click "Connect"

---

### Lever Setup

#### Step 1: Get API Key
1. Log into Lever
2. Go to "Settings" → "Integrations" → "API"
3. Create a new API key
4. Give it read access to:
   - Candidates
   - Postings
   - Applications
5. Copy the API key

#### Step 2: Configure TrajectIQ
1. Go to "ATS Integration" tab
2. Select "Lever" from dropdown
3. Paste your API key
4. Leave Company ID empty
5. Click "Connect"

---

### Workable Setup

#### Step 1: Get API Key
1. Log into Workable
2. Go to "Integrations" → "API"
3. Create a new API token
4. Copy the API key and note your subdomain

#### Step 2: Configure TrajectIQ
1. Go to "ATS Integration" tab
2. Select "Workable" from dropdown
3. Paste your API key
4. Enter your Workable subdomain (e.g., `yourcompany` from yourcompany.workable.com)
5. Click "Connect"

---

## How Resume Detection Works

When scanning emails, TrajectIQ looks for:

1. **Subject Keywords:** "resume", "cv", "application", "candidate", "applying for"
2. **Attachment Types:** PDF, DOC, DOCX, TXT, RTF
3. **Attachment Names:** Files containing "resume", "cv", "curriculum"
4. **Body Content:** Keywords like "experience", "education", "skills"

The system assigns a confidence score to each detected resume and only shows those above the threshold.

---

## Security Notes

### Your Credentials
- **Email passwords** are stored encrypted locally on your machine
- **ATS API keys** are never transmitted to TrajectIQ servers
- All data remains on your local machine

### Best Practices
1. Use **App Passwords** instead of your main password
2. Grant **minimum required permissions** to API keys
3. **Rotate API keys** periodically
4. **Disconnect** integrations when not in use

---

## Troubleshooting

### No Resumes Found
If the scan completes but finds no resumes:
1. Verify you have emails with resume attachments
2. Check that emails are in the INBOX folder (or create folder rules)
3. Increase the scan days range
4. Ensure attachments are supported formats (PDF, DOC, DOCX)

### Connection Lost
If you lose connection:
1. Click "Disconnect" then "Connect" again
2. Verify your API key hasn't expired
3. Check if your App Password is still valid
4. Ensure your internet connection is stable

---

## Support

If you encounter issues:
1. Check the log files in `%APPDATA%\TrajectIQ\logs\`
2. Contact support@trajectiq.com
3. Include error messages and your email provider in the support request

---

*Last Updated: March 2024*
*Version: 3.0.0*
