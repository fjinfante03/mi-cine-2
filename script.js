let db;
let currentTab = 'todas';
const request = indexedDB.open("CineTrackDB", 3);

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
    if (id === 'seccion-directores') { generarPersonas('director'); }
    else if (id === 'seccion-actores') { generarPersonas('actor'); }
    else {
        const target = id === 'inicio' ? 'seccion-inicio' : id === 'listado' ? 'seccion-listado' : id;
        document.getElementById(target).style.display = 'block';
    }
    if (id === 'listado') cargarPeliculas();
    toggleMenu();
}

function validarYGuardar(estado) {
    const id = document.getElementById('edit-id').value;
    const peli = {
        titulo: document.getElementById('titulo').value,
        nombreDirector: document.getElementById('nombreDirector').value,
        fotoDirector: document.getElementById('fotoDirector').value,
        actores: document.getElementById('actores').value,
        fotoActor: document.getElementById('fotoActor').value,
        nota: parseFloat(document.getElementById('nota').value) || 0,
        duracion: parseInt(document.getElementById('duracion').value) || 0,
        genero: document.getElementById('genero').value,
        plataforma: document.getElementById('plataforma').value,
        estado: estado
    };

    const tx = db.transaction("peliculas", "readwrite");
    const store = tx.objectStore("peliculas");
    if (id) { peli.id = parseInt(id); store.put(peli); } 
    else { store.add(peli); }

    tx.oncomplete = () => {
        document.getElementById('form-pelicula').reset();
        document.getElementById('edit-id').value = "";
        mostrarSeccion('listado');
    };
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
            const matchesTab = currentTab === 'todas' || p.estado === currentTab;
            const matchesBusqueda = p.titulo.toLowerCase().includes(busqueda) || (p.actores && p.actores.toLowerCase().includes(busqueda));
            return matchesTab && matchesBusqueda;
        }).forEach(p => {
            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `
                <img src="${p.fotoActor || 'https://via.placeholder.com/150'}" class="img-peli" onclick="ampliar('${p.fotoActor}')">
                <div style="padding:10px;">
                    <h4 style="margin:0; font-size:14px;">${p.titulo}</h4>
                    <div style="display:flex; justify-content:space-between; margin-top:8px;">
                        <button onclick="editar(${p.id})" style="background:none; border:none; color:cyan;">✏️</button>
                        <button onclick="eliminar(${p.id})" style="background:none; border:none; color:red;">🗑️</button>
                    </div>
                </div>
            `;
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
                mapa[p.nombreDirector].pelis.push(p.fotoActor);
            } else if (tipo === 'actor' && p.actores) {
                p.actores.split(',').forEach(a => {
                    let nombre = a.trim();
                    if (!mapa[nombre]) mapa[nombre] = { foto: p.fotoActor, pelis: [] };
                    mapa[nombre].pelis.push(p.fotoActor);
                });
            }
        });

        for (let nombre in mapa) {
            const div = document.createElement('div');
            div.className = 'persona-card';
            div.innerHTML = `
                <div class="persona-header">
                    <img src="${mapa[nombre].foto || 'https://via.placeholder.com/60'}" class="persona-img">
                    <h3>${nombre}</h3>
                </div>
                <div class="persona-pelis">${mapa[nombre].pelis.map(img => `<img src="${img}" class="mini-portada">`).join('')}</div>
            `;
            contenedor.appendChild(div);
        }
    };
}

function abrirEstadisticas() {
    mostrarSeccion('pantalla-estadisticas');
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const p = e.target.result;
        const vistas = p.filter(x => x.estado === 'vista');
        const totalMins = vistas.reduce((a, b) => a + (b.duracion || 0), 0);
        const media = vistas.reduce((a, b) => a + (b.nota || 0), 0) / (vistas.length || 1);
        
        const plat = p.reduce((acc, x) => { acc[x.plataforma] = (acc[x.plataforma] || 0) + 1; return acc; }, {});
        const gen = p.reduce((acc, x) => { acc[x.genero] = (acc[x.genero] || 0) + 1; return acc; }, {});
        const topPlat = Object.keys(plat).sort((a,b) => plat[b]-plat[a])[0] || '-';
        const topGen = Object.keys(gen).sort((a,b) => gen[b]-gen[a])[0] || '-';

        document.getElementById('stats-content').innerHTML = `
            <div class="persona-card">
                <h1 style="color:var(--main-red); margin:0;">${vistas.length}</h1>
                <p>Películas vistas</p>
                <h2 style="margin:10px 0 0 0;">${Math.floor(totalMins/60)}h ${totalMins%60}min</h2>
                <p>Tiempo total</p>
            </div>
            <div class="persona-card">
                <p>⭐ Nota Media: <b>${media.toFixed(1)}</b></p>
                <p>📺 Plataforma Top: <b>${topPlat}</b></p>
                <p>🎭 Género Top: <b>${topGen}</b></p>
            </div>
        `;
    };
}

function eliminar(id) { if(confirm("¿Borrar?")) { db.transaction("peliculas", "readwrite").objectStore("peliculas").delete(id).onsuccess = () => cargarPeliculas(); } }
function editar(id) {
    db.transaction("peliculas").objectStore("peliculas").get(id).onsuccess = (e) => {
        const p = e.target.result;
        document.getElementById('edit-id').value = p.id;
        document.getElementById('titulo').value = p.titulo;
        document.getElementById('nombreDirector').value = p.nombreDirector;
        document.getElementById('fotoDirector').value = p.fotoDirector;
        document.getElementById('actores').value = p.actores;
        document.getElementById('fotoActor').value = p.fotoActor;
        document.getElementById('nota').value = p.nota;
        document.getElementById('duracion').value = p.duracion;
        document.getElementById('genero').value = p.genero;
        document.getElementById('plataforma').value = p.plataforma;
        mostrarSeccion('nueva-peli');
    };
}
function ampliar(src) { if(src) { document.getElementById('modal-img').style.display = 'flex'; document.getElementById('img-ampliada').src = src; } }

function exportarDatos() {
    db.transaction("peliculas", "readonly").objectStore("peliculas").getAll().onsuccess = (e) => {
        const blob = new Blob([JSON.stringify(e.target.result)], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `cine_backup.json`;
        a.click();
    };
}

function importarDatos(input) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const pelis = JSON.parse(e.target.result);
        const tx = db.transaction("peliculas", "readwrite");
        pelis.forEach(p => tx.objectStore("peliculas").put(p));
        tx.oncomplete = () => location.reload();
    };
    reader.readAsText(input.files[0]);
}
