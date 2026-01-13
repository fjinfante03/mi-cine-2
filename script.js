const API_KEY = 'TU_API_KEY';
const IMG_PATH = 'https://image.tmdb.org/t/p/w500';

// Intentar cargar datos guardados del navegador (localStorage)
let myMovies = JSON.parse(localStorage.getItem('myMovies')) || [];

async function searchMovie() {
    const query = document.getElementById('movieSearch').value;
    const response = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await response.json();
    
    if(data.results.length > 0) {
        addMovieToMyList(data.results[0]);
    }
}

function addMovieToMyList(movie) {
    const newMovie = {
        id: movie.id,
        title: movie.title,
        poster: IMG_PATH + movie.poster_path,
        rating: 0, // Tu nota personal
        director: 'Cargando...', // Requiere otra llamada a la API (credits)
    };

    myMovies.push(newMovie);
    saveAndRender();
}

function saveAndRender() {
    localStorage.setItem('myMovies', JSON.stringify(myMovies));
    renderMovies();
    renderStats();
}

function renderMovies() {
    const grid = document.getElementById('movieGrid');
    grid.innerHTML = myMovies.map(m => `
        <div class="movie-card">
            <img src="${m.poster}" alt="${m.title}">
            <h3>${m.title}</h3>
            <p>Mi nota: ${m.rating}</p>
        </div>
    `).join('');
}

// Renderizar al cargar la página
renderMovies();

