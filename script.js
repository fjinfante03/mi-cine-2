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
    if (!menu) return;
    menu.style.width = menu.style.width === "250px" ? "0" : "250px";
}

function mostrarSeccion(id) {
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    const target = id === 'inicio' ? 'seccion-inicio' : id === 'listado' ? 'seccion-listado' : id;
    const section = document.getElementById(target);
    if (section) section.style.display = 'block';
    if (id === 'listado') cargarPeliculas();
    toggleMenu();
}

// GUARDAR PELÍCULA (MANEJA VISTAS Y PENDIENTES)
function validarYGuardar(estado) {
    const titulo = document.getElementById('titulo').value;
    
    if (!titulo) {
        alert("Por favor, introduce al menos el título de la película");
        return;
    }

    const nuevaPeli = {
        titulo: titulo,
        nombreDirector: document.getElementById('nombreDirector').value,
        fotoDirector: document.getElementById('fotoDirector').value,
        nombreActor: document.getElementById('nombreActor').value,
        fotoActor: document.getElementById('fotoActor').value,
        nota: parseFloat(document.getElementById('nota').value) || 0,
        duracion: parseInt(document.getElementById('duracion').value) || 0,
        estado: estado, // 'vista' o 'pendiente'
        fecha: new Date().toLocaleDateString()
    };

    const tx = db.transaction("peliculas", "readwrite");
    const store = tx.objectStore("peliculas");
    
    store.add(nuevaPeli);
    
    tx.oncomplete = () => {
        alert(estado === 'vista' ? "✅ ¡Añadida a tus películas vistas!" : "⏳ ¡Añadida a tu lista de pendientes!");
        document.getElementById('form-pelicula').reset();
        mostrarSeccion('listado');
    };

    tx.onerror = () => {
        alert("Hubo un error al guardar la película.");
    };
}

// CARGAR LISTADO EN BIBLIOTECA
function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    if (!lista) return;
    lista.innerHTML = "";
    
    db.transaction("peliculas", "readonly").objectStore("peliculas").getAll().onsuccess = (e) => {
        const peliculas = e.target.result;
        
        // Ordenamos para que las pendientes salgan con una marca visual
        peliculas.forEach(peli => {
            const div = document.createElement('div');
            div.className = 'card-peli';
            const esPendiente = peli.estado === 'pendiente';
            
            div.innerHTML = `
                <div style="position: relative;">
                    <img src="${peli.fotoActor || 'https://via.placeholder.com/150'}" class="img-peli" style="${esPendiente ? 'filter: grayscale(0.8);' : ''}">
                    ${esPendiente ? '<span style="position:absolute; top:5px; right:5px; background: #ffc107; color:black; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">PENDIENTE</span>' : ''}
                </div>
                <div style="padding:10px;">
                    <h4 style="margin:5px 0; font-size: 14px;">${peli.titulo}</h4>
                    ${!esPendiente ? `<small style="color: gold;">★ ${peli.nota}</small>` : '<small style="color: #bbb;">⏳ Por ver</small>'}
                </div>
            `;
            lista.appendChild(div);
        });
    };
}

// ESTADÍSTICAS (CONVERSIÓN DE MINUTOS A HORAS)
function abrirEstadisticas() {
    mostrarSeccion('pantalla-estadisticas');
    db.transaction("peliculas", "readonly").objectStore("peliculas").getAll().onsuccess = (e) => {
        const pelis = e.target.result;
        
        const vistas = pelis.filter(p => p.estado === 'vista');
        const pendientes = pelis.filter(p => p.estado === 'pendiente');
        
        // Cálculos
        const media = vistas.reduce((acc, p) => acc + (p.nota || 0), 0) / (vistas.length || 1);
        const minTotales = vistas.reduce((acc, p) => acc + (p.duracion || 0), 0);
        const horas = Math.floor(minTotales / 60);
        const mins = minTotales % 60;

        const statsContent = document.getElementById('stats-content');
        if (statsContent) {
            statsContent.innerHTML = `
                <div style="display: grid; gap: 15px;">
                    <div style="background:#1a1a1a; padding:20px; border-radius:15px; border-left: 5px solid #28a745;">
                        <h1 style="margin:0; color:#28a745; font-size:35px;">${vistas.length}</h1>
                        <p style="margin:0; color:#aaa;">Películas Vistas</p>
                        <p style="margin:5px 0 0 0; font-weight:bold;">🕒 ${horas}h ${mins}min de cine</p>
                    </div>

                    <div style="background:#1a1a1a; padding:20px; border-radius:15px; border-left: 5px solid #ffc107;">
                        <h1 style="margin:0; color:#ffc107; font-size:35px;">${pendientes.length}</h1>
                        <p style="margin:0; color:#aaa;">Películas Pendientes</p>
                    </div>

                    <div style="background:#1a1a1a; padding:20px; border-radius:15px; text-align:center;">
                        <h1 style="margin:0; color:gold; font-size:35px;">★ ${media.toFixed(1)}</h1>
                        <p style="margin:0; color:#aaa;">Nota Media (Vistas)</p>
                    </div>
                </div>
            `;
        }
    };
}

// COPIAS DE SEGURIDAD
function exportarDatos() {
    db.transaction("peliculas", "readonly").objectStore("peliculas").getAll().onsuccess = (e) => {
        const data = JSON.stringify(e.target.result);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `mi_cine_respaldo_${new Date().getDate()}.json`;
        a.click();
    };
}

function importarDatos(input) {
    if (!input.files[0]) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const pelis = JSON.parse(e.target.result);
            const tx = db.transaction("peliculas", "readwrite");
            const store = tx.objectStore("peliculas");
            pelis.forEach(p => store.put(p));
            tx.oncomplete = () => {
                alert("¡Datos importados con éxito!");
                location.reload();
            };
        } catch (err) {
            alert("Error: El archivo no es válido");
        }
    };
    reader.readAsText(input.files[0]);
}

