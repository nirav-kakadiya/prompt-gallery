# Gemini API Setup for Title Generation

## Issue
The Gemini text models are not available in your Vertex AI project. The error shows:
```
Publisher Model `projects/.../models/gemini-1.5-flash` was not found or your project does not have access to it.
```

## Solution: Enable Gemini API in Google Cloud Console

1. **Go to Google Cloud Console**
   - Navigate to: https://console.cloud.google.com/
   - Select your project: `vertical-setup-482408-k1`

2. **Enable Vertex AI API**
   - Go to: APIs & Services > Library
   - Search for "Vertex AI API"
   - Click "Enable"

3. **Enable Gemini API**
   - Go to: Vertex AI > Model Garden
   - Search for "Gemini"
   - Enable the following models:
     - Gemini Pro
     - Gemini 1.5 Pro
     - Gemini 1.5 Flash

4. **Check Region Availability**
   - Your current region: `us-east4`
   - Some models may not be available in all regions
   - Try: `us-central1` or `us-west1` if `us-east4` doesn't support Gemini

5. **Update Environment Variable (Optional)**
   - Set `TITLE_GEN_MODEL` in your `.env` file with the exact model name that works
   - Example: `TITLE_GEN_MODEL=gemini-pro`

## Alternative: Use Gemini API Directly (Not Vertex AI)

If Vertex AI models aren't available, you can use the Gemini API directly:
- Requires different authentication (API key instead of service account)
- Different endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent`
- Lower cost but requires API key setup

## Current Behavior

Until Gemini models are enabled:
- Extension will use temporary title (first 6 words of prompt)
- Title generation will fail silently
- No errors shown to user
- Extension works normally otherwise
