let db;
const API_KEY = '854e46049386f788b77a1188730b200b';

// 1. ABRIR BASE DE DATOS
const request = indexedDB.open("CineTrackDB", 100);
request.onsuccess = (e) => { db = e.target.result; cargarPeliculas(); };
request.onupgradeneeded = (e) => {
    let database = e.target.result;
    if (!database.objectStoreNames.contains("peliculas")) {
        database.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

// 2. FUNCIÓN PARA EL MENÚ (Las 3 rayas)
function toggleMenu() {
    const menu = document.getElementById("side-menu");
    menu.classList.toggle("active");
}

// 3. MOSTRAR SECCIONES
function mostrarSeccion(id) {
    // Cerrar menú si está abierto
    document.getElementById("side-menu").classList.remove("active");
    
    // Ocultar todas las secciones
    document.querySelectorAll('.container').forEach(sec => {
        sec.style.display = 'none';
    });
    
    // Mostrar la elegida
    const target = document.getElementById(id);
    if (target) {
        target.style.display = 'block';
    }
}

// 4. BUSCADOR API
async function buscarPeliEnAPI() {
    const query = document.getElementById('input-api').value;
    if (!query) return;
    
    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
    const data = await res.json();
    
    const contenedor = document.getElementById('resultados-api');
    contenedor.innerHTML = "";
    contenedor.style.display = "block";

    data.results.slice(0, 3).forEach(peli => {
        const div = document.createElement('div');
        div.style = "padding:10px; border-bottom:1px solid #333; color:white; cursor:pointer;";
        div.innerText = peli.title;
        div.onclick = () => {
            document.getElementById('titulo').value = peli.title;
            document.getElementById('fotoPortada').value = `https://image.tmdb.org/t/p/w500${peli.poster_path}`;
            contenedor.style.display = "none";
        };
        contenedor.appendChild(div);
    });
}

// 5. GUARDAR Y CARGAR
function validarYGuardar(estado) {
    const peli = {
        titulo: document.getElementById('titulo').value,
        fotoPortada: document.getElementById('fotoPortada').value,
        estado: estado
    };
    const tx = db.transaction("peliculas", "readwrite");
    tx.objectStore("peliculas").add(peli);
    tx.oncomplete = () => {
        alert("¡Guardada!");
        mostrarSeccion('seccion-listado');
        cargarPeliculas();
    };
}

function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    if (!lista || !db) return;
    lista.innerHTML = "";
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        e.target.result.forEach(p => {
            const div = document.createElement('div');
            div.innerHTML = `<img src="${p.fotoPortada}" style="width:100%; border-radius:5px;"><p>${p.titulo}</p>`;
            lista.appendChild(div);
        });
    };
}
