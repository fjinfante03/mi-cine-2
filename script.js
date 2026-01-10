let db;
let currentTab = 'todas';
let miGrafico = null;
const request = indexedDB.open("CineTrackDB", 8);

request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
};

request.onsuccess = (e) => { db = e.target.result; cargarPeliculas(); };

function toggleMenu() {
    const m = document.getElementById("side-menu");
    m.style.width = m.style.width === "250px" ? "0" : "250px";
}

function mostrarSeccion(id) {
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    const target = id === 'inicio' ? 'seccion-inicio' : id === 'listado' ? 'seccion-listado' : id;
    document.getElementById(target).style.display = 'block';
    if (id === 'seccion-directores') generarPersonas('director');
    if (id === 'seccion-actores') generarPersonas('actor');
    if (id === 'pantalla-estadisticas') abrirEstadisticas();
    if (id === 'listado') cargarPeliculas();
    toggleMenu();
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
            <input type="text" placeholder="Nombre Actor" class="nombre-actor" value="${nombre}">
            <input type="text" placeholder="URL Foto" class="foto-actor" value="${foto}">
        </div>
        <button type="button" style="background:none; border:none; color:red; font-size:10px; width:100%; text-align:right; margin-top:5px; cursor:pointer;" onclick="this.parentElement.remove()">✕ Quitar</button>
    `;
    document.getElementById('contenedor-actores').appendChild(div);
}

function validarYGuardar(estado) {
    const id = document.getElementById('edit-id').value;
    const reparto = Array.from(document.querySelectorAll('.actor-card-form')).map(f => ({
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
    const store = tx.objectStore("peliculas");
    if (id) { peli.id = parseInt(id); store.put(peli); } 
    else { store.add(peli); }
    tx.oncomplete = () => window.location.reload();
}

function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    lista.innerHTML = ""; 

    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        lista.innerHTML = ""; 
        e.target.result.filter(p => (currentTab === 'todas' || p.estado === currentTab) && p.titulo.toLowerCase().includes(busqueda))
        .forEach(p => {
            const esV = p.estado === 'vista';
            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `
                <div style="position:relative;">
                    <img src="${p.fotoPortada || 'https://via.placeholder.com/150'}" class="img-peli" onclick="ampliar('${p.fotoPortada}')">
                    <div style="position:absolute; top:8px; right:8px; display:flex; flex-direction:column; align-items:flex-end;">
                        ${esV ? `<div class="nota-badge">⭐ ${p.nota.toFixed(1)}</div>` : ''}
                        ${esV && p.vecesVista > 1 ? `<div class="veces-badge">VISTA ${p.vecesVista} VECES</div>` : ''}
                    </div>
                </div>
                <div style="padding:10px;">
                    <h4 style="margin:0; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.titulo}</h4>
                    <p style="font-size:10px; color:#888; margin:5px 0;">${esV && p.fechaVista ? '📅 ' + new Date(p.fechaVista).toLocaleDateString() : ''}</p>
                    <div style="display:flex; justify-content:space-between;">
                        <button onclick="editar(${p.id})" style="background:none; border:none; color:cyan;">✏️</button>
                        <button onclick="eliminar(${p.id})" style="background:none; border:none; color:red;">🗑️</button>
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
        let genStats = {};
        vistas.forEach(p => {
            const g = p.genero || "Sin Género";
            if (!genStats[g]) genStats[g] = { count: 0, time: 0 };
            genStats[g].count++;
            genStats[g].time += (p.duracion || 0) * (p.vecesVista || 1);
        });

        document.getElementById('stats-content').innerHTML = `
            <div class="persona-card" style="text-align:center;">
                <h1 style="color:var(--main-red); margin:0;">${vistas.length}</h1>
                <p>Películas Vistas</p>
                <h2>${Math.floor(mins/60)}h ${mins%60}min</h2>
                <p>Tiempo Total</p>
            </div>`;

        setTimeout(() => {
            if (typeof Chart === 'undefined') return;
            const ctx = document.getElementById('graficoGeneros').getContext('2d');
            if (miGrafico) miGrafico.destroy();
            miGrafico = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: Object.keys(genStats),
                    datasets: [{
                        data: Object.values(genStats).map(g => g.time),
                        backgroundColor: ['#e50914', '#007bff', '#28a745', '#ffc107', '#17a2b8', '#6610f2'],
                        borderColor: '#141414',
                        borderWidth: 2
                    }]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: 'white', font: { size: 11 } } } } 
                }
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
            if (tipo === 'director' && p.nombreDirector) {
                if (!mapa[p.nombreDirector]) mapa[p.nombreDirector] = { foto: p.fotoDirector, pelis: new Set() };
                mapa[p.nombreDirector].pelis.add(p.fotoPortada);
            } else if (tipo === 'actor' && p.reparto) {
                p.reparto.forEach(a => {
                    if (!mapa[a.nombre]) mapa[a.nombre] = { foto: a.foto, pelis: new Set() };
                    mapa[a.nombre].pelis.add(p.fotoPortada);
                });
            }
        });
        for (let n in mapa) {
            const pelisArr = Array.from(mapa[n].pelis);
            const div = document.createElement('div');
            div.className = 'persona-card';
            div.innerHTML = `<div class="persona-header"><img src="${mapa[n].foto || 'https://via.placeholder.com/60'}" class="persona-img"><h3>${n}</h3></div>
            <div class="persona-pelis">${pelisArr.map(img => `<img src="${img}" class="mini-portada" onclick="ampliar('${img}')">`).join('')}</div>`;
            contenedor.appendChild(div);
        }
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

function eliminar(id) { if(confirm("¿Borrar?")) db.transaction("peliculas", "readwrite").objectStore("peliculas").delete(id).onsuccess = () => window.location.reload(); }
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
        tx.oncomplete = () => window.location.reload();
    };
    r.readAsText(i.files[0]);
}

function cambiarTab(tab) {
    currentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tab).classList.add('active');
    cargarPeliculas();
}



