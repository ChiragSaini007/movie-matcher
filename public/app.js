// Configuration
const API_BASE = window.location.origin;

// State
let currentUser = null;
let tempUserId = null;
let movies = [];
let currentMovieIndex = 0;
let currentPage = 1;
let matches = [];
let isDragging = false;
let startX = 0;
let currentX = 0;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user was previously selected
    const savedUser = localStorage.getItem('movieMatcherUser');
    if (savedUser) {
        selectUser(savedUser);
    } else {
        // Load saved names if they exist
        await loadSavedNames();
    }
});

// Load saved names from server
async function loadSavedNames() {
    try {
        const response1 = await fetch(`${API_BASE}/api/user?userId=user1`);
        const data1 = await response1.json();
        if (data1.success && data1.user.name !== 'User 1') {
            document.getElementById('user1Name').textContent = data1.user.name;
        }

        const response2 = await fetch(`${API_BASE}/api/user?userId=user2`);
        const data2 = await response2.json();
        if (data2.success && data2.user.name !== 'User 2') {
            document.getElementById('user2Name').textContent = data2.user.name;
        }
    } catch (error) {
        console.error('Error loading saved names:', error);
    }
}

// Show name input screen
function showNameInput(userId) {
    tempUserId = userId;

    // Check if name already exists
    const savedName = document.getElementById(`${userId}Name`).textContent;
    if (savedName !== 'Partner 1' && savedName !== 'Partner 2') {
        // Name already set, just login
        selectUser(userId);
    } else {
        // Show name input
        document.getElementById('userSelectSection').style.display = 'none';
        document.getElementById('nameInputSection').style.display = 'block';
        document.getElementById('nameInput').focus();

        // Enable Enter key to submit
        document.getElementById('nameInput').onkeypress = function(e) {
            if (e.key === 'Enter') {
                saveName();
            }
        };
    }
}

// Show user select screen
function showUserSelect() {
    document.getElementById('nameInputSection').style.display = 'none';
    document.getElementById('userSelectSection').style.display = 'flex';
    document.getElementById('nameInput').value = '';
}

