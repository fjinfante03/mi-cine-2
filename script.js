let db;
const API_KEY = '854e46049386f788b77a1188730b200b';

// 1. INICIAR BASE DE DATOS
const request = indexedDB.open("CineDB_Final", 1);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};
request.onsuccess = (e) => { 
    db = e.target.result; 
    console.log("Base de datos conectada");
    cargarPeliculas(); 
};

// 2. FUNCIONES DE NAVEGACIÓN
function toggleMenu() {
    const menu = document.getElementById("side-menu");
    if (menu.style.left === "0px") {
        menu.style.left = "-250px";
    } else {
        menu.style.left = "0px";
    }
}

function mostrarSeccion(id) {
    document.getElementById("side-menu").style.left = "-250px";
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

// 3. BUSCADOR AUTOMÁTICO
async function buscarPeliEnAPI() {
    const query = document.getElementById('input-api').value;
    if (!query) return alert("Escribe algo");

    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
    const data = await res.json();
    
    const resDiv = document.getElementById('resultados-api');
    resDiv.innerHTML = "";
    resDiv.style.display = "block";

    data.results.slice(0, 3).forEach(p => {
        const d = document.createElement('div');
        d.style = "padding:10px; border-bottom:1px solid #333; color:white; cursor:pointer;";
        d.innerText = p.title;
        d.onclick = () => {
            document.getElementById('titulo').value = p.title;
            document.getElementById('fotoPortada').value = `https://image.tmdb.org/t/p/w500${p.poster_path}`;
            resDiv.style.display = "none";
        };
        resDiv.appendChild(d);
    });
}

// 4. GUARDAR Y CARGAR
function guardarPeli() {
    const peli = {
        titulo: document.getElementById('titulo').value,
        fotoPortada: document.getElementById('fotoPortada').value
    };
    const tx = db.transaction("peliculas", "readwrite");
    tx.objectStore("peliculas").add(peli);
    tx.oncomplete = () => {
        alert("¡Guardada!");
        document.getElementById('form-pelicula').reset();
        mostrarSeccion('listado');
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
            div.innerHTML = `<img src="${p.fotoPortada}" style="width:100%; border-radius:5px;"><p style="color:white; font-size:12px;">${p.titulo}</p>`;
            lista.appendChild(div);
        });
    };
}

