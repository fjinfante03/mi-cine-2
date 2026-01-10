let db;
let currentTab = 'todas';
const request = indexedDB.open("CineTrackDB", 6);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = (e) => { db = e.target.result; cargarPeliculas(); };

function toggleMenu() {
    const m = document.getElementById("side-menu");
    m.style.width = m.style.width === "250px" ? "0" : "250px";
}

function mostrarSeccion(id) {
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    if (id === 'seccion-directores') generarPersonas('director');
    else if (id === 'seccion-actores') generarPersonas('actor');
    else if (id === 'pantalla-estadisticas') abrirEstadisticas();
    else {
        const target = id === 'inicio' ? 'seccion-inicio' : id === 'listado' ? 'seccion-listado' : id;
        document.getElementById(target).style.display = 'block';
    }
    if (id === 'listado') cargarPeliculas();
    toggleMenu();
}

function agregarCampoActor(nombre = "", foto = "") {
    const div = document.createElement('div');
    // Esta clase 'actor-card-form' es la que separará a los actores
    div.className = "actor-card-form"; 
    div.innerHTML = `
        <div class="grid-2">
            <div class="input-group">
                <input type="text" placeholder="Nombre Actor" class="nombre-actor" value="${nombre}">
            </div>
            <div class="input-group">
                <input type="text" placeholder="URL Foto Actor" class="foto-actor" value="${foto}">
            </div>
        </div>
        <button type="button" class="btn-eliminar-actor" onclick="this.parentElement.remove()">✕ Quitar actor</button>
    `;
    document.getElementById('contenedor-actores').appendChild(div);
}

function validarYGuardar(estado) {
    const id = document.getElementById('edit-id').value;
    const reparto = Array.from(document.querySelectorAll('.actor-input-row')).map(f => ({
        nombre: f.querySelector('.nombre-actor').value,
        foto: f.querySelector('.foto-actor').value
    })).filter(a => a.nombre);

    const peli = {
        titulo: document.getElementById('titulo').value,
        nombreDirector: document.getElementById('nombreDirector').value,
        fotoDirector: document.getElementById('fotoDirector').value,
        reparto: reparto,
        fotoPortada: document.getElementById('fotoPortada').value,
        nota: parseFloat(document.getElementById('nota').value) || 0,
        fechaVista: document.getElementById('fechaVista').value,
        vecesVista: parseInt(document.getElementById('vecesVista').value) || 1,
        duracion: parseInt(document.getElementById('duracion').value) || 0,
        genero: document.getElementById('genero').value,
        plataforma: document.getElementById('plataforma').value,
        estado: estado
    };

    const tx = db.transaction("peliculas", "readwrite");
    if (id) { peli.id = parseInt(id); tx.objectStore("peliculas").put(peli); } 
    else { tx.objectStore("peliculas").add(peli); }
    tx.oncomplete = () => location.reload();
}

function cambiarTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    cargarPeliculas();
}

function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    lista.innerHTML = "";
    
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        e.target.result.filter(p => {
            const mTab = currentTab === 'todas' || p.estado === currentTab;
            const mBusq = p.titulo.toLowerCase().includes(busqueda);
            return mTab && mBusq;
        }).forEach(p => {
            const esVista = p.estado === 'vista';
            const badgeNota = esVista ? `<div class="nota-badge">⭐ ${p.nota.toFixed(1)}</div>` : '';
            const badgeVeces = (esVista && p.vecesVista > 1) ? `<div class="veces-badge">VISTA ${p.vecesVista} VECES</div>` : '';
            
            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `
                <div style="position: relative;">
                    <img src="${p.fotoPortada || 'https://via.placeholder.com/150'}" class="img-peli" onclick="ampliar('${p.fotoPortada}')">
                    <div style="position: absolute; top: 8px; right: 8px; display: flex; flex-direction: column; align-items: flex-end;">
                        ${badgeNota}${badgeVeces}
                    </div>
                </div>
                <div style="padding:12px;">
                    <h4 style="margin:0; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.titulo}</h4>
                    <div style="font-size:10px; color:#888; margin-top:4px;">${esVista && p.fechaVista ? '📅 ' + new Date(p.fechaVista).toLocaleDateString() : ''}</div>
                    <div style="display:flex; justify-content:space-between; margin-top:10px;">
                        <button onclick="editar(${p.id})" style="background:none; border:none; color:cyan; font-size:18px;">✏️</button>
                        <button onclick="eliminar(${p.id})" style="background:none; border:none; color:red; font-size:18px;">🗑️</button>
                    </div>
                </div>`;
            lista.appendChild(div);
        });
    };
}

