let db;
let currentTab = 'todas';
let chartGen, chartPais, chartDec;

// Conexión a IndexedDB
const request = indexedDB.open("CineTrackDB", 10);

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

// Función para abrir/cerrar menú SIN BLOQUEAR CLICS
function toggleMenu() {
    const menu = document.getElementById("side-menu");
    // Esto añade o quita la clase .active que definimos en el CSS
    menu.classList.toggle("active");
}

function mostrarSeccion(id) {
    // 1. Cerramos el menú siempre antes de hacer nada
    document.getElementById("side-menu").classList.remove("active");

    // 2. Ocultamos todas las secciones
    document.querySelectorAll('.container').forEach(s => {
        s.style.display = 'none';
    });

    // 3. Mostramos la sección elegida
    const target = id === 'inicio' ? 'seccion-inicio' : id === 'listado' ? 'seccion-listado' : id;
    const element = document.getElementById(target);
    if (element) {
        element.style.display = 'block';
    }

    // 4. Cargamos los datos correspondientes
    if (id === 'seccion-directores') generarPersonas('director');
    if (id === 'seccion-actores') generarPersonas('actor');
    if (id === 'pantalla-estadisticas') abrirEstadisticas();
    if (id === 'listado') cargarPeliculas();
}

function irAListadoEspecial(estado) {
    currentTab = estado;
    mostrarSeccion('listado');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('tab-' + estado);
    if(btn) btn.classList.add('active');
    cargarPeliculas();
}

// Guardado y Validación
function agregarCampoActor(nombre = "", foto = "") {
    const div = document.createElement('div');
    div.className = "actor-card-form";
    div.innerHTML = `
        <div class="grid-2">
            <input type="text" placeholder="Nombre Actor" class="nombre-actor" value="${nombre}">
            <input type="text" placeholder="URL Foto" class="foto-actor" value="${foto}">
        </div>
        <button type="button" style="background:none; border:none; color:red; font-size:10px; width:100%; text-align:right; margin-top:5px; cursor:pointer;" onclick="this.parentElement.remove()">✕ Quitar</button>
    `;
    document.getElementById('contenedor-actores').appendChild(div);
}

function validarYGuardar(estado) {
    const id = document.getElementById('edit-id').value;
    const peli = {
        titulo: document.getElementById('titulo').value,
        nombreDirector: document.getElementById('nombreDirector').value,
        fotoDirector: document.getElementById('fotoDirector').value,
        reparto: Array.from(document.querySelectorAll('.actor-card-form')).map(f => ({
            nombre: f.querySelector('.nombre-actor').value,
            foto: f.querySelector('.foto-actor').value
        })).filter(a => a.nombre),
        fotoPortada: document.getElementById('fotoPortada').value,
        nota: parseFloat(document.getElementById('nota').value) || 0,
        fechaVista: document.getElementById('fechaVista').value,
        vecesVista: parseInt(document.getElementById('vecesVista').value) || 1,
        duracion: parseInt(document.getElementById('duracion').value) || 0,
        genero: document.getElementById('genero').value,
        plataforma: document.getElementById('plataforma').value,
        anio: parseInt(document.getElementById('anio').value) || 0,
        nacionalidad: document.getElementById('nacionalidad').value || "Desconocida",
        estado: estado
    };

    const tx = db.transaction("peliculas", "readwrite");
    const store = tx.objectStore("peliculas");
    if (id) { peli.id = parseInt(id); store.put(peli); } 
    else { store.add(peli); }
    tx.oncomplete = () => window.location.reload();
}

// Cargar Películas con Ordenación
function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    const orden = document.getElementById('ordenar-por') ? document.getElementById('ordenar-por').value : 'reciente';
    
    lista.innerHTML = ""; 

    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        let pelis = e.target.result;
        
        // Filtro por estado y búsqueda
        pelis = pelis.filter(p => (currentTab === 'todas' || p.estado === currentTab) && p.titulo.toLowerCase().includes(busqueda));

        // Ordenación
        pelis.sort((a, b) => {
            if (orden === 'alfabetico') return a.titulo.localeCompare(b.titulo);
            if (orden === 'nota-top') return (b.nota || 0) - (a.nota || 0);
            return (b.id || 0) - (a.id || 0);
        });

        lista.innerHTML = ""; 
        pelis.forEach(p => {
            const div = document.createElement('div');
            div.className = 'card-peli';

            // Lógica para mostrar la plataforma solo en pendientes
            const infoPlataforma = (p.estado === 'pendiente') 
                ? `<div class="plataforma-tag">📺 ${p.plataforma}</div>` 
                : '';

            div.innerHTML = `
                <div style="position:relative;">
                    <img src="${p.fotoPortada || 'https://via.placeholder.com/150'}" class="img-peli" onclick="ampliar('${p.fotoPortada}')">
                    ${p.estado === 'vista' ? `<div class="nota-badge">⭐ ${p.nota}</div>` : ''}
                </div>
                <div style="padding:10px;">
                    <h4 style="margin:0; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.titulo}</h4>
                    <p style="font-size:10px; color:#888; margin-top:4px;">${p.anio || '---'} | ${p.nacionalidad || '---'}</p>
                    
                    ${infoPlataforma}

                    <div style="display:flex; justify-content:space-between; margin-top:8px;">
                        <button onclick="editar(${p.id})" style="background:none; border:none; color:cyan; cursor:pointer;">✏️</button>
                        <button onclick="eliminar(${p.id})" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
                    </div>
                </div>`;
            lista.appendChild(div);
        });
    };
}