// Save name and continue
async function saveName() {
    const nameInput = document.getElementById('nameInput');
    const name = nameInput.value.trim();

    if (!name) {
        alert('Please enter your name!');
        return;
    }

    // Save name to server
    try {
        const response = await fetch(`${API_BASE}/api/user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: tempUserId,
                name: name
            })
        });

        const data = await response.json();
        if (data.success) {
            // Update button text
            document.getElementById(`${tempUserId}Name`).textContent = name;
            // Select user
            selectUser(tempUserId);
        }
    } catch (error) {
        console.error('Error saving name:', error);
        alert('Error saving name. Please try again.');
    }
}

// User selection
function selectUser(userId) {
    currentUser = userId;
    localStorage.setItem('movieMatcherUser', userId);

    // Update UI
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('swipeScreen').classList.add('active');

    // Load user data
    loadUserData();
    loadMovies();
    loadMatches();
}

// Load user data
async function loadUserData() {
    try {
        const response = await fetch(`${API_BASE}/api/user?userId=${currentUser}`);
        const data = await response.json();
        if (data.success) {
            document.getElementById('currentUserName').textContent = data.user.name;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load movies
async function loadMovies() {
    try {
        const response = await fetch(`${API_BASE}/api/movies?userId=${currentUser}&page=${currentPage}`);
        const data = await response.json();

        if (data.success && data.movies.length > 0) {
            movies = data.movies;
            currentMovieIndex = 0;
            displayCurrentMovie();
        } else {
            showNoMoreCards();
        }
    } catch (error) {
        console.error('Error loading movies:', error);
        alert('Unable to load movies. Please check your API configuration.');
    }
}

// Display current movie
function displayCurrentMovie() {
    const cardStack = document.getElementById('cardStack');
    const noMoreCards = document.getElementById('noMoreCards');

    if (currentMovieIndex >= movies.length) {
        currentPage++;
        loadMovies();
        return;
    }

    cardStack.innerHTML = '';
    noMoreCards.style.display = 'none';

    // Create card for current movie and next 2 (for stacking effect)
    for (let i = Math.min(2, movies.length - currentMovieIndex - 1); i >= 0; i--) {
        const movieIndex = currentMovieIndex + i;
        if (movieIndex < movies.length) {
            const card = createMovieCard(movies[movieIndex], i);
            cardStack.appendChild(card);
        }
    }

    // Add touch/mouse events to the top card
    const topCard = cardStack.querySelector('.movie-card');
    if (topCard) {
        topCard.addEventListener('mousedown', handleDragStart);
        topCard.addEventListener('touchstart', handleDragStart);
    }
}

// Create movie card
function createMovieCard(movie, stackIndex) {
    const card = document.createElement('div');
    card.className = 'movie-card';
    card.style.transform = `scale(${1 - stackIndex * 0.05}) translateY(${stackIndex * 10}px)`;
    card.style.zIndex = 100 - stackIndex;

    const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : 'N/A';

    card.innerHTML = `
        <img src="${movie.poster}" alt="${movie.title}" class="movie-poster"
             onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22500%22 height=%22750%22%3E%3Crect fill=%22%23ddd%22 width=%22500%22 height=%22750%22/%3E%3Ctext fill=%22%23999%22 x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 font-size=%2240%22%3ENo Image%3C/text%3E%3C/svg%3E'">
        <div class="movie-info">
            <h3 class="movie-title">${movie.title}</h3>
            <div class="movie-year">${year}</div>

            ${movie.genres && movie.genres.length > 0 ? `
                <div class="genres">
                    ${movie.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                </div>
            ` : ''}

            <div class="ratings">
                ${movie.tmdbRating ? `
                    <div class="rating">
                        <span class="rating-label">TMDB:</span>
                        <span class="rating-value">${movie.tmdbRating.toFixed(1)}/10</span>
                    </div>
                ` : ''}
                ${movie.imdbRating ? `
                    <div class="rating">
                        <span class="rating-label">IMDB:</span>
                        <span class="rating-value">${movie.imdbRating}/10</span>
                    </div>
                ` : ''}
                ${movie.rottenTomatoes ? `
                    <div class="rating">
                        <span class="rating-label">🍅 RT:</span>
                        <span class="rating-value">${movie.rottenTomatoes}</span>
                    </div>
                ` : ''}
            </div>

            <div class="streaming">
                ${movie.streaming.netflix || movie.streaming.amazon || movie.streaming.disney ? `
                    <span class="streaming-badge netflix ${movie.streaming.netflix ? 'available' : ''}">Netflix</span>
                    <span class="streaming-badge amazon ${movie.streaming.amazon ? 'available' : ''}">Prime</span>
                    <span class="streaming-badge disney ${movie.streaming.disney ? 'available' : ''}">Disney+</span>
                ` : `
                    <span class="streaming-badge rent available">🎬 Rent to Watch</span>
                `}
            </div>


            ${movie.cast && movie.cast.length > 0 ? `
                <div class="cast-info">
                    <span class="cast-label">🎭 Cast:</span>
                    <span class="cast-names">${movie.cast.join(', ')}</span>
                </div>
            ` : ''}

            ${movie.trailer ? `
                <a href="${movie.trailer}" target="_blank" class="trailer-btn">
                    <span class="trailer-icon">▶️</span> Watch Trailer
                </a>
            ` : ''}
            <p class="movie-overview">${movie.overview}</p>
        </div>
    `;

    return card;
}

// Drag handlers
function handleDragStart(e) {
    isDragging = true;
    startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
    currentX = startX;

    const card = e.currentTarget;
    card.classList.add('swiping');

    document.addEventListener('mousemove', handleDragMove);
    document.addEventListener('touchmove', handleDragMove);
    document.addEventListener('mouseup', handleDragEnd);
    document.addEventListener('touchend', handleDragEnd);
}

function handleDragMove(e) {
    if (!isDragging) return;

    e.preventDefault();
    currentX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
    const diff = currentX - startX;
    const rotation = diff / 10;

    const card = document.querySelector('.movie-card.swiping');
    if (card) {
        card.style.transform = `translateX(${diff}px) rotate(${rotation}deg)`;

        // Visual feedback
        if (Math.abs(diff) > 100) {
            card.style.opacity = '0.8';
        } else {
            card.style.opacity = '1';
        }
    }
}

function handleDragEnd(e) {
    if (!isDragging) return;

    isDragging = false;
    const diff = currentX - startX;

    document.removeEventListener('mousemove', handleDragMove);
    document.removeEventListener('touchmove', handleDragMove);
    document.removeEventListener('mouseup', handleDragEnd);
    document.removeEventListener('touchend', handleDragEnd);

    const card = document.querySelector('.movie-card.swiping');
    if (card) {
        card.classList.remove('swiping');

        if (diff > 100) {
            swipeLike();
        } else if (diff < -100) {
            swipePass();
        } else {
            // Return to center
            card.style.transform = '';
            card.style.opacity = '';
        }
    }
}

// Swipe actions
async function swipePass() {
    await performSwipe('pass');
}

async function swipeWatched() {
    await performSwipe('watched');
}

async function swipeLike() {
    await performSwipe('like');
}

async function performSwipe(action) {
    const card = document.querySelector('.movie-card');
    if (!card) return;

    // Animate card
    const animClass = action === 'like' ? 'swipe-right' : 'swipe-left';
    card.classList.add(animClass);

    // Send swipe to server
    const movie = movies[currentMovieIndex];
    try {
        const response = await fetch(`${API_BASE}/api/swipe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: currentUser,
                movieId: movie.id,
                action: action,
                movieData: movie
            })
        });

        const data = await response.json();

        if (data.success && data.isMatch) {
            showMatchNotification();
            loadMatches();
        }
    } catch (error) {
        console.error('Error recording swipe:', error);
    }

    // Move to next movie
    setTimeout(() => {
        currentMovieIndex++;
        displayCurrentMovie();
    }, 300);
}

