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

// Get streaming availability from TMDB
async function getStreamingInfo(movieId) {
  try {
    const data = await makeRequest(
      `https://api.themoviedb.org/3/movie/${movieId}/watch/providers?api_key=${TMDB_API_KEY}`
    );
    const usProviders = data.results?.US?.flatrate || [];
    return {
      netflix: usProviders.some(p => p.provider_name.includes('Netflix')),
      amazon: usProviders.some(p => p.provider_name.includes('Prime')),
      disney: usProviders.some(p => p.provider_name.includes('Disney'))
    };
  } catch (error) {
    return { netflix: false, amazon: false, disney: false };
  }
}

// Update user preferences based on their likes
function updatePreferences(userId, movie) {
  const user = appData.users[userId];

  // Track genre preferences
  if (movie.genres) {
    movie.genres.forEach(genre => {
      user.preferences.genres[genre] = (user.preferences.genres[genre] || 0) + 1;
    });
  }

  // Track average rating preference
  if (movie.tmdbRating) {
    const likedMovies = user.liked.length;
    user.preferences.avgRating =
      (user.preferences.avgRating * (likedMovies - 1) + movie.tmdbRating) / likedMovies;
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

// Get movies with smart recommendations
async function getMovies(page = 1) {
  try {
    const data = await makeRequest(
      `https://api.themoviedb.org/3/movie/popular?api_key=${TMDB_API_KEY}&page=${page}`
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

        return {
          id: movie.id,
          title: movie.title,
          poster: `https://image.tmdb.org/t/p/w500${movie.poster_path}`,
          overview: movie.overview,
          releaseDate: movie.release_date,
          genres: movie.genre_ids || [],
          tmdbRating: movie.vote_average,
          imdbRating: omdbRatings.imdbRating,
          rottenTomatoes: omdbRatings.rottenTomatoes,
          streaming
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
      updatePreferences(userId, movieData);
    } else if (action === 'pass' && !user.passed.includes(movieId)) {
      user.passed.push(movieId);
    } else if (action === 'watched' && !user.watched.includes(movieId)) {
      user.watched.push(movieId);
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

  // Get matches with full movie data
  if (pathname === '/api/matches') {
    return { success: true, matches: appData.matches };
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