// Estadísticas con 3 gráficos
function abrirEstadisticas() {
    document.getElementById('pantalla-estadisticas').style.display = 'block';
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const vistas = e.target.result.filter(x => x.estado === 'vista');
        const mins = vistas.reduce((a, b) => a + ((b.duracion || 0) * (b.vecesVista || 1)), 0);
        
        let genStats = {}, paisStats = {}, decStats = {};
        vistas.forEach(p => {
            const g = p.genero || "Otros";
            genStats[g] = (genStats[g] || 0) + ((p.duracion || 0) * (p.vecesVista || 1));
            
            const pais = p.nacionalidad || "Desconocida";
            paisStats[pais] = (paisStats[pais] || 0) + 1;

            if(p.anio > 0) {
                const dec = Math.floor(p.anio / 10) * 10 + "s";
                decStats[dec] = (decStats[dec] || 0) + 1;
            }
        });

        document.getElementById('stats-content').innerHTML = `
            <div class="persona-card" style="text-align:center;">
                <h1 style="color:var(--main-red); margin:0;">${vistas.length}</h1>
                <p>Películas Vistas</p>
                <h2>${Math.floor(mins/60)}h ${mins%60}min</h2>
            </div>`;

        setTimeout(() => {
            if(chartGen) chartGen.destroy();
            chartGen = new Chart(document.getElementById('graficoGeneros'), {
                type: 'doughnut',
                data: { labels: Object.keys(genStats), datasets: [{ data: Object.values(genStats).map(m => (m/60).toFixed(1)), backgroundColor: ['#e50914', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6'] }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'white', font: { size: 10 } } } } }
            });

            if(chartPais) chartPais.destroy();
            chartPais = new Chart(document.getElementById('graficoPaises'), {
                type: 'pie',
                data: { labels: Object.keys(paisStats), datasets: [{ data: Object.values(paisStats), backgroundColor: ['#1abc9c', '#e67e22', '#34495e', '#27ae60', '#d35400'] }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'white', font: { size: 10 } } } } }
            });

            if(chartDec) chartDec.destroy();
            const sortedDecs = Object.keys(decStats).sort();
            chartDec = new Chart(document.getElementById('graficoDecadas'), {
                type: 'bar',
                data: { labels: sortedDecs, datasets: [{ label: 'Pelis', data: sortedDecs.map(k => decStats[k]), backgroundColor: '#e50914' }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: 'white' } }, y: { ticks: { color: 'white' } } } }
            });
        }, 300);
    };
}

// Ranking Personas
function generarPersonas(tipo) {
    const contenedor = document.getElementById(tipo === 'director' ? 'lista-directores' : 'lista-actores');
    contenedor.innerHTML = "";

    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        let mapa = {};
        const todasPelis = e.target.result;

        // FILTRO: Solo procesamos las películas que tienen el estado 'vista'
        const pelisVistas = todasPelis.filter(p => p.estado === 'vista');

        pelisVistas.forEach(p => {
            if (tipo === 'director' && p.nombreDirector) {
                if (!mapa[p.nombreDirector]) {
                    mapa[p.nombreDirector] = { nombre: p.nombreDirector, foto: p.fotoDirector, pelis: [] };
                }
                mapa[p.nombreDirector].pelis.push(p);
            } else if (tipo === 'actor' && p.reparto) {
                p.reparto.forEach(a => {
                    if (!mapa[a.nombre]) {
                        mapa[a.nombre] = { nombre: a.nombre, foto: a.foto, pelis: [] };
                    }
                    mapa[a.nombre].pelis.push(p);
                });
            }
        });

        // Convertimos a array y ordenamos por cantidad de pelis (Ranking)
        let listaOrdenada = Object.values(mapa).sort((a, b) => b.pelis.length - a.pelis.length);

        listaOrdenada.forEach(persona => {
            // Ordenamos las pelis de esta persona por nota dentro de su ficha
            persona.pelis.sort((a, b) => (b.nota || 0) - (a.nota || 0));

            const div = document.createElement('div');
            div.className = 'persona-card';
            div.innerHTML = `
                <div class="persona-header">
                    <div style="position:relative;">
                        <img src="${persona.foto || 'https://via.placeholder.com/60'}" class="persona-img">
                        <span style="position:absolute; top:-5px; right:-5px; background:var(--main-red); color:white; border-radius:50%; width:22px; height:22px; font-size:11px; display:flex; align-items:center; justify-content:center; border:2px solid black; font-weight:bold;">
                            ${persona.pelis.length}
                        </span>
                    </div>
                    <div>
                        <h3 style="margin:0; font-size:16px;">${persona.nombre}</h3>
                        <p style="margin:0; font-size:11px; color:#888;">Vistas: ${persona.pelis.length}</p>
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
        document.getElementById('anio').value = p.anio || "";
        document.getElementById('nacionalidad').value = p.nacionalidad || "";
        document.getElementById('contenedor-actores').innerHTML = "";
        if(p.reparto) p.reparto.forEach(a => agregarCampoActor(a.nombre, a.foto));
        mostrarSeccion('nueva-peli');
    };
}

function eliminar(id) { if(confirm("¿Borrar definitivamente?")) db.transaction("peliculas", "readwrite").objectStore("peliculas").delete(id).onsuccess = () => window.location.reload(); }
function ampliar(s) { document.getElementById('modal-img').style.display='flex'; document.getElementById('img-ampliada').src=s; }

function cambiarTab(t) { currentTab = t; cargarPeliculas(); }

// Backup
function exportarDatos() {
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const blob = new Blob([JSON.stringify(e.target.result)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "cine_backup.json"; a.click();
    };
}
function importarDatos(f) {
    const r = new FileReader();
    r.onload = (e) => {
        const data = JSON.parse(e.target.result);
        const tx = db.transaction("peliculas", "readwrite");
        data.forEach(p => tx.objectStore("peliculas").put(p));
        tx.oncomplete = () => window.location.reload();
    };
    r.readAsText(f.files[0]);
}










