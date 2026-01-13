let db;
let currentTab = 'todas';
let guardando = false;

// 1. Conexión limpia a la DB
const request = indexedDB.open("CineTrackDB", 15);
request.onsuccess = (e) => { 
    db = e.target.result; 
    console.log("DB Conectada");
    cargarPeliculas(); 
};
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

// 2. Navegación corregida
function mostrarSeccion(id) {
    const sideMenu = document.getElementById("side-menu");
    if(sideMenu) sideMenu.classList.remove("active");

    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    
    let targetId = id;
    if (id === 'inicio') targetId = 'seccion-inicio';
    if (id === 'listado') targetId = 'seccion-listado';

    const el = document.getElementById(targetId);
    if (el) el.style.display = 'block';

    const buscadorUI = document.getElementById('contenedor-busqueda');
    if(buscadorUI) {
        buscadorUI.style.display = ['seccion-listado', 'seccion-directores', 'seccion-actores'].includes(targetId) ? 'block' : 'none';
    }

    if (targetId === 'seccion-listado') cargarPeliculas();
    if (targetId === 'pantalla-estadisticas') abrirEstadisticas();
    
    window.scrollTo(0,0);
}

// 3. GUARDADO ANTI-DUPLICADOS
function validarYGuardar(estado) {
    if (guardando) return; // Bloqueo de seguridad

    const tituloInput = document.getElementById('titulo');
    const titulo = tituloInput.value.trim();
    if (!titulo) return alert("Título obligatorio");

    guardando = true; // Activamos bloqueo
    const idInput = document.getElementById('edit-id');

    const peli = {
        titulo: titulo,
        nombreDirector: document.getElementById('nombreDirector').value,
        fotoDirector: document.getElementById('fotoDirector').value,
        reparto: Array.from(document.querySelectorAll('.actor-card-form')).map(f => ({
            nombre: f.querySelector('.nombre-actor').value,
            foto: f.querySelector('.foto-actor').value
        })).filter(a => a.nombre),
        fotoPortada: document.getElementById('fotoPortada').value || 'https://via.placeholder.com/150',
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
        // Limpiar formulario inmediatamente
        document.getElementById('form-pelicula').reset();
        document.getElementById('contenedor-actores').innerHTML = "";
        idInput.value = "";
        
        // Ir a la pestaña y desbloquear
        currentTab = estado;
        guardando = false; 
        
        // Solo llamamos a mostrarSeccion, que a su vez llama a cargarPeliculas
        mostrarSeccion('listado');
        actualizarBotonesTabs(estado);
    };
}

// 4. CARGA DE PELÍCULAS (Con limpieza reforzada)
function cargarPeliculas(filtro = "") {
    const lista = document.getElementById('lista-peliculas');
    if (!lista) return;
    
    // Limpieza total del contenedor antes de empezar
    lista.innerHTML = ""; 

    const tx = db.transaction("peliculas", "readonly");
    const store = tx.objectStore("peliculas");

    store.getAll().onsuccess = (e) => {
        let pelis = e.target.result;
        
        // 1. Filtro de pestañas
        if (currentTab !== 'todas') {
            pelis = pelis.filter(p => p.estado === currentTab);
        }

        // 2. FILTRO ANTI-DUPLICADOS (El Rescate)
        // Creamos una lista limpia donde no se repiten títulos
        const titulosVistos = new Set();
        const pelisUnicas = [];

        pelis.forEach(p => {
            const tituloNormalizado = p.titulo.trim().toLowerCase();
            if (!titulosVistos.has(tituloNormalizado)) {
                titulosVistos.add(tituloNormalizado);
                pelisUnicas.push(p);
            }
        });

        // 3. Renderizamos solo las únicas
        pelisUnicas.forEach(p => {
            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `
                <div style="position:relative;">
                    <img src="${p.fotoPortada || 'https://via.placeholder.com/150'}" class="img-peli" onclick="ampliar('${p.fotoPortada}')">
                    ${p.estado === 'vista' ? `<div class="nota-badge">⭐ ${p.nota}</div>` : ''}
                </div>
                <div style="padding:10px;">
                    <h4 style="margin:0; font-size:14px;">${p.titulo}</h4>
                    <div style="display:flex; justify-content:space-between; margin-top:10px;">
                        <button onclick="editar(${p.id})" style="background:none; border:none; color:cyan; font-size:18px;">✏️</button>
                        <button onclick="eliminar(${p.id})" style="background:none; border:none; color:red; font-size:18px;">🗑️</button>
                    </div>
                </div>`;
            lista.appendChild(div);
        });

        if (pelisUnicas.length === 0) {
            lista.innerHTML = `<p style="grid-column:1/-1; text-align:center; color:#555;">No hay películas aquí.</p>`;
        }
    };
}

// Funciones auxiliares
function eliminar(id) {
    if (!confirm("¿Eliminar película?")) return;
    db.transaction("peliculas", "readwrite").objectStore("peliculas").delete(id).onsuccess = () => cargarPeliculas();
}

function cambiarTab(t) {
    currentTab = t;
    actualizarBotonesTabs(t);
    cargarPeliculas();
}

function actualizarBotonesTabs(t) {
    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.remove('active');
        if(b.id === 'tab-' + t) b.classList.add('active');
    });
}

function toggleMenu() { document.getElementById("side-menu").classList.toggle("active"); }
function irAListadoEspecial(e) { currentTab = e; mostrarSeccion('listado'); actualizarBotonesTabs(e); }
function ejecutarBusqueda() { cargarPeliculas(document.getElementById('buscador').value); }
function agregarCampoActor() {
    const div = document.createElement('div');
    div.className = "actor-card-form";
    div.innerHTML = `<input type="text" class="nombre-actor" placeholder="Actor"><input type="text" class="foto-actor" placeholder="URL Foto"><button













