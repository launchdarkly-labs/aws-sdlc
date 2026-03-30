# LaunchDarkly Setup Guide

**Insert after: You've started the Inception Phase**

This quick setup gets you ready for LaunchDarkly integration. Kiro CLI will do the heavy lifting later.

---

## What is LaunchDarkly?

LaunchDarkly lets you change how your app works **without redeploying code**:

- **AI Configs**: Switch between AI models (Sonnet vs Opus) instantly
- **Feature Flags**: Turn features on/off for different users

---

## Step 1: Create a LaunchDarkly Account

1. Open a new browser tab: **https://launchdarkly.com/start-trial/**

2. Click **Start free trial**

3. Fill in the form and click **Create account**

4. Check your email and click the verification link

5. Skip the onboarding questions

You now have a 14-day free trial.

---

## Step 2: Get Your API Access Token

### 2a. Navigate to Authorization

1. In LaunchDarkly, click your **profile icon** (bottom-left)
2. Click **Account settings**
3. Click **Authorization** in the left sidebar

### 2b. Create the Token

1. Click **+ Create token**
2. Fill in:
   - **Name**: `workshop-token`
   - **Role**: **Writer** (important!)
3. Click **Create token**
4. **Copy the token immediately** - starts with `api-`, you won't see it again!
5. Save it somewhere safe

```
Example: api-12345678-abcd-1234-efgh-123456789012
```

> **Security**: Never paste your token in chat windows!

---

## You're Done (For Now)

That's all you need during Inception. Save your API token securely.

When you reach the **Construction Phase** and start Kiro CLI, you'll connect it to LaunchDarkly and Kiro will:
- Create a LaunchDarkly project
- Create the AI Config with model variations
- Get the SDK key and store it in AWS
- Set up everything for you

Continue with the Inception Phase → [Construction Phase LaunchDarkly](./construction-launchdarkly.md)

---

## Quick Reference

| What | Format | When You Need It |
|------|--------|------------------|
| API Token | `api-...` | Construction phase (for Kiro CLI) |
| SDK Key | `sdk-...` | Kiro will get this for you |
