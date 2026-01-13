let db;
let currentTab = 'todas';
const API_KEY = '854e46049386f788b77a1188730b200b';

// 1. INICIALIZACIÓN SEGURA
const request = indexedDB.open("CineTrackDB", 70);
request.onsuccess = (e) => { db = e.target.result; console.log("Base de datos lista"); cargarPeliculas(); };
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

// 2. LA FUNCIÓN QUE HACE FUNCIONAR EL BOTÓN
async function buscarPeliEnAPI() {
    console.log("Botón buscar pulsado");
    const input = document.getElementById('input-api');
    const query = input.value.trim();
    
    if (query.length < 2) return alert("Escribe el nombre de una película");

    const contenedor = document.getElementById('resultados-api');
    contenedor.innerHTML = "<div style='color:white; padding:10px;'>Buscando...</div>";
    contenedor.style.display = "block";

    try {
        const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
        const data = await res.json();
        
        contenedor.innerHTML = "";
        if (data.results.length === 0) {
            contenedor.innerHTML = "<div style='color:white; padding:10px;'>No se encontró nada</div>";
            return;
        }

        data.results.slice(0, 5).forEach(peli => {
            const div = document.createElement('div');
            div.style = "padding:12px; border-bottom:1px solid #444; color:white; cursor:pointer; background:#222;";
            div.innerHTML = `<strong>${peli.title}</strong> (${peli.release_date ? peli.release_date.split('-')[0] : '?'})`;
            div.onclick = () => importarPeli(peli.id);
            contenedor.appendChild(div);
        });
    } catch (error) {
        alert("Error de conexión con el servidor");
    }
}

// 3. IMPORTAR DATOS
async function importarPeli(id) {
    document.getElementById('resultados-api').style.display = "none";
    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
        const p = await res.json();

        document.getElementById('titulo').value = p.title;
        document.getElementById('anio').value = p.release_date ? p.release_date.split('-')[0] : '';
        document.getElementById('genero').value = p.genres[0]?.name || '';
        document.getElementById('fotoPortada').value = `https://image.tmdb.org/t/p/w500${p.poster_path}`;

        const dir = p.credits.crew.find(c => c.job === 'Director');
        if (dir) document.getElementById('nombreDirector').value = dir.name;

        alert("¡Cargado! Ahora rellena la nota y guarda.");
    } catch (e) { alert("Error al cargar detalles"); }
}

// 4. FUNCIONES DE NAVEGACIÓN (INDISPENSABLES)
function mostrarSeccion(id) {
    document.getElementById("side-menu").classList.remove("active");
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    const t = id === 'inicio' ? 'seccion-inicio' : (id === 'listado' ? 'seccion-listado' : id);
    if(document.getElementById(t)) document.getElementById(t).style.display = 'block';
}

function toggleMenu() { document.getElementById("side-menu").classList.toggle("active"); }

function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    if(!lista || !db) return;
    lista.innerHTML = "";
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        e.target.result.forEach(p => {
            const div = document.createElement('div');
            div.innerHTML = `<img src="${p.fotoPortada}" style="width:100%; border-radius:8px;"><h4>${p.titulo}</h4>`;
            lista.appendChild(div);
        });
    };
}
