let db;
let currentTab = 'todas';
let guardando = false;
let chartGen, chartPais;

// Inicializar DB
const request = indexedDB.open("CineTrackDB", 15);
request.onsuccess = (e) => { db = e.target.result; cargarPeliculas(); };
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

function toggleMenu() { document.getElementById("side-menu").classList.toggle("active"); }

function mostrarSeccion(id) {
    toggleMenu();
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    
    // Corregir IDs de secciones
    let targetId = id;
    if (id === 'inicio') targetId = 'seccion-inicio';
    if (id === 'listado') targetId = 'seccion-listado';

    const el = document.getElementById(targetId);
    if (el) el.style.display = 'block';

    document.getElementById('contenedor-busqueda').style.display = 
        ['seccion-listado', 'seccion-directores', 'seccion-actores'].includes(targetId) ? 'block' : 'none';

    if (id === 'seccion-directores') generarPersonas('director');
    if (id === 'seccion-actores') generarPersonas('actor');
    if (id === 'pantalla-estadisticas') abrirEstadisticas();
    if (id === 'listado') cargarPeliculas();
    window.scrollTo(0,0);
}

function validarYGuardar(estado) {
    if (guardando) return;
    const titulo = document.getElementById('titulo').value.trim();
    if (!titulo) return alert("Título obligatorio");

    guardando = true;
    const idInput = document.getElementById('edit-id');

    const peli = {
        titulo,
        nombreDirector: document.getElementById('nombreDirector').value,
        fotoDirector: document.getElementById('fotoDirector').value,
        reparto: Array.from(document.querySelectorAll('.actor-card-form')).map(f => ({
            nombre: f.querySelector('.nombre-actor').value,
            foto: f.querySelector('.foto-actor').value
        })).filter(a => a.nombre),
        fotoPortada: document.getElementById('fotoPortada').value,
        nota: parseFloat(document.getElementById('nota').value) || 0,
        duracion: parseInt(document.getElementById('duracion').value) || 0,
        genero: document.getElementById('genero').value,
        plataforma: document.getElementById('plataforma').value,
        anio: parseInt(document.getElementById('anio').value) || 0,
        estado: estado
    };

    const tx = db.transaction("peliculas", "readwrite");
    const store = tx.objectStore("peliculas");

    if (idInput.value) {
        peli.id = parseInt(idInput.value);
        store.put(peli);
    } else {
        store.add(peli);
    }

    tx.oncomplete = () => {
        document.getElementById('form-pelicula').reset();
        document.getElementById('contenedor-actores').innerHTML = "";
        idInput.value = "";
        guardando = false;
        irAListadoEspecial(estado);
    };
}

function cargarPeliculas(filtro = "") {
    const lista = document.getElementById('lista-peliculas');
    if (!lista) return;
    lista.innerHTML = ""; // LIMPIEZA CLAVE

    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        let pelis = e.target.result.filter(p => currentTab === 'todas' || p.estado === currentTab);
        
        if (filtro) {
            pelis = pelis.filter(p => p.titulo.toLowerCase().includes(filtro.toLowerCase()));
        }

        pelis.forEach(p => {
            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `
                <img src="${p.fotoPortada || 'https://via.placeholder.com/150'}" class="img-peli" onclick="ampliar('${p.fotoPortada}')">
                <div style="padding:10px;">
                    <h4 style="margin:0;">${p.titulo}</h4>
                    <div style="display:flex; justify-content:space-between; margin-top:10px;">
                        <button onclick="editar(${p.id})">✏️</button>
                        <button onclick="eliminar(${p.id})">🗑️</button>
                    </div>
                </div>`;
            lista.appendChild(div);
        });
    };
}

function eliminar(id) {
    if (confirm("¿Eliminar?")) {
        db.transaction("peliculas", "readwrite").objectStore("peliculas").delete(id).onsuccess = () => cargarPeliculas();
    }
}

function cambiarTab(t) {
    currentTab = t;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + t).classList.add('active');
    cargarPeliculas();
}

function irAListadoEspecial(e) {
    currentTab = e;
    mostrarSeccion('listado');
    cambiarTab(e);
}

function editar(id) {
    db.transaction("peliculas").objectStore("peliculas").get(id).onsuccess = (e) => {
        const p = e.target.result;
        document.getElementById('edit-id').value = p.id;
        document.getElementById('titulo').value = p.titulo;
        document.getElementById('nombreDirector').value = p.nombreDirector || "";
        document.getElementById('fotoPortada').value = p.fotoPortada || "";
        mostrarSeccion('nueva-peli');
    };
}

function ampliar(src) {
    document.getElementById('modal-img').style.display = 'flex';
    document.getElementById('img-ampliada').src = src;
}

function agregarCampoActor(n="", f="") {
    const div = document.createElement('div');
    div.className = "actor-card-form";
    div.innerHTML = `
        <input type="text" placeholder="Actor" class="nombre-actor" value="${n}">
        <input type="text" placeholder="Foto URL" class="foto-actor" value="${f}">
        <button type="button" onclick="this.parentElement.remove()">✕</button>`;
    document.getElementById('contenedor-actores').appendChild(div);
}
// Las funciones de gráficas se mantienen igual pero asegúrate de llamarlas solo cuando sea necesario.




















