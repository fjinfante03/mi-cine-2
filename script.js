let db;
let currentTab = 'todas';
let chartGen, chartPais, chartDec;

const request = indexedDB.open("CineTrackDB", 11);
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};
request.onsuccess = (e) => { db = e.target.result; cargarPeliculas(); };

function toggleMenu() { document.getElementById("side-menu").classList.toggle("active"); }

function mostrarSeccion(id) {
    document.getElementById("side-menu").classList.remove("active");
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    
    const busquedaUI = document.getElementById('contenedor-busqueda');
    const sectionsWithSearch = ['seccion-listado', 'seccion-directores', 'seccion-actores'];
    busquedaUI.style.display = sectionsWithSearch.includes(id) ? 'block' : 'none';

    const target = id === 'inicio' ? 'seccion-inicio' : id === 'listado' ? 'seccion-listado' : id;
    document.getElementById(target).style.display = 'block';

    if (id === 'seccion-directores') generarPersonas('director');
    if (id === 'seccion-actores') generarPersonas('actor');
    if (id === 'pantalla-estadisticas') abrirEstadisticas();
    if (id === 'listado') cargarPeliculas();
}

function ejecutarBusqueda() {
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    if (document.getElementById('seccion-listado').style.display !== 'none') cargarPeliculas(busqueda);
    else if (document.getElementById('seccion-directores').style.display !== 'none') generarPersonas('director', busqueda);
    else if (document.getElementById('seccion-actores').style.display !== 'none') generarPersonas('actor', busqueda);
}

function validarYGuardar(estado) {
    const idInput = document.getElementById('edit-id');
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
        vecesVista: parseInt(document.getElementById('vecesVista').value) || 1,
        duracion: parseInt(document.getElementById('duracion').value) || 0,
        genero: document.getElementById('genero').value,
        plataforma: document.getElementById('plataforma').value,
        anio: parseInt(document.getElementById('anio').value) || 0,
        nacionalidad: document.getElementById('nacionalidad').value,
        estado: estado
    };

    if (!peli.titulo) return alert("Título obligatorio");

    const tx = db.transaction("peliculas", "readwrite");
    const store = tx.objectStore("peliculas");
    if (idInput.value) { peli.id = parseInt(idInput.value); store.put(peli); } 
    else { store.add(peli); }

    tx.oncomplete = () => {
        document.getElementById('form-pelicula').reset();
        idInput.value = "";
        document.getElementById('contenedor-actores').innerHTML = "";
        mostrarSeccion('listado');
    };
}

function cargarPeliculas(filtro = "") {
    const lista = document.getElementById('lista-peliculas');
    const orden = document.getElementById('ordenar-por').value;
    lista.innerHTML = ""; 

    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        let pelis = e.target.result.filter(p => (currentTab === 'todas' || p.estado === currentTab));
        
        if (filtro) {
            pelis = pelis.filter(p => p.titulo.toLowerCase().includes(filtro) || (p.nombreDirector || "").toLowerCase().includes(filtro));
        }

        pelis.sort((a, b) => {
            if (orden === 'alfabetico') return a.titulo.localeCompare(b.titulo);
            if (orden === 'nota-top') return b.nota - a.nota;
            return b.id - a.id;
        });

        pelis.forEach(p => {
            let colorPlat = "#444";
            const plat = (p.plataforma || "").toLowerCase();
            if (plat.includes("netflix")) colorPlat = "#E50914";
            else if (plat.includes("prime")) colorPlat = "#00A8E1";
            else if (plat.includes("disney")) colorPlat = "#0063BE";
            else if (plat.includes("hbo")) colorPlat = "#5822b4";

            const tag = p.estado === 'pendiente' ? `<div class="plataforma-tag" style="background:${colorPlat}">${p.plataforma}</div>` : '';

            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `
                <div style="position:relative;">
                    <img src="${p.fotoPortada || 'https://via.placeholder.com/150'}" class="img-peli" onclick="ampliar('${p.fotoPortada}')">
                    ${p.estado === 'vista' ? `<div class="nota-badge">⭐ ${p.nota}</div>` : ''}
                </div>
                <div style="padding:10px;">
                    <h4 style="margin:0; font-size:13px;">${p.titulo}</h4>
                    <p style="font-size:10px; color:#888;">${p.anio} | ${p.nacionalidad}</p>
                    ${tag}
                    <div style="display:flex; justify-content:space-between; margin-top:8px;">
                        <button onclick="editar(${p.id})" style="background:none; border:none; color:cyan;">✏️</button>
                        <button onclick="eliminar(${p.id})" style="background:none; border:none; color:red;">🗑️</button>
                    </div>
                </div>`;
            lista.appendChild(div);
        });
    };
}

