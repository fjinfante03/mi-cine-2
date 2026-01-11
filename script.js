let db;
let currentTab = 'todas';
let miGrafico = null;

// Conexión a Base de Datos
const request = indexedDB.open("CineTrackDB", 9);

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

// Menú y Navegación
function toggleMenu() {
    const m = document.getElementById("side-menu");
    m.style.width = m.style.width === "250px" ? "0" : "250px";
}

function mostrarSeccion(id) {
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    const target = id === 'inicio' ? 'seccion-inicio' : id === 'listado' ? 'seccion-listado' : id;
    const element = document.getElementById(target);
    if (element) element.style.display = 'block';

    if (id === 'seccion-directores') generarPersonas('director');
    if (id === 'seccion-actores') generarPersonas('actor');
    if (id === 'pantalla-estadisticas') abrirEstadisticas();
    if (id === 'listado') cargarPeliculas();
    
    const m = document.getElementById("side-menu");
    if(m.style.width === "250px") toggleMenu();
}

function irAListadoEspecial(estado) {
    currentTab = estado;
    mostrarSeccion('listado');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tab-' + estado);
    if(btn) btn.classList.add('active');
    cargarPeliculas();
}

// Gestión de Formulario
function agregarCampoActor(nombre = "", foto = "") {
    const div = document.createElement('div');
    div.className = "actor-card-form";
    div.innerHTML = `
        <div class="grid-2">
            <input type="text" placeholder="Nombre Actor" class="nombre-actor" value="${nombre}">
            <input type="text" placeholder="URL Foto" class="foto-actor" value="${foto}">
        </div>
        <button type="button" style="background:none; border:none; color:var(--main-red); font-size:10px; width:100%; text-align:right; margin-top:5px; cursor:pointer;" onclick="this.parentElement.remove()">✕ Quitar Actor</button>
    `;
    document.getElementById('contenedor-actores').appendChild(div);
}

function validarYGuardar(estado) {
    const id = document.getElementById('edit-id').value;
    const reparto = Array.from(document.querySelectorAll('.actor-card-form')).map(f => ({
        nombre: f.querySelector('.nombre-actor').value,
        foto: f.querySelector('.foto-actor').value
    })).filter(a => a.nombre.trim() !== "");

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
    const store = tx.objectStore("peliculas");
    if (id) { peli.id = parseInt(id); store.put(peli); } 
    else { store.add(peli); }
    tx.oncomplete = () => window.location.reload();
}

// Carga de Biblioteca
function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    lista.innerHTML = ""; 

    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const pelis = e.target.result;
        pelis.filter(p => (currentTab === 'todas' || p.estado === currentTab) && p.titulo.toLowerCase().includes(busqueda))
        .forEach(p => {
            const esV = p.estado === 'vista';
            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `
                <div style="position:relative;">
                    <img src="${p.fotoPortada || 'https://via.placeholder.com/150'}" class="img-peli" onclick="ampliar('${p.fotoPortada}')">
                    <div style="position:absolute; top:8px; right:8px; display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                        ${esV ? `<div class="nota-badge">⭐ ${p.nota.toFixed(1)}</div>` : ''}
                        ${esV && p.vecesVista > 1 ? `<div class="veces-badge">${p.vecesVista} VECES</div>` : ''}
                    </div>
                </div>
                <div style="padding:10px;">
                    <h4 style="margin:0; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.titulo}</h4>
                    <div style="display:flex; justify-content:space-between; margin-top:8px;">
                        <button onclick="editar(${p.id})" style="background:none; border:none; color:cyan; cursor:pointer;">✏️</button>
                        <button onclick="eliminar(${p.id})" style="background:none; border:none; color:var(--main-red); cursor:pointer;">🗑️</button>
                    </div>
                </div>`;
            lista.appendChild(div);
        });
    };
}

// Estadísticas con Gráfico
function abrirEstadisticas() {
    document.getElementById('pantalla-estadisticas').style.display = 'block';
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const vistas = e.target.result.filter(x => x.estado === 'vista');
        const totalMins = vistas.reduce((a, b) => a + ((b.duracion || 0) * (b.vecesVista || 1)), 0);
        
        let genStats = {};
        vistas.forEach(p => {
            const g = p.genero || "Sin Género";
            if (!genStats[g]) genStats[g] = { count: 0, time: 0 };
            genStats[g].count++;
            genStats[g].time += (p.duracion || 0) * (p.vecesVista || 1);
        });

        document.getElementById('stats-content').innerHTML = `
            <div class="persona-card" style="text-align:center;">
                <h1 style="color:var(--main-red); margin:0; font-size:40px;">${vistas.length}</h1>
                <p style="color:#888;">Películas Vistas</p>
                <h2>${Math.floor(totalMins/60)}h ${totalMins%60}min</h2>
                <p style="color:#888;">Tiempo Total</p>
            </div>`;

        setTimeout(() => {
            if (typeof Chart === 'undefined') return;
            const ctx = document.getElementById('graficoGeneros').getContext('2d');
            if (miGrafico) miGrafico.destroy();
            
            const labelsGeneros = Object.keys(genStats);
            const datosHoras = Object.values(genStats).map(g => (g.time / 60).toFixed(1));

            miGrafico = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: labelsGeneros,
                    datasets: [{
                        data: datosHoras,
                        backgroundColor: ['#e50914', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#34495e', '#d35400', '#c0392b'],
                        borderColor: '#141414',
                        borderWidth: 2
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { position: 'bottom', labels: { color: 'white', font: { size: 10 } } },
                        tooltip: { callbacks: { label: (c) => ` ${c.label}: ${c.raw} horas` } }
                    } 
                }
            });
        }, 300);
    };
}

