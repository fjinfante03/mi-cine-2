let db;
let currentTab = 'todas';
let guardando = false;
const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; // <--- PON AQUÍ TU API KEY DE TMDB

const request = indexedDB.open("CineTrackDB", 20);
request.onsuccess = (e) => { db = e.target.result; cargarPeliculas(); };
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

// --- BUSCADOR EXTERNO TMDB ---
async function buscarEnTMDB(nombre, tipo, actorId = null) {
    if (!nombre || nombre.length < 3) return;
    try {
        const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${encodeURIComponent(nombre)}&language=es-ES`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const pId = data.results[0].id;
            const detRes = await fetch(`https://api.themoviedb.org/3/person/${pId}?api_key=${API_KEY}&language=es-ES`);
            const det = await detRes.json();
            
            if (tipo === 'director') {
                document.getElementById('fotoDirector').value = `https://image.tmdb.org/t/p/w500${det.profile_path}`;
                document.getElementById('nacimientoDirector').value = det.birthday || "";
                document.getElementById('origenDirector').value = det.place_of_birth || "";
                document.getElementById('bioDirector').value = det.biography || "";
            } else {
                // Para actores en el reparto
                const inputFoto = document.getElementById(`foto-actor-${actorId}`);
                const inputBio = document.getElementById(`bio-actor-${actorId}`);
                const inputNac = document.getElementById(`nac-actor-${actorId}`);
                const inputOri = document.getElementById(`ori-actor-${actorId}`);
                if(inputFoto) inputFoto.value = `https://image.tmdb.org/t/p/w500${det.profile_path}`;
                if(inputBio) inputBio.value = det.biography || "";
                if(inputNac) inputNac.value = det.birthday || "";
                if(inputOri) inputOri.value = det.place_of_birth || "";
            }
        }
    } catch (err) { console.error("Error TMDB", err); }
}

// --- GESTIÓN DE PELÍCULAS ---
function validarYGuardar(estado) {
    if (guardando) return;
    const titulo = document.getElementById('titulo').value.trim();
    if (!titulo) return alert("Título obligatorio");

    guardando = true;
    const peli = {
        titulo,
        nombreDirector: document.getElementById('nombreDirector').value,
        fotoDirector: document.getElementById('fotoDirector').value,
        nacimientoDirector: document.getElementById('nacimientoDirector').value,
        origenDirector: document.getElementById('origenDirector').value,
        bioDirector: document.getElementById('bioDirector').value,
        fotoPortada: document.getElementById('fotoPortada').value || 'https://via.placeholder.com/150',
        reparto: Array.from(document.querySelectorAll('.actor-card-form')).map((f, idx) => ({
            nombre: f.querySelector('.nombre-actor').value,
            foto: f.querySelector('.foto-actor').value,
            bio: f.querySelector('.bio-actor').value,
            nacimiento: f.querySelector('.nac-actor').value,
            origen: f.querySelector('.ori-actor').value
        })).filter(a => a.nombre),
        genero: document.getElementById('genero').value,
        anio: document.getElementById('anio').value,
        nota: document.getElementById('nota').value,
        estado: estado
    };

    const tx = db.transaction("peliculas", "readwrite");
    tx.objectStore("peliculas").add(peli);
    tx.oncomplete = () => {
        document.getElementById('form-pelicula').reset();
        document.getElementById('contenedor-actores').innerHTML = "";
        guardando = false;
        irAListadoEspecial(estado);
    };
}

function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    if (!lista) return;
    lista.innerHTML = "";
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const pelis = e.target.result.filter(p => currentTab === 'todas' || p.estado === currentTab);
        pelis.forEach(p => {
            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `<img src="${p.fotoPortada}" class="img-peli"><h4>${p.titulo}</h4>`;
            lista.appendChild(div);
        });
    };
}