// Show no more cards
function showNoMoreCards() {
    document.getElementById('cardStack').innerHTML = '';
    document.getElementById('noMoreCards').style.display = 'flex';
}

// Load matches
async function loadMatches() {
    try {
        const response = await fetch(`${API_BASE}/api/matches`);
        const data = await response.json();

        if (data.success) {
            matches = data.matches;
            document.getElementById('matchCount').textContent = matches.length;
            displayMatches();
        }
    } catch (error) {
        console.error('Error loading matches:', error);
    }
}

// Display matches
function displayMatches() {
    const matchesList = document.getElementById('matchesList');

    if (matches.length === 0) {
        matchesList.innerHTML = `
            <div class="empty-matches">
                <h3>No matches yet</h3>
                <p>Start swiping to find movies you both love!</p>
            </div>
        `;
        return;
    }

    matchesList.innerHTML = matches.map(match => {
        const movie = match.movieData;
        const year = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';

        return `
            <div class="match-item">
                <img src="${movie.poster || ''}" alt="${movie.title}" class="match-poster"
                     onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22150%22%3E%3Crect fill=%22%23ddd%22 width=%22100%22 height=%22150%22/%3E%3C/svg%3E'">
                <div class="match-info">
                    <div class="match-title">${movie.title}</div>
                    <div class="match-details">
                        ${year} • Matched ${new Date(match.timestamp).toLocaleDateString()}
                    </div>
                    ${movie.imdbRating ? `<div class="match-details">IMDB: ${movie.imdbRating}/10</div>` : ''}
                    ${movie.rottenTomatoes ? `<div class="match-details">🍅 ${movie.rottenTomatoes}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Show matches screen
function showMatches() {
    document.getElementById('swipeScreen').classList.remove('active');
    document.getElementById('matchesScreen').classList.add('active');
}

// Show swipe screen
function showSwipe() {
    document.getElementById('matchesScreen').classList.remove('active');
    document.getElementById('swipeScreen').classList.add('active');
}

// Match notification
function showMatchNotification() {
    document.getElementById('matchNotification').classList.add('show');
}

function hideMatchNotification() {
    document.getElementById('matchNotification').classList.remove('show');
}
