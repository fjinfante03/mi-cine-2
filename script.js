let db;
let currentTab = 'todas';
let chartGen, chartPais, chartDec;

// IndexedDB
const request = indexedDB.open("CineTrackDB", 15);
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

    const target = (id === 'inicio' || id === 'listado') ? 'seccion-' + id : id;
    const el = document.getElementById(target);
    if(el) el.style.display = 'block';

    // ESTO ASEGURA QUE LA SECCIÓN EMPIECE DESDE ARRIBA
    window.scrollTo(0, 0);

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

    if (!peli.titulo) return alert("El título es necesario");

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
            pelis = pelis.filter(p => 
                p.titulo.toLowerCase().includes(filtro) || 
                (p.nombreDirector || "").toLowerCase().includes(filtro) ||
                (p.reparto ? p.reparto.some(a => a.nombre.toLowerCase().includes(filtro)) : false)
            );
        }

        pelis.sort((a, b) => {
            if (orden === 'alfabetico') return a.titulo.localeCompare(b.titulo);
            if (orden === 'nota-top') return b.nota - a.nota;
            return b.id - a.id;
        });

        pelis.forEach(p => {
            let colorPlat = "#333";
            const plat = (p.plataforma || "").toLowerCase();
            if (plat.includes("netflix")) colorPlat = "#E50914";
            else if (plat.includes("prime")) colorPlat = "#00A8E1";
            else if (plat.includes("disney")) colorPlat = "#0063BE";
            else if (plat.includes("hbo")) colorPlat = "#5822b4";

            const tag = p.estado === 'pendiente' ? `<div class="plataforma-tag" style="background:${colorPlat}">📺 ${p.plataforma}</div>` : '';

            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `
                <div style="position:relative;">
                    <img src="${p.fotoPortada || 'https://via.placeholder.com/150'}" class="img-peli" onclick="ampliar('${p.fotoPortada}')">
                    ${p.estado === 'vista' ? `<div class="nota-badge">⭐ ${p.nota}</div>` : ''}
                </div>
                <div style="padding:10px;">
                    <h4 style="margin:0; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${p.titulo}</h4>
                    <p style="font-size:10px; color:#888;">${p.anio || '---'} | ${p.nacionalidad || '---'}</p>
                    ${tag}
                    <div style="display:flex; justify-content:space-between; margin-top:8px;">
                        <button onclick="editar(${p.id})" style="background:none; border:none; color:cyan; font-size:18px;">✏️</button>
                        <button onclick="eliminar(${p.id})" style="background:none; border:none; color:red; font-size:18px;">🗑️</button>
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
                if (!nombre) return;
                if (filtro && !nombre.toLowerCase().includes(filtro)) return;

                if (!mapa[nombre]) {
                    mapa[nombre] = { 
                        nombre, 
                        foto: (tipo === 'director' ? p.fotoDirector : p.reparto.find(x => x.nombre === nombre).foto), 
                        pelis: [] 
                    };
                }
                if (!mapa[nombre].pelis.find(m => m.id === p.id)) mapa[nombre].pelis.push(p);
            });
        });

        Object.values(mapa).sort((a,b) => b.pelis.length - a.pelis.length).forEach(per => {
            const div = document.createElement('div');
            div.className = 'persona-card';
            div.innerHTML = `
                <div class="persona-header">
                    <img src="${per.foto || 'https://via.placeholder.com/60'}" class="persona-img">
                    <div><h3 style="margin:0;">${per.nombre}</h3><p style="margin:0; font-size:11px; color:#888;">${per.pelis.length} películas vistas</p></div>
                </div>
                <div class="persona-pelis">${per.pelis.map(p => `<img src="${p.fotoPortada}" class="mini-portada" onclick="ampliar('${p.fotoPortada}')">`).join('')}</div>`;
            contenedor.appendChild(div);
        });
    };
}

function abrirEstadisticas() {
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const todas = e.target.result;
        const vistas = todas.filter(x => x.estado === 'vista');
        const minsTotal = vistas.reduce((a, b) => a + ((b.duracion || 0) * (b.vecesVista || 1)), 0);
        
        document.getElementById('stats-content').innerHTML = `
            <div class="persona-card" style="text-align:center; border-top:4px solid var(--main-red);">
                <h1 style="font-size:40px; margin:0; color:var(--main-red);">${vistas.length}</h1>
                <p style="margin:0; color:#888;">PELÍCULAS VISTAS</p>
                <h2 style="margin-top:10px;">${Math.floor(minsTotal/60)}h ${minsTotal%60}min</h2>
                <p style="font-size:11px; color:#555;">TIEMPO TOTAL</p>
            </div>`;

        const genMap = {}, paisMap = {}, decMap = {};
        vistas.forEach(p => {
            if (p.genero) genMap[p.genero] = (genMap[p.genero] || 0) + 1;
            if (p.nacionalidad) paisMap[p.nacionalidad] = (paisMap[p.nacionalidad] || 0) + 1;
            if (p.anio) {
                const dec = Math.floor(p.anio / 10) * 10 + "s";
                decMap[dec] = (decMap[dec] || 0) + 1;
            }
        });

        setTimeout(() => {
            chartGen = renderGrafico('graficoGeneros', 'doughnut', genMap, 'Géneros', chartGen);
            chartPais = renderGrafico('graficoPaises', 'bar', paisMap, 'Países', chartPais);
            chartDec = renderGrafico('graficoDecadas', 'line', decMap, 'Décadas', chartDec);
        }, 200);
    };
}

function renderGrafico(id, tipo, data, label, chartVar) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    if (chartVar) chartVar.destroy();
    return new Chart(ctx, {
        type: tipo,
        data: {
            labels: Object.keys(data),
            datasets: [{ label: label, data: Object.values(data), backgroundColor: ['#e50914', '#00A8E1', '#ffc107', '#28a745', '#5822b4'], borderColor: tipo === 'line' ? '#ffc107' : 'transparent' }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } }, scales: tipo !== 'doughnut' ? { y: { ticks: { color: '#888' } }, x: { ticks: { color: '#888' } } } : {} }
    });
}

function agregarCampoActor(nombre = "", foto = "") {
    const div = document.createElement('div');
    div.className = "actor-card-form";
    div.innerHTML = `
        <input type="text" placeholder="Nombre Actor" class="nombre-actor" value="${nombre}" style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:5px;">
        <input type="text" placeholder="URL Foto" class="foto-actor" value="${foto}" style="width:100%; padding:8px; background:#111; color:white; border:1px solid #333; border-radius:5px; margin-top:5px;">
        <button type="button" onclick="this.parentElement.remove()" style="color:red; background:none; border:none; width:100%; text-align:right; margin-top:5px; cursor:pointer;">✕ Quitar</button>`;
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

function eliminar(id) { if(confirm("¿Eliminar película?")) db.transaction("peliculas", "readwrite").objectStore("peliculas").delete(id).onsuccess = () => cargarPeliculas(); }
function ampliar(s) { document.getElementById('modal-img').style.display='flex'; document.getElementById('img-ampliada').src=s; }
function cambiarTab(t) { currentTab = t; document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); document.getElementById('tab-'+t).classList.add('active'); cargarPeliculas(); }
function irAListadoEspecial(e) { 
    currentTab = e; 
    mostrarSeccion('listado'); // Esto ya activa el buscador y el listado
    cambiarTab(e); 
    
    // Forzamos el scroll al inicio para que el header no tape nada
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

function exportarDatos() {
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const blob = new Blob([JSON.stringify(e.target.result)], { type: "application/json" });
        const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "mi_cine_backup.json"; a.click();
    };
}
function importarDatos(input) {
    const archivo = input.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    
    lector.onload = function(e) {
        try {
            const datos = JSON.parse(e.target.result);
            
            if (!Array.isArray(datos)) {
                throw new Error("El archivo no tiene el formato correcto.");
            }

            // Abrimos una transacción de lectura/escritura
            const tx = db.transaction("peliculas", "readwrite");
            const store = tx.objectStore("peliculas");

            // Limpiamos la base de datos actual antes de importar (Opcional, pero recomendado para evitar basura)
            // store.clear(); 

            datos.forEach(peli => {
                // Eliminamos el ID si queremos que se generen nuevos o lo dejamos si queremos conservar el orden
                // store.put(peli) actualizará si el ID existe o creará si no.
                store.put(peli);
            });

            tx.oncomplete = function() {
                alert("✅ ¡Importación completada con éxito! La página se recargará.");
                window.location.reload();
            };

            tx.onerror = function(err) {
                console.error("Error en la transacción:", err);
                alert("❌ Error al guardar los datos en la base de datos.");
            };

        } catch (error) {
            console.error("Error al importar:", error);
            alert("❌ El archivo no es un backup válido o está dañado.");
        }
    };

    lector.onerror = function() {
        alert("❌ No se pudo leer el archivo.");
    };

    lector.readAsText(archivo);
}
