// --- GENERAR SECCIÓN DIRECTORES / ACTORES ---
function generarPersonas(tipo) {
    const contenedor = document.getElementById(tipo === 'director' ? 'lista-directores' : 'lista-actores');
    contenedor.innerHTML = "";
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const pelis = e.target.result;
        let mapa = {};

        pelis.forEach(p => {
            if (tipo === 'director' && p.nombreDirector) {
                if (!mapa[p.nombreDirector]) mapa[p.nombreDirector] = { 
                    nombre: p.nombreDirector, foto: p.fotoDirector, bio: p.bioDirector, 
                    nac: p.nacimientoDirector, ori: p.origenDirector, pelis: [] 
                };
                mapa[p.nombreDirector].pelis.push(p);
            } else if (tipo === 'actor') {
                p.reparto.forEach(a => {
                    if (!mapa[a.nombre]) mapa[a.nombre] = { 
                        nombre: a.nombre, foto: a.foto, bio: a.bio, 
                        nac: a.nacimiento, ori: a.origen, pelis: [] 
                    };
                    mapa[a.nombre].pelis.push(p);
                });
            }
        });

        Object.values(mapa).forEach(per => {
            const div = document.createElement('div');
            div.className = 'persona-card';
            div.innerHTML = `
                <div class="persona-header">
                    <img src="${per.foto || 'https://via.placeholder.com/150'}" class="persona-img">
                    <div class="info-bio">
                        <h3>${per.nombre}</h3>
                        <p>📍 ${per.ori || '---'}</p>
                        <p>📅 ${per.nac || '---'}</p>
                    </div>
                </div>
                <div class="persona-tabs">
                    <div class="p-tab active" onclick="switchTab(this, 'filmo-${per.nombre.replace(/\s/g, '')}')">FILMOGRAFÍA</div>
                    <div class="p-tab" onclick="switchTab(this, 'bio-${per.nombre.replace(/\s/g, '')}')">BIOGRAFÍA</div>
                </div>
                <div id="filmo-${per.nombre.replace(/\s/g, '')}" class="p-content">
                    <div class="filmografia-interna">
                        ${per.pelis.map(pl => `<div class="mini-peli"><img src="${pl.fotoPortada}"><span>${pl.anio}</span></div>`).join('')}
                    </div>
                </div>
                <div id="bio-${per.nombre.replace(/\s/g, '')}" class="p-content" style="display:none;">
                    <p class="biografia-txt">${per.bio || 'Sin biografía disponible.'}</p>
                </div>
            `;
            contenedor.appendChild(div);
        });
    };
}

// --- UTILIDADES ---
function switchTab(btn, id) {
    const parent = btn.parentElement.parentElement;
    parent.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    parent.querySelectorAll('.p-content').forEach(c => c.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function agregarCampoActor() {
    const id = Date.now();
    const div = document.createElement('div');
    div.className = "actor-card-form";
    div.innerHTML = `
        <input type="text" placeholder="Nombre Actor" class="nombre-actor" onblur="buscarEnTMDB(this.value, 'actor', ${id})">
        <input type="hidden" id="foto-actor-${id}" class="foto-actor">
        <input type="hidden" id="bio-actor-${id}" class="bio-actor">
        <input type="hidden" id="nac-actor-${id}" class="nac-actor">
        <input type="hidden" id="ori-actor-${id}" class="ori-actor">
        <button type="button" onclick="this.parentElement.remove()">✕</button>
    `;
    document.getElementById('contenedor-actores').appendChild(div);
}

function mostrarSeccion(id) {
    document.getElementById("side-menu").classList.remove("active");
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    let target = id === 'inicio' ? 'seccion-inicio' : id === 'listado' ? 'seccion-listado' : id;
    document.getElementById(target).style.display = 'block';
    if(id === 'seccion-directores') generarPersonas('director');
    if(id === 'seccion-actores') generarPersonas('actor');
    window.scrollTo(0,0);
}

function toggleMenu() { document.getElementById("side-menu").classList.toggle("active"); }
function irAListadoEspecial(e) { currentTab = e; mostrarSeccion('listado'); }
function cambiarTab(t) { currentTab = t; cargarPeliculas(); }