function generarPersonas(tipo) {
    const contenedor = document.getElementById(tipo === 'director' ? 'lista-directores' : 'lista-actores');
    contenedor.innerHTML = "";
    document.getElementById(tipo === 'director' ? 'seccion-directores' : 'seccion-actores').style.display = 'block';

    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        let mapa = {};
        e.target.result.forEach(p => {
            if (tipo === 'director' && p.nombreDirector) {
                if (!mapa[p.nombreDirector]) mapa[p.nombreDirector] = { foto: p.fotoDirector, pelis: [] };
                mapa[p.nombreDirector].pelis.push(p.fotoPortada);
            } else if (tipo === 'actor' && p.reparto) {
                p.reparto.forEach(a => {
                    if (!mapa[a.nombre]) mapa[a.nombre] = { foto: a.foto, pelis: [] };
                    mapa[a.nombre].pelis.push(p.fotoPortada);
                });
            }
        });
        for (let n in mapa) {
            const div = document.createElement('div');
            div.className = 'persona-card';
            div.innerHTML = `<div class="persona-header">
                <img src="${mapa[n].foto || 'https://via.placeholder.com/60'}" class="persona-img" onclick="ampliar('${mapa[n].foto}')">
                <h3 style="margin:0;">${n}</h3>
            </div>
            <div class="persona-pelis">${mapa[n].pelis.map(img => `<img src="${img}" class="mini-portada" onclick="ampliar('${img}')">`).join('')}</div>`;
            contenedor.appendChild(div);
        }
    };
}

function abrirEstadisticas() {
    document.getElementById('pantalla-estadisticas').style.display = 'block';
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const v = e.target.result.filter(x => x.estado === 'vista');
        const mins = v.reduce((a, b) => a + ((b.duracion || 0) * (b.vecesVista || 1)), 0);
        const nota = v.reduce((a, b) => a + (b.nota || 0), 0) / (v.length || 1);
        document.getElementById('stats-content').innerHTML = `
            <div class="persona-card" style="text-align:center;">
                <h1 style="color:var(--main-red); font-size:40px; margin:0;">${v.length}</h1>
                <p>Películas Vistas</p>
                <h2>${Math.floor(mins/60)}h ${mins%60}min</h2>
                <p>Tiempo total invertido</p>
            </div>
            <div class="persona-card">
                <p>⭐ Nota Media: <b>${nota.toFixed(1)}</b></p>
            </div>`;
    };
}

function editar(id) {
    db.transaction("peliculas").objectStore("peliculas").get(id).onsuccess = (e) => {
        const p = e.target.result;
        document.getElementById('edit-id').value = p.id;
        document.getElementById('titulo').value = p.titulo;
        document.getElementById('nombreDirector').value = p.nombreDirector;
        document.getElementById('fotoDirector').value = p.fotoDirector;
        document.getElementById('fotoPortada').value = p.fotoPortada;
        document.getElementById('nota').value = p.nota;
        document.getElementById('fechaVista').value = p.fechaVista || "";
        document.getElementById('vecesVista').value = p.vecesVista || 1;
        document.getElementById('duracion').value = p.duracion;
        document.getElementById('genero').value = p.genero;
        document.getElementById('plataforma').value = p.plataforma;
        document.getElementById('contenedor-actores').innerHTML = "";
        if(p.reparto) p.reparto.forEach(a => agregarCampoActor(a.nombre, a.foto));
        mostrarSeccion('nueva-peli');
    };
}

function eliminar(id) { if(confirm("¿Borrar?")) db.transaction("peliculas", "readwrite").objectStore("peliculas").delete(id).onsuccess = () => location.reload(); }
function ampliar(s) { if(s) { document.getElementById('modal-img').style.display='flex'; document.getElementById('img-ampliada').src=s; } }
function exportarDatos() {
    db.transaction("peliculas", "readonly").objectStore("peliculas").getAll().onsuccess = (e) => {
        const b = new Blob([JSON.stringify(e.target.result)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = `Cine_Backup.json`; a.click();
    };
}
function importarDatos(i) {
    const r = new FileReader();
    r.onload = (e) => {
        const ps = JSON.parse(e.target.result);
        const tx = db.transaction("peliculas", "readwrite");
        ps.forEach(p => tx.objectStore("peliculas").put(p));
        tx.oncomplete = () => location.reload();
    };
    r.readAsText(i.files[0]);
}

// Función especial para ir al listado con un filtro ya aplicado
function irAListadoEspecial(estado) {
    // 1. Cambiamos la pestaña interna
    currentTab = estado;
    
    // 2. Mostramos la sección del listado
    mostrarSeccion('listado');
    
    // 3. Actualizamos visualmente los botones de las pestañas (tabs)
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + estado).classList.add('active');
    
    // 4. Forzamos la recarga de las películas con el nuevo filtro
    cargarPeliculas();
}



