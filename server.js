const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'appData.json');

// Initialize data structure
let appData = {
  users: {
    user1: {
      name: 'User 1',
      liked: [],      // Movies user liked
      passed: [],     // Movies user passed on
      watched: [],    // Movies user already watched
      preferences: {  // For recommendations
        genres: {},
        avgRating: 0
      }
    },
    user2: {
      name: 'User 2',
      liked: [],
      passed: [],
      watched: [],
      preferences: {
        genres: {},
        avgRating: 0
      }
    }
  },
  matches: []  // Will store full movie data
};

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, 'data'))) {
  fs.mkdirSync(path.join(__dirname, 'data'));
}

// Load data from file if exists
if (fs.existsSync(DATA_FILE)) {
  try {
    appData = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    console.log('Starting with fresh data');
  }
}

// Save data to file
function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(appData, null, 2));
}

// Make API request helper
function makeRequest(urlString) {
  return new Promise((resolve, reject) => {
    https.get(urlString, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

// API Keys
const TMDB_API_KEY = process.env.TMDB_API_KEY || 'YOUR_TMDB_API_KEY';
const OMDB_API_KEY = process.env.OMDB_API_KEY || 'YOUR_OMDB_API_KEY';

// Get IMDB ID from TMDB
async function getIMDBId(tmdbId) {
  try {
    const data = await makeRequest(
      `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids?api_key=${TMDB_API_KEY}`
    );
    return data.imdb_id;
  } catch (error) {
    return null;
  }
}

// Get IMDB & Rotten Tomatoes ratings from OMDB
async function getOMDBRatings(imdbId) {
  if (!imdbId || OMDB_API_KEY === 'YOUR_OMDB_API_KEY') {
    return { imdbRating: null, rottenTomatoes: null };
  }

  try {
    const data = await makeRequest(
      `https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`
    );

    const rtRating = data.Ratings?.find(r => r.Source === 'Rotten Tomatoes');

    return {
      imdbRating: data.imdbRating !== 'N/A' ? data.imdbRating : null,
      rottenTomatoes: rtRating ? rtRating.Value : null
    };
  } catch (error) {
    return { imdbRating: null, rottenTomatoes: null };
  }
}

// Get streaming availability from TMDB (India region)
async function getStreamingInfo(movieId) {
  try {
    const data = await makeRequest(
      `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`
    );
    const inProviders = data.results?.IN?.flatrate || [];
    return {
      netflix: inProviders.some(p => p.provider_name.includes('Netflix')),
      amazon: inProviders.some(p => p.provider_name.includes('Prime')),
      disney: inProviders.some(p => p.provider_name.includes('Disney') || p.provider_name.includes('Hotstar'))
    };
  } catch (error) {
    return { netflix: false, amazon: false, disney: false };
  }
}

// Get cast information from TMDB
async function getCast(movieId) {
  try {
    const data = await makeRequest(
      `https://api.themoviedb.org/3/movie/${movieId}/credits?api_key=${TMDB_API_KEY}`
    );
    // Get top 5 cast members
    const cast = data.cast?.slice(0, 5).map(person => person.name) || [];
    return cast;
  } catch (error) {
    return [];
  }
}

// Get trailer from TMDB
async function getTrailer(movieId) {
  try {
    const data = await makeRequest(
      `https://api.themoviedb.org/3/movie/${movieId}/videos?api_key=${TMDB_API_KEY}`
    );
    // Find official trailer from YouTube
    const trailer = data.results?.find(video =>
      video.site === 'YouTube' &&
      (video.type === 'Trailer' || video.type === 'Teaser') &&
      video.official === true
    );
    // If no official trailer, get any YouTube trailer
    const anyTrailer = data.results?.find(video =>
      video.site === 'YouTube' &&
      (video.type === 'Trailer' || video.type === 'Teaser')
    );
    const finalTrailer = trailer || anyTrailer;
    return finalTrailer ? `https://www.youtube.com/watch?v=${finalTrailer.key}` : null;
  } catch (error) {
    return null;
  }
}

// Update user preferences based on their likes AND watched
function updatePreferences(userId, movie, weight = 1) {
  const user = appData.users[userId];

  // Track genre preferences (watched movies get 0.5 weight, liked get 1.0)
  if (movie.genres) {
    movie.genres.forEach(genre => {
      user.preferences.genres[genre] = (user.preferences.genres[genre] || 0) + weight;
    });
  }

  // Track average rating preference
  if (movie.tmdbRating) {
    const totalMovies = user.liked.length + (user.watched.length * 0.5);
    user.preferences.avgRating =
      (user.preferences.avgRating * (totalMovies - weight) + movie.tmdbRating * weight) / totalMovies;
  }
}

// Score movies based on user preferences
function scoreMovie(userId, movie) {
  const user = appData.users[userId];
  let score = 0;

  // Genre matching
  if (movie.genres && Object.keys(user.preferences.genres).length > 0) {
    const totalGenrePrefs = Object.values(user.preferences.genres).reduce((a, b) => a + b, 0);
    movie.genres.forEach(genre => {
      if (user.preferences.genres[genre]) {
        score += (user.preferences.genres[genre] / totalGenrePrefs) * 50;
      }
    });
  }

  // Rating matching
  if (movie.tmdbRating && user.preferences.avgRating > 0) {
    const ratingDiff = Math.abs(movie.tmdbRating - user.preferences.avgRating);
    score += (10 - ratingDiff) * 5;
  }

  return score;
}

// Genre ID to name mapping (TMDB standard genres)
const GENRE_MAP = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy', 80: 'Crime',
  99: 'Documentary', 18: 'Drama', 10751: 'Family', 14: 'Fantasy', 36: 'History',
  27: 'Horror', 10402: 'Music', 9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi',
  10770: 'TV Movie', 53: 'Thriller', 10752: 'War', 37: 'Western'
};

// Get genre names from IDs
function getGenreNames(genreIds) {
  if (!genreIds || !Array.isArray(genreIds)) return [];
  return genreIds.map(id => GENRE_MAP[id]).filter(Boolean).slice(0, 3); // Max 3 genres
}

// Get daily page number for novelty (changes every day)
function getDailyPage() {
  const today = new Date();
  const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
  // Rotate through pages 1-10 based on day of year
  return (dayOfYear % 10) + 1;
}

// Get movies with smart recommendations and daily rotation
async function getMovies(page = 1) {
  try {
    // Add daily offset for novelty
    const dailyPage = getDailyPage();
    const actualPage = ((page - 1) * 10 + dailyPage) % 500 + 1; // TMDB has ~500 pages

    const data = await makeRequest(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${actualPage}`
    );
    return data.results || [];
  } catch (error) {
    console.error('Error fetching movies:', error);
    return [];
  }
}

// Get full movie details
async function getMovieDetails(tmdbId) {
  try {
    const movie = await makeRequest(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_API_KEY}`
    );

    const imdbId = await getIMDBId(tmdbId);
    const omdbRatings = await getOMDBRatings(imdbId);
    const streaming = await getStreamingInfo(tmdbId);

    return {
      id: movie.id,
      title: movie.title,
      poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
      overview: movie.overview,
      releaseDate: movie.release_date,
      genres: movie.genres?.map(g => g.name) || [],
      tmdbRating: movie.vote_average,
      imdbRating: omdbRatings.imdbRating,
      rottenTomatoes: omdbRatings.rottenTomatoes,
      streaming
    };
  } catch (error) {
    return null;
  }
}

// Handle API routes
async function handleAPI(pathname, query, body) {
  // Get movies
  if (pathname === '/api/movies') {
    const userId = query.userId || 'user1';
    const page = parseInt(query.page) || 1;
    const user = appData.users[userId];

    const movies = await getMovies(page);

    // Filter out movies user has interacted with
    const allInteracted = [...user.liked, ...user.passed, ...user.watched];
    const filteredMovies = movies.filter(m => !allInteracted.includes(m.id));

    // Get detailed info for each movie
    const detailedMovies = await Promise.all(
      filteredMovies.slice(0, 10).map(async (movie) => {
        const imdbId = await getIMDBId(movie.id);
        const omdbRatings = await getOMDBRatings(imdbId);
        const streaming = await getStreamingInfo(movie.id);
        const cast = await getCast(movie.id);
        const trailer = await getTrailer(movie.id);

        return {
          id: movie.id,
          title: movie.title,
          poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
          overview: movie.overview,
          releaseDate: movie.release_date,
          genres: getGenreNames(movie.genre_ids),
          genreIds: movie.genre_ids || [],
          tmdbRating: movie.vote_average,
          imdbRating: omdbRatings.imdbRating,
          rottenTomatoes: omdbRatings.rottenTomatoes,
          streaming,
          cast,
          trailer
        };
      })
    );

    // Sort by preference score if user has history
    if (user.liked.length > 0) {
      detailedMovies.sort((a, b) => scoreMovie(userId, b) - scoreMovie(userId, a));
    }

    return { success: true, movies: detailedMovies };
  }

  // Record swipe
  if (pathname === '/api/swipe' && body) {
    const { userId, movieId, action, movieData } = body; // action: 'like', 'pass', 'watched'

    if (!appData.users[userId]) {
      return { success: false, error: 'Invalid user' };
    }

    const user = appData.users[userId];

    // Add to appropriate list
    if (action === 'like' && !user.liked.includes(movieId)) {
      user.liked.push(movieId);
      updatePreferences(userId, movieData, 1.0); // Full weight for likes
    } else if (action === 'pass' && !user.passed.includes(movieId)) {
      user.passed.push(movieId);
    } else if (action === 'watched' && !user.watched.includes(movieId)) {
      user.watched.push(movieId);
      updatePreferences(userId, movieData, 0.5); // Half weight for watched
    }

    // Check for match (only on likes)
    let isMatch = false;
    if (action === 'like') {
      const otherUser = userId === 'user1' ? 'user2' : 'user1';
      if (appData.users[otherUser].liked.includes(movieId)) {
        if (!appData.matches.find(m => m.movieId === movieId)) {
          appData.matches.push({
            movieId,
            movieData,
            timestamp: Date.now()
          });
          isMatch = true;
        }
      }
    }

    saveData();
    return { success: true, isMatch };
  }

  // Get matches with full movie data (filter expired ones)
  if (pathname === '/api/matches') {
    const now = Date.now();
    const MATCH_EXPIRY = 48 * 60 * 60 * 1000; // 48 hours in milliseconds

    // Filter out expired matches
    const activeMatches = appData.matches.filter(match => {
      return (now - match.timestamp) < MATCH_EXPIRY;
    });

    // Update if any were removed
    if (activeMatches.length !== appData.matches.length) {
      appData.matches = activeMatches;
      saveData();
    }

    return { success: true, matches: activeMatches };
  }

  // Poll for new matches (for real-time notifications)
  if (pathname === '/api/poll-matches' && query.userId) {
    const now = Date.now();
    const MATCH_EXPIRY = 48 * 60 * 60 * 1000;
    const lastCheck = parseInt(query.since) || (now - 5000); // Last 5 seconds

    // Find new matches since last check
    const newMatches = appData.matches.filter(match => {
      const isNew = match.timestamp > lastCheck && match.timestamp <= now;
      const notExpired = (now - match.timestamp) < MATCH_EXPIRY;
      return isNew && notExpired;
    });

    return { success: true, newMatches, timestamp: now };
  }

  // Get movie details by ID
  if (pathname === '/api/movie' && query.id) {
    const movieDetails = await getMovieDetails(query.id);
    return { success: true, movie: movieDetails };
  }

  // Update user name
  if (pathname === '/api/user' && body) {
    const { userId, name } = body;
    if (appData.users[userId]) {
      appData.users[userId].name = name;
      saveData();
      return { success: true };
    }
    return { success: false };
  }

  // Get user data
  if (pathname === '/api/user' && query.userId) {
    return { success: true, user: appData.users[query.userId] };
  }

  return { success: false, error: 'Unknown endpoint' };
}

// Create server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        try {
          const result = await handleAPI(pathname, parsedUrl.query, JSON.parse(body));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message }));
        }
      });
    } else {
      try {
        const result = await handleAPI(pathname, parsedUrl.query);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    }
    return;
  }

  // Serve static files
  let filePath = path.join(__dirname, 'public', pathname === '/' ? 'index.html' : pathname);

  const extname = path.extname(filePath);
  const contentTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.svg': 'image/svg+xml'
  };

  const contentType = contentTypes[extname] || 'text/plain';

  fs.readFile(filePath, (error, content) => {
    if (error) {
      if (error.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File not found');
      } else {
        res.writeHead(500);
        res.end('Server error: ' + error.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Movie Matcher server running at http://localhost:${PORT}/`);
  console.log('\nAPI Keys Status:');
  console.log('TMDB:', TMDB_API_KEY !== 'YOUR_TMDB_API_KEY' ? '✓ Configured' : '✗ Not configured');
  console.log('OMDB:', OMDB_API_KEY !== 'YOUR_OMDB_API_KEY' ? '✓ Configured' : '✗ Not configured (IMDB/RT scores disabled)');
});