// Ranking de Personas (Actores/Directores)
function generarPersonas(tipo) {
    const contenedor = document.getElementById(tipo === 'director' ? 'lista-directores' : 'lista-actores');
    contenedor.innerHTML = "";

    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        let mapa = {};
        e.target.result.forEach(p => {
            if (tipo === 'director' && p.nombreDirector) {
                if (!mapa[p.nombreDirector]) mapa[p.nombreDirector] = { nombre: p.nombreDirector, foto: p.fotoDirector, pelis: [] };
                mapa[p.nombreDirector].pelis.push(p);
            } else if (tipo === 'actor' && p.reparto) {
                p.reparto.forEach(a => {
                    if (!mapa[a.nombre]) mapa[a.nombre] = { nombre: a.nombre, foto: a.foto, pelis: [] };
                    mapa[a.nombre].pelis.push(p);
                });
            }
        });

        let listaOrdenada = Object.values(mapa).sort((a, b) => b.pelis.length - a.pelis.length);

        listaOrdenada.forEach(persona => {
            persona.pelis.sort((a, b) => (b.nota || 0) - (a.nota || 0));
            const div = document.createElement('div');
            div.className = 'persona-card';
            div.innerHTML = `
                <div class="persona-header">
                    <div style="position:relative;">
                        <img src="${persona.foto || 'https://via.placeholder.com/60'}" class="persona-img">
                        <span style="position:absolute; top:-5px; right:-5px; background:var(--main-red); color:white; border-radius:50%; width:22px; height:22px; font-size:11px; display:flex; align-items:center; justify-content:center; border:2px solid black; font-weight:bold;">${persona.pelis.length}</span>
                    </div>
                    <div>
                        <h3 style="margin:0; font-size:16px;">${persona.nombre}</h3>
                        <p style="margin:0; font-size:11px; color:#888;">${persona.pelis.length} películas</p>
                    </div>
                </div>
                <div class="persona-pelis">
                    ${persona.pelis.map(p => `
                        <div style="position:relative; flex-shrink:0;">
                            <img src="${p.fotoPortada || 'https://via.placeholder.com/60'}" class="mini-portada" onclick="ampliar('${p.fotoPortada}')">
                            <span style="position:absolute; bottom:4px; right:4px; background:rgba(0,0,0,0.8); color:#ffc107; font-size:9px; padding:2px 4px; border-radius:4px; font-weight:bold;">⭐${p.nota}</span>
                        </div>
                    `).join('')}
                </div>`;
            contenedor.appendChild(div);
        });
    };
}

// Auxiliares
function editar(id) {
    db.transaction("peliculas").objectStore("peliculas").get(id).onsuccess = (e) => {
        const p = e.target.result;
        document.getElementById('edit-id').value = p.id;
        document.getElementById('titulo').value = p.titulo;
        document.getElementById('nombreDirector').value = p.nombreDirector || "";
        document.getElementById('fotoDirector').value = p.fotoDirector || "";
        document.getElementById('fotoPortada').value = p.fotoPortada || "";
        document.getElementById('nota').value = p.nota;
        document.getElementById('fechaVista').value = p.fechaVista || "";
        document.getElementById('vecesVista').value = p.vecesVista || 1;
        document.getElementById('duracion').value = p.duracion || 0;
        document.getElementById('genero').value = p.genero;
        document.getElementById('plataforma').value = p.plataforma;
        document.getElementById('contenedor-actores').innerHTML = "";
        if(p.reparto) p.reparto.forEach(a => agregarCampoActor(a.nombre, a.foto));
        mostrarSeccion('nueva-peli');
    };
}

function eliminar(id) { if(confirm("¿Eliminar película definitivamente?")) db.transaction("peliculas", "readwrite").objectStore("peliculas").delete(id).onsuccess = () => window.location.reload(); }
function ampliar(s) { if(s) { document.getElementById('modal-img').style.display='flex'; document.getElementById('img-ampliada').src=s; } }

function cambiarTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    cargarPeliculas();
}

// Backup
function exportarDatos() {
    db.transaction("peliculas", "readonly").objectStore("peliculas").getAll().onsuccess = (e) => {
        const blob = new Blob([JSON.stringify(e.target.result)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `CineBackup_${new Date().toLocaleDateString()}.json`; a.click();
    };
}
function importarDatos(input) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const data = JSON.parse(e.target.result);
        const tx = db.transaction("peliculas", "readwrite");
        data.forEach(p => tx.objectStore("peliculas").put(p));
        tx.oncomplete = () => window.location.reload();
    };
    reader.readAsText(input.files[0]);
}




