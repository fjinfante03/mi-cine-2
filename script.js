// CONFIGURACIÓN BASE DE DATOS
let db;
const request = indexedDB.open("CineTrackDB", 1);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = (e) => {
    db = e.target.result;
    cargarPeliculas();
};

// NAVEGACIÓN
function toggleMenu() {
    const menu = document.getElementById("side-menu");
    menu.style.width = menu.style.width === "250px" ? "0" : "250px";
}

function mostrarSeccion(id) {
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    document.getElementById(id === 'inicio' ? 'seccion-inicio' : 
                            id === 'listado' ? 'seccion-listado' : id).style.display = 'block';
    if(id === 'listado') cargarPeliculas();
    toggleMenu();
}

// GUARDAR PELÍCULA (URL DE IMAGEN)
document.getElementById('form-pelicula').onsubmit = (e) => {
    e.preventDefault();
    
// Dentro de document.getElementById('form-pelicula').onsubmit
    const nuevaPeli = {
        titulo: document.getElementById('titulo').value,
        nombreDirector: document.getElementById('nombreDirector').value,
        fotoDirector: document.getElementById('fotoDirector').value,
        nombreActor: document.getElementById('nombreActor').value,
        fotoActor: document.getElementById('fotoActor').value,
        nota: parseFloat(document.getElementById('nota').value),
        duracion: parseInt(document.getElementById('duracion').value) || 0, // <-- Añade esta línea
        fecha: new Date().toLocaleDateString()
    };

    const tx = db.transaction("peliculas", "readwrite");
    tx.objectStore("peliculas").add(nuevaPeli);
    tx.oncomplete = () => {
        alert("¡Película guardada!");
        document.getElementById('form-pelicula').reset();
        mostrarSeccion('listado');
    };
};

// CARGAR LISTADO
function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    lista.innerHTML = "";
    
    db.transaction("peliculas", "readonly").objectStore("peliculas").getAll().onsuccess = (e) => {
        e.target.result.forEach(peli => {
            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `
                <img src="${peli.fotoActor || 'https://via.placeholder.com/150'}" class="img-peli">
                <div style="padding:10px;">
                    <h4 style="margin:5px 0;">${peli.titulo}</h4>
                    <small style="color:red;">★ ${peli.nota}</small>
                </div>
            `;
            lista.appendChild(div);
        });
    };
}

// FUNCIONES DE COPIA DE SEGURIDAD (IMPORTAR/EXPORTAR)
function exportarDatos() {
    db.transaction("peliculas", "readonly").objectStore("peliculas").getAll().onsuccess = (e) => {
        const blob = new Blob([JSON.stringify(e.target.result)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cine_backup.json`;
        a.click();
    };
}

function importarDatos(input) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const pelis = JSON.parse(e.target.result);
        const tx = db.transaction("peliculas", "readwrite");
        const store = tx.objectStore("peliculas");
        pelis.forEach(p => store.put(p));
        tx.oncomplete = () => { alert("Datos cargados"); location.reload(); };
    };
    reader.readAsText(input.files[0]);
}

// ESTADÍSTICAS
function abrirEstadisticas() {
    mostrarSeccion('pantalla-estadisticas');
    db.transaction("peliculas", "readonly").objectStore("peliculas").getAll().onsuccess = (e) => {
        const pelis = e.target.result;
        
        // Cálculo de nota media
        const media = pelis.reduce((acc, p) => acc + p.nota, 0) / (pelis.length || 1);
        
        // Cálculo de tiempo total
        const minutosTotales = pelis.reduce((acc, p) => acc + (p.duracion || 0), 0);
        const horas = Math.floor(minutosTotales / 60);
        const minutosRestantes = minutosTotales % 60;

        document.getElementById('stats-content').innerHTML = `
            <div style="display: grid; gap: 15px;">
                <div style="background:#222; padding:20px; border-radius:12px; text-align:center;">
                    <h1 style="font-size:40px; margin:0; color:var(--main-red);">${pelis.length}</h1>
                    <p style="color:var(--text-gray); margin:5px 0;">Películas vistas</p>
                </div>

                <div style="background:#222; padding:20px; border-radius:12px; text-align:center;">
                    <h1 style="font-size:35px; margin:0; color:white;">${horas}h <span style="font-size:20px;">${minutosRestantes}min</span></h1>
                    <p style="color:var(--text-gray); margin:5px 0;">Tiempo total de cine</p>
                </div>

                <div style="background:#222; padding:20px; border-radius:12px; text-align:center;">
                    <h1 style="font-size:40px; margin:0; color:gold;">★ ${media.toFixed(1)}</h1>
                    <p style="color:var(--text-gray); margin:5px 0;">Nota Media</p>
                </div>
            </div>
        `;
    };
}

