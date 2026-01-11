let db;
let currentTab = 'todas';
let chartGen, chartPais, chartDec;

const request = indexedDB.open("CineTrackDB", 10);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = (e) => { db = e.target.result; cargarPeliculas(); };

function toggleMenu() {
    const menu = document.getElementById("side-menu");
    // Alternamos la clase active
    menu.classList.toggle("active");
}

// También actualiza mostrarSeccion para que lo cierre siempre
function mostrarSeccion(id) {
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    const target = id === 'inicio' ? 'seccion-inicio' : id === 'listado' ? 'seccion-listado' : id;
    document.getElementById(target).style.display = 'block';
    
    // Cierre forzado del menú
    document.getElementById("side-menu").classList.remove("active");
    
    if (id === 'seccion-directores') generarPersonas('director');
    if (id === 'seccion-actores') generarPersonas('actor');
    if (id === 'pantalla-estadisticas') abrirEstadisticas();
    if (id === 'listado') cargarPeliculas();
}

function irAListadoEspecial(estado) {
    currentTab = estado;
    mostrarSeccion('listado');
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + estado).classList.add('active');
    cargarPeliculas();
}

function agregarCampoActor(nombre = "", foto = "") {
    const div = document.createElement('div');
    div.className = "actor-card-form";
    div.innerHTML = `
        <div class="grid-2">
            <input type="text" placeholder="Nombre" class="nombre-actor" value="${nombre}">
            <input type="text" placeholder="URL Foto" class="foto-actor" value="${foto}">
        </div>
        <button type="button" style="background:none; border:none; color:red; font-size:10px; width:100%; text-align:right; margin-top:5px;" onclick="this.parentElement.remove()">✕ Quitar</button>
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
        nacionalidad: document.getElementById('nacionalidad').value.trim() || "Desconocida",
        estado: estado
        tx.oncomplete = () => {
        // En lugar de llamar a cargarPeliculas(), refrescamos para limpiar memoria
        window.location.reload();
    };

    const tx = db.transaction("peliculas", "readwrite");
    if (id) { peli.id = parseInt(id); tx.objectStore("peliculas").put(peli); } 
    else { tx.objectStore("peliculas").add(peli); }
    tx.oncomplete = () => window.location.reload();
}

function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    const criterioOrden = document.getElementById('ordenar-por').value;
    
    lista.innerHTML = ""; 

    if (!db) return;

    db.transaction("peliculas", "readonly").objectStore("peliculas").getAll().onsuccess = (e) => {
        let pelis = e.target.result;
        
        // 1. Filtrado (por estado y búsqueda)
        pelis = pelis.filter(p => {
            const coincideTab = (currentTab === 'todas' || p.estado === currentTab);
            const coincideBusqueda = p.titulo.toLowerCase().includes(busqueda);
            return coincideTab && coincideBusqueda;
        });

        // 2. Ordenación según el selector
        pelis.sort((a, b) => {
            if (criterioOrden === 'alfabetico') {
                return a.titulo.localeCompare(b.titulo);
            } else if (criterioOrden === 'anio-estreno') {
                return (b.anio || 0) - (a.anio || 0);
            } else if (criterioOrden === 'nota-top') {
                return (b.nota || 0) - (a.nota || 0);
            } else { // 'fecha-reciente' (por defecto usa el ID autoincremental de IndexedDB)
                return b.id - a.id;
            }
        });

        // 3. Pintado (Limpio y sin duplicados)
        lista.innerHTML = ""; 
        pelis.forEach(p => {
            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `
                <div style="position:relative;">
                    <img src="${p.fotoPortada || 'https://via.placeholder.com/150'}" class="img-peli" onclick="ampliar('${p.fotoPortada}')">
                    <div style="position:absolute; top:8px; right:8px;">
                        ${p.estado === 'vista' ? `<div class="nota-badge">⭐ ${p.nota}</div>` : ''}
                    </div>
                </div>
                <div style="padding:10px;">
                    <h4 style="margin:0; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.titulo}</h4>
                    <p style="font-size:10px; color:#888; margin-top:4px;">${p.anio || '----'} | ${p.nacionalidad || '---'}</p>
                    <div style="display:flex; justify-content:space-between; margin-top:8px;">
                        <button onclick="editar(${p.id})" style="background:none; border:none; color:cyan; cursor:pointer;">✏️</button>
                        <button onclick="eliminar(${p.id})" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
                    </div>
                </div>`;
            lista.appendChild(div);
        });
    };
}

        // 3. Pintamos solo los resultados únicos
        filtradas.forEach(p => {
            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `
                <div style="position:relative;">
                    <img src="${p.fotoPortada || 'https://via.placeholder.com/150'}" class="img-peli" onclick="ampliar('${p.fotoPortada}')">
                    <div style="position:absolute; top:8px; right:8px;">
                        ${p.estado === 'vista' ? `<div class="nota-badge">⭐ ${p.nota}</div>` : ''}
                    </div>
                </div>
                <div style="padding:10px;">
                    <h4 style="margin:0; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.titulo}</h4>
                    <p style="font-size:10px; color:#888; margin-top:4px;">${p.anio || ''} | ${p.nacionalidad || ''}</p>
                    <div style="display:flex; justify-content:space-between; margin-top:8px;">
                        <button onclick="editar(${p.id})" style="background:none; border:none; color:cyan; cursor:pointer;">✏️</button>
                        <button onclick="eliminar(${p.id})" style="background:none; border:none; color:red; cursor:pointer;">🗑️</button>
                    </div>
                </div>`;
            lista.appendChild(div);
        });
    };
}

function abrirEstadisticas() {
    document.getElementById('pantalla-estadisticas').style.display = 'block';
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const vistas = e.target.result.filter(x => x.estado === 'vista');
        const mins = vistas.reduce((a, b) => a + ((b.duracion || 0) * (b.vecesVista || 1)), 0);
        
        let genStats = {}, paisStats = {}, decStats = {};
        vistas.forEach(p => {
            // Géneros
            const g = p.genero || "Otros";
            if(!genStats[g]) genStats[g] = 0;
            genStats[g] += (p.duracion || 0) * (p.vecesVista || 1);

            // Países
            const pais = p.nacionalidad || "Desconocida";
            paisStats[pais] = (paisStats[pais] || 0) + 1;

            // Décadas
            if (p.anio > 0) {
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
            // Gráfico Géneros
            if(chartGen) chartGen.destroy();
            chartGen = new Chart(document.getElementById('graficoGeneros'), {
                type: 'doughnut',
                data: { labels: Object.keys(genStats), datasets: [{ data: Object.values(genStats).map(m => (m/60).toFixed(1)), backgroundColor: ['#e50914', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6'] }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'white' } } } }
            });

            // Gráfico Países
            if(chartPais) chartPais.destroy();
            chartPais = new Chart(document.getElementById('graficoPaises'), {
                type: 'pie',
                data: { labels: Object.keys(paisStats), datasets: [{ data: Object.values(paisStats), backgroundColor: ['#1abc9c', '#e67e22', '#34495e', '#27ae60', '#d35400'] }] },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: 'white' } } } }
            });

            // Gráfico Décadas
            if(chartDec) chartDec.destroy();
            const decKeys = Object.keys(decStats).sort();
            chartDec = new Chart(document.getElementById('graficoDecadas'), {
                type: 'bar',
                data: { labels: decKeys, datasets: [{ label: 'Pelis', data: decKeys.map(k => decStats[k]), backgroundColor: '#e50914' }] },
                options: { responsive: true, maintainAspectRatio: false, scales: { x: { ticks: { color: 'white' } }, y: { ticks: { color: 'white' } } } }
            });
        }, 300);
    };
}

function generarPersonas(tipo) {
    const contenedor = document.getElementById(tipo === 'director' ? 'lista-directores' : 'lista-actores');
    contenedor.innerHTML = "";
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        let mapa = {};
        e.target.result.forEach(p => {
            const keys = (tipo === 'director') ? [p.nombreDirector] : (p.reparto ? p.reparto.map(a => a.nombre) : []);
            keys.forEach(nombre => {
                if(!nombre) return;
                if(!mapa[nombre]) mapa[nombre] = { nombre, foto: (tipo === 'director' ? p.fotoDirector : p.reparto.find(x => x.nombre === nombre).foto), pelis: [] };
                mapa[nombre].pelis.push(p);
            });
        });
        Object.values(mapa).sort((a,b) => b.pelis.length - a.pelis.length).forEach(per => {
            per.pelis.sort((a,b) => b.nota - a.nota);
            const div = document.createElement('div');
            div.className = 'persona-card';
            div.innerHTML = `
                <div class="persona-header">
                    <img src="${per.foto || 'https://via.placeholder.com/60'}" class="persona-img">
                    <div><h3 style="margin:0;">${per.nombre}</h3><p style="margin:0; font-size:11px; color:#888;">${per.pelis.length} películas</p></div>
                </div>
                <div class="persona-pelis">${per.pelis.map(p => `<img src="${p.fotoPortada}" class="mini-portada" onclick="ampliar('${p.fotoPortada}')">`).join('')}</div>`;
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

function eliminar(id) { if(confirm("¿Borrar?")) db.transaction("peliculas", "readwrite").objectStore("peliculas").delete(id).onsuccess = () => window.location.reload(); }
function ampliar(s) { document.getElementById('modal-img').style.display='flex'; document.getElementById('img-ampliada').src=s; }

function exportarDatos() {
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const b = new Blob([JSON.stringify(e.target.result)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "cine_backup.json"; a.click();
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

function cambiarTab(t) { currentTab = t; cargarPeliculas(); }