function generarPersonas(tipo, filtro = "") {
    const contenedor = document.getElementById(tipo === 'director' ? 'lista-directores' : 'lista-actores');
    contenedor.innerHTML = "";
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        let mapa = {};
        const vistas = e.target.result.filter(p => p.estado === 'vista');
        vistas.forEach(p => {
            const keys = (tipo === 'director') ? [p.nombreDirector] : (p.reparto ? p.reparto.map(a => a.nombre) : []);
            keys.forEach(nombre => {
                if (!nombre || (filtro && !nombre.toLowerCase().includes(filtro))) return;
                if (!mapa[nombre]) mapa[nombre] = { nombre, foto: (tipo === 'director' ? p.fotoDirector : p.reparto.find(x => x.nombre === nombre).foto), pelis: [] };
                if (!mapa[nombre].pelis.find(m => m.id === p.id)) mapa[nombre].pelis.push(p);
            });
        });
        Object.values(mapa).sort((a,b) => b.pelis.length - a.pelis.length).forEach(per => {
            const div = document.createElement('div');
            div.className = 'persona-card';
            div.innerHTML = `<div class="persona-header"><img src="${per.foto || 'https://via.placeholder.com/60'}" class="persona-img"><div><h3>${per.nombre}</h3><p>${per.pelis.length} vistas</p></div></div><div class="persona-pelis">${per.pelis.map(p => `<img src="${p.fotoPortada}" class="mini-portada">`).join('')}</div>`;
            contenedor.appendChild(div);
        });
    };
}

function agregarCampoActor(nombre = "", foto = "") {
    const div = document.createElement('div');
    div.className = "actor-card-form";
    div.innerHTML = `<input type="text" placeholder="Nombre Actor" class="nombre-actor" value="${nombre}"><input type="text" placeholder="URL Foto" class="foto-actor" value="${foto}" style="margin-top:5px; width:100%;"><button type="button" onclick="this.parentElement.remove()" style="color:red; background:none; border:none; width:100%; text-align:right;">✕</button>`;
    document.getElementById('contenedor-actores').appendChild(div);
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
function cambiarTab(t) { currentTab = t; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.getElementById('tab-'+t).classList.add('active'); cargarPeliculas(); }
function irAListadoEspecial(e) { currentTab = e; mostrarSeccion('listado'); cambiarTab(e); }

function abrirEstadisticas() {
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const todas = e.target.result;
        const vistas = todas.filter(x => x.estado === 'vista');
        
        // 1. Resumen numérico
        const mins = vistas.reduce((a, b) => a + ((b.duracion || 0) * (b.vecesVista || 1)), 0);
        document.getElementById('stats-content').innerHTML = `
            <div class="persona-card" style="text-align:center; border-left: 5px solid var(--main-red);">
                <h1 style="font-size:3rem; margin:0;">${vistas.length}</h1>
                <p style="color:#888; margin:0;">Películas en tu historial</p>
                <h2 style="color:var(--main-red); margin-top:10px;">${Math.floor(mins/60)}h ${mins%60}min</h2>
                <p style="font-size:12px; color:#555;">Tiempo total de vida dedicado al cine</p>
            </div>`;

        // 2. Procesar datos para gráficas
        const stats = { generos: {}, paises: {}, decadas: {} };

        vistas.forEach(p => {
            // Géneros
            if (p.genero) stats.generos[p.genero] = (stats.generos[p.genero] || 0) + 1;
            // Países
            if (p.nacionalidad) stats.paises[p.nacionalidad] = (stats.paises[p.nacionalidad] || 0) + 1;
            // Décadas
            if (p.anio) {
                const decada = Math.floor(p.anio / 10) * 10 + "s";
                stats.decadas[decada] = (stats.decadas[decada] || 0) + 1;
            }
        });

        // 3. Renderizar Gráficos (Destruir anteriores si existen para evitar solapamiento)
        if (chartGen) chartGen.destroy();
        if (chartPais) chartPais.destroy();
        if (chartDec) chartDec.destroy();

        const configBase = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#fff' } } }
        };

        chartGen = new Chart(document.getElementById('graficoGeneros'), {
            type: 'doughnut',
            data: {
                labels: Object.keys(stats.generos),
                datasets: [{ data: Object.values(stats.generos), backgroundColor: ['#e50914', '#5822b4', '#00A8E1', '#0063BE', '#ffc107', '#28a745'] }]
            },
            options: configBase
        });

        chartPais = new Chart(document.getElementById('graficoPaises'), {
            type: 'bar',
            data: {
                labels: Object.keys(stats.paises),
                datasets: [{ label: 'Películas', data: Object.values(stats.paises), backgroundColor: '#e50914' }]
            },
            options: { ...configBase, scales: { y: { ticks: { color: '#fff' } }, x: { ticks: { color: '#fff' } } } }
        });

        chartDec = new Chart(document.getElementById('graficoDecadas'), {
            type: 'line',
            data: {
                labels: Object.keys(stats.decadas).sort(),
                datasets: [{ label: 'Películas por Década', data: Object.values(stats.decadas), borderColor: '#ffc107', tension: 0.3, fill: true, backgroundColor: 'rgba(255, 193, 7, 0.1)' }]
            },
            options: configBase
        });
    };
}












