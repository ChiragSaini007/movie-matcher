# 🚀 How to Update Your Live App to v2.0

This guide will help you update your deployed Movie Matcher app with all the new features!

## What You Need

1. ✅ Your GitHub account (ChiragSaini007)
2. ✅ Your TMDB API key (you already have this)
3. 🆕 OMDB API key (get it now - takes 2 minutes!)

---

## Step 1: Get OMDB API Key

**Go to:** http://www.omdbapi.com/apikey.aspx

1. Choose **FREE** (1,000 daily requests)
2. Enter your email: csaini222@gmail.com
3. Click "Submit"
4. **Check your email** and click the activation link
5. **Copy your API key** from the email

---

## Step 2: Update Files on GitHub

### Method A: Upload via Web (Easiest)

1. **Go to your repository:**
   https://github.com/ChiragSaini007/movie-matcher

2. **Delete old files:**
   - Click on `server.js`
   - Click the trash icon 🗑️
   - Commit the deletion
   - Repeat for:
     - `public/app.js`
     - `public/index.html`
     - `public/style.css` (optional - only minor changes)

3. **Upload new files:**
   - Download the new files from movie-matcher-v2 folder
   - Click "Add file" → "Upload files"
   - Upload:
     - `server.js`
     - `public/app.js`
     - `public/index.html`
     - `public/style.css`
   - Commit changes

### Method B: Replace Everything (Clean Slate)

1. **Delete ALL files** from your GitHub repo
2. **Upload ALL files** from the movie-matcher-v2 folder
3. **Commit changes**

---

## Step 3: Add OMDB Key to Render

1. **Go to Render Dashboard:**
   https://dashboard.render.com

2. **Find your movie-matcher service** and click it

3. **Go to "Environment" tab** (on the left)

4. **Click "Add Environment Variable"**
   - Key: `OMDB_API_KEY`
   - Value: [Paste your OMDB key here]

5. **Click "Save Changes"**

---

## Step 4: Redeploy

Render will **automatically redeploy** when you update GitHub!

**Watch the deployment:**
- Go to "Events" or "Logs" tab
- Wait 2-3 minutes for build to complete
- Look for "Deploy succeeded" ✅

**Or trigger manually:**
- Click "Manual Deploy" → "Deploy latest commit"

---

## Step 5: Test Your Updated App!

1. **Open your app URL**
2. **Clear your browser cache** (important!)
   - Press `Ctrl+Shift+R` (Windows/Linux)
   - Press `Cmd+Shift+R` (Mac)
3. **Test the new features:**
   - ✅ See three buttons (Pass, Watched, Like)
   - ✅ Check if IMDB/RT ratings show
   - ✅ Swipe on some movies
   - ✅ Check matches screen (should show movie details!)

---

## What Changed

### Files Updated:
- ✅ `server.js` - Added OMDB integration, preference tracking, better data structure
- ✅ `public/app.js` - Three-button system, fixed matches display
- ✅ `public/index.html` - Added Watched button
- ✅ `public/style.css` - Styled the new Watched button

### New Features You'll See:
1. **Three buttons** instead of two
2. **IMDB & Rotten Tomatoes** ratings on movie cards
3. **Working matches screen** (no more "Loading...")
4. **Better recommendations** over time as you swipe

---

## Troubleshooting

### Still seeing "Loading..." in matches?
- Clear browser cache (Ctrl+Shift+R)
- Make sure new files were uploaded
- Check Render logs for errors

### No IMDB/RT scores showing?
- Make sure you added OMDB_API_KEY to Render
- Check the API key is activated (check your email)
- Look at Render logs - should say "OMDB: ✓ Configured"

### App not updating?
- Check GitHub - make sure new files are there
- Check Render - should show "Deploying" status
- Wait 2-3 minutes for deployment to complete

### Deployment failed?
- Check Render logs for error messages
- Make sure all files are uploaded (especially server.js)
- Verify API keys are correct

---

## Need Help?

**Check these:**
1. Render logs (in Render dashboard)
2. Browser console (F12 → Console tab)
3. Make sure both API keys are set in Render

---

## Quick Checklist

- [ ] Got OMDB API key
- [ ] Activated OMDB key via email
- [ ] Updated files on GitHub
- [ ] Added OMDB_API_KEY to Render
- [ ] Waited for automatic redeploy
- [ ] Cleared browser cache
- [ ] Tested the app
- [ ] Seeing three buttons
- [ ] Seeing IMDB/RT ratings
- [ ] Matches screen working

---

**Once complete, your app will be fully upgraded to v2.0! 🎉**
