const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; // Pon tu clave de TMDB
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w500';

let myMovies = JSON.parse(localStorage.getItem('myCineData')) || [];

document.getElementById('searchBtn').addEventListener('click', searchMovies);

async function searchMovies() {
    const query = document.getElementById('searchInput').value;
    if (!query) return;

    const res = await fetch(`${BASE_URL}/search/movie?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await res.json();
    displayResults(data.results);
}

function displayResults(movies) {
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = '';

    movies.forEach(movie => {
        const div = document.createElement('div');
        div.className = 'card';
        div.innerHTML = `
            <img src="${IMG_URL + movie.poster_path}" alt="${movie.title}">
            <h3>${movie.title}</h3>
            <button onclick="saveMovie(${movie.id}, '${movie.title}', '${movie.poster_path}')">Añadir a mi lista</button>
        `;
        resultsContainer.appendChild(div);
    });
}

async function saveMovie(id, title, poster) {
    // Obtenemos detalles adicionales como Director y Actores
    const res = await fetch(`${BASE_URL}/movie/${id}/credits?api_key=${API_KEY}`);
    const credits = await res.json();
    
    const director = credits.crew.find(person => person.job === 'Director')?.name || 'Desconocido';
    const actors = credits.cast.slice(0, 3).map(a => a.name); // Los 3 principales

    const movieEntry = { id, title, poster, director, actors, dateAdded: new Date() };
    
    myMovies.push(movieEntry);
    localStorage.setItem('myCineData', JSON.stringify(myMovies));
    renderLibrary();
    calculateStats();
}

function calculateStats() {
    const statsDiv = document.getElementById('statsData');
    if (myMovies.length === 0) return;

    // Ejemplo: Calcular Director Favorito
    const directors = myMovies.map(m => m.director);
    const favoriteDirector = directors.sort((a,b) =>
          directors.filter(v => v===a).length - directors.filter(v => v===b).length
    ).pop();

    statsDiv.innerHTML = `
        <p>Total películas: <strong>${myMovies.length}</strong></p>
        <p>Director favorito: <strong>${favoriteDirector}</strong></p>
    `;
}

function renderLibrary() {
    const libContainer = document.getElementById('myLibrary');
    libContainer.innerHTML = myMovies.map(m => `
        <div class="card">
            <img src="${IMG_URL + m.poster}" width="100">
            <h4>${m.title}</h4>
            <p><small>Dir: ${m.director}</small></p>
        </div>
    `).join('');
}

// Cargar al inicio
renderLibrary();
calculateStats();



