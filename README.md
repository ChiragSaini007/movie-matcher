# 🎬 Movie Matcher v2.0 - Enhanced Edition

A Tinder-style movie discovery app for couples with smart recommendations and Rotten Tomatoes integration!

## 🆕 What's New in v2.0

### ✅ Fixed Issues:
- **Matches Screen Now Works!** - Shows full movie details instead of "Loading..."
- **Three-Way Swiping** - Pass, Watched, and Like buttons
- **Separate Tracking** - Pass ≠ Watched. Keep your history organized!

### 🚀 New Features:
- **🍅 Rotten Tomatoes Scores** - See RT ratings alongside IMDB
- **🧠 Smart Recommendations** - App learns your preferences and suggests movies you'll love
- **👁️ Watched Button** - Mark movies you've already seen
- **📊 Preference Tracking** - Tracks genres and ratings you like
- **💾 Better Data Management** - Separate lists for liked, passed, and watched movies

## How It Works

### Three Swipe Options:

1. **❤️ Like** - You want to watch this movie
   - If your partner also likes it → **It's a Match!** 🎉
   - Tracks your preferences for better recommendations

2. **✕ Pass** - Not interested in this movie
   - Won't show up again
   - Helps refine recommendations

3. **👁️ Watched** - Already seen this movie
   - Removes it from your queue
   - Doesn't affect match logic

### Smart Recommendations:

The app learns from your behavior:
- **Genre Preferences** - Likes action movies? You'll see more!
- **Rating Patterns** - Prefers highly-rated films? Noted!
- **Personalized Queue** - Movies sorted by what you'll probably like

## API Keys Required

### 1. TMDB API Key (Required)
- Get it: https://www.themoviedb.org/settings/api
- Provides: Movie data, posters, TMDB ratings, streaming info

### 2. OMDB API Key (Optional but Recommended)
- Get it: http://www.omdbapi.com/apikey.aspx
- Provides: IMDB ratings, Rotten Tomatoes scores
- Free tier: 1,000 requests/day

## Quick Start

### Local Development:

1. **Get API Keys** (see above)

2. **Set Environment Variables:**
   ```bash
   export TMDB_API_KEY="your_tmdb_key"
   export OMDB_API_KEY="your_omdb_key"
   ```

3. **Start Server:**
   ```bash
   node server.js
   ```

4. **Open:** http://localhost:3000

### Deploy to Render.com:

1. **Push to GitHub** (see DEPLOYMENT_GUIDE.md)

2. **Create Web Service on Render**

3. **Add Environment Variables:**
   - `TMDB_API_KEY` = your TMDB key
   - `OMDB_API_KEY` = your OMDB key

4. **Deploy!**

## Data Structure

```json
{
  "users": {
    "user1": {
      "name": "User 1",
      "liked": [123, 456],
      "passed": [789],
      "watched": [321],
      "preferences": {
        "genres": {
          "Action": 5,
          "Comedy": 3
        },
        "avgRating": 7.5
      }
    }
  },
  "matches": [{
    "movieId": 123,
    "movieData": { /* full movie info */ },
    "timestamp": 1234567890
  }]
}
```

## Features

✅ Tinder-style swipe interface
✅ Three action buttons (Like, Pass, Watched)
✅ TMDB ratings
✅ IMDB ratings (with OMDB)
✅ Rotten Tomatoes scores (with OMDB)
✅ Netflix/Amazon/Disney+ availability
✅ Smart recommendations based on your taste
✅ Match notifications
✅ Persistent data storage
✅ Works across multiple devices
✅ Learns your preferences over time

## Tech Stack

- **Backend:** Node.js (vanilla, no frameworks!)
- **Frontend:** Vanilla JavaScript, HTML5, CSS3
- **APIs:** TMDB, OMDB
- **Storage:** JSON file-based database

## Troubleshooting

### "Loading..." in Matches
- **Fixed in v2.0!** Matches now store full movie data

### No Rotten Tomatoes Scores
- Make sure you added your OMDB API key
- Check the server logs for API key status

### Recommendations Not Working
- Start swiping! The app needs data to learn
- After ~10 likes, you'll see personalized recommendations

## Upgrade from v1.0

If you're upgrading from v1.0:

1. **Backup your data:** Copy `data/appData.json`
2. **Replace files** with v2.0 files
3. **Add OMDB key** to environment variables
4. **Restart server**

**Note:** Old data structure will be migrated automatically, but liked/passed/watched will start fresh.

## License

Free to use and modify for personal use.

## Credits

- Movie data: [The Movie Database (TMDB)](https://www.themoviedb.org/)
- Ratings: [OMDB API](http://www.omdbapi.com/)

---

**Enjoy smarter movie matching! 🎬❤️**
