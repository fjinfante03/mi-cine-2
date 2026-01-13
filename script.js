let db;
let currentTab = 'todas';
let guardando = false;
const _KEY = 'e8b61af0cf42a633e3aa581bb73127f8'; // Clave pública de TMDb

const request = indexedDB.open("CineTrackDB", 25);
request.onsuccess = (e) => { db = e.target.result; cargarPeliculas(); };
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

// --- BUSCADOR EXTERNO (TMDb) ---
async function buscarDatosTMDB(nombre, tipo, actorId = null) {
    if (!nombre || nombre.length < 3) return;
    try {
        const res = await fetch(`https://.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${encodeURIComponent(nombre)}&language=es-ES`);
        const data = await res.json();
        if (data.results && data.results.length > 0) {
            const personId = data.results[0].id;
            const detRes = await fetch(`https://api.themoviedb.org/3/person/${personId}?api_key=${API_KEY}&language=es-ES&append_to_response=combined_credits`);
            const details = await detRes.json();

            if (tipo === 'director') {
                document.getElementById('fotoDirector').value = `https://image.tmdb.org/t/p/w500${details.profile_path}`;
                document.getElementById('nacDirector').value = details.birthday || "Desconocido";
                document.getElementById('oriDirector').value = details.place_of_birth || "Desconocido";
                document.getElementById('bioDirector').value = details.biography || "Sin biografía.";
            } else if (tipo === 'actor') {
                const f = document.getElementById(`f-act-${actorId}`);
                const b = document.getElementById(`b-act-${actorId}`);
                const n = document.getElementById(`n-act-${actorId}`);
                const o = document.getElementById(`o-act-${actorId}`);
                const fl = document.getElementById(`fl-act-${actorId}`);
                
                if(f) f.value = `https://image.tmdb.org/t/p/w500${details.profile_path}`;
                if(b) b.value = details.biography || "";
                if(n) n.value = details.birthday || "";
                if(o) o.value = details.place_of_birth || "";
                // Guardamos sus 10 pelis más famosas
                if(fl) fl.value = JSON.stringify(details.combined_credits.cast.slice(0,10));
            }
        }
    } catch (err) { console.log("Error ", err); }
}

// --- GUARDADO ---
function validarYGuardar(estado) {
    if (guardando) return;
    const titulo = document.getElementById('titulo').value.trim();
    if (!titulo) return alert("Título obligatorio");
    guardando = true;

    const peli = {
        titulo,
        nombreDirector: document.getElementById('nombreDirector').value,
        fotoDirector: document.getElementById('fotoDirector').value,
        nacimientoDirector: document.getElementById('nacDirector').value,
        origenDirector: document.getElementById('oriDirector').value,
        bioDirector: document.getElementById('bioDirector').value,
        fotoPortada: document.getElementById('fotoPortada').value || 'https://via.placeholder.com/150',
        genero: document.getElementById('genero').value,
        anio: document.getElementById('anio').value,
        nota: document.getElementById('nota').value,
        estado: estado,
        reparto: Array.from(document.querySelectorAll('.actor-card-form')).map(f => ({
            nombre: f.querySelector('.nombre-actor').value,
            foto: f.querySelector('.foto-actor').value,
            bio: f.querySelector('.bio-actor').value,
            nacimiento: f.querySelector('.nac-actor').value,
            origen: f.querySelector('.ori-actor').value,
            filmoCompleta: f.querySelector('.filmo-actor').value
        })).filter(a => a.nombre)
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

// --- GENERAR FICHAS (FILMAFFINITY STYLE) ---
function generarPersonas(tipo) {
    const contenedor = document.getElementById(tipo === 'director' ? 'lista-directores' : 'lista-actores');
    contenedor.innerHTML = "";
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const pelis = e.target.result;
        let mapa = {};

        pelis.forEach(p => {
            if (tipo === 'director' && p.nombreDirector) {
                if (!mapa[p.nombreDirector]) mapa[p.nombreDirector] = { nombre: p.nombreDirector, foto: p.fotoDirector, bio: p.bioDirector, nac: p.nacimientoDirector, ori: p.origenDirector, listaPelis: [] };
                mapa[p.nombreDirector].listaPelis.push(p);
            } else {
                p.reparto.forEach(a => {
                    if (!mapa[a.nombre]) mapa[a.nombre] = { nombre: a.nombre, foto: a.foto, bio: a.bio, nac: a.nacimiento, ori: a.origen, filmoCompleta: a.filmoCompleta, listaPelis: [] };
                    mapa[a.nombre].listaPelis.push(p);
                });
            }
        });

        Object.values(mapa).forEach(per => {
            const idLimpio = per.nombre.replace(/\s+/g, '');
            const div = document.createElement('div');
            div.className = 'persona-card';
            div.innerHTML = `
                <div class="persona-header">
                    <img src="${per.foto || 'https://via.placeholder.com/150'}" class="persona-img">
                    <div class="info-txt">
                        <h3>${per.nombre}</h3>
                        <p>📍 ${per.ori || '---'}</p>
                        <p>📅 ${per.nac || '---'}</p>
                    </div>
                </div>
                <div class="persona-tabs">
                    <div class="p-tab active" onclick="verTab(this, 'filmo-${idLimpio}')">EN MI LISTA (${per.listaPelis.length})</div>
                    <div class="p-tab" onclick="verTab(this, 'bio-${idLimpio}')">BIOGRAFÍA</div>
                    ${tipo === 'actor' ? `<div class="p-tab" onclick="verTab(this, 'tmdb-${idLimpio}')">FILMOGRAFÍA COMPLETA</div>` : ''}
                </div>
                <div id="filmo-${idLimpio}" class="p-content">
                    <div class="mini-grid">
                        ${per.listaPelis.map(pl => `<div class="mini-item"><img src="${pl.fotoPortada}"><span>${pl.anio}</span></div>`).join('')}
                    </div>
                </div>
                <div id="bio-${idLimpio}" class="p-content" style="display:none;">
                    <div class="biografia-box">${per.bio || 'No hay biografía disponible.'}</div>
                </div>
                <div id="tmdb-${idLimpio}" class="p-content" style="display:none;">
                    <div class="biografia-box" style="font-size:11px;">
                        ${per.filmoCompleta ? JSON.parse(per.filmoCompleta).map(m => `• ${m.title || m.name} (${m.release_date || '?'})<br>`).join('') : 'Sin datos.'}
                    </div>
                </div>
            `;
            contenedor.appendChild(div);
        });
    };
}

// --- UTILIDADES ---
function verTab(btn, id) {
    const p = btn.parentElement.parentElement;
    p.querySelectorAll('.p-tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    p.querySelectorAll('.p-content').forEach(c => c.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function agregarCampoActor() {
    const id = Date.now();
    const div = document.createElement('div');
    div.className = "actor-card-form";
    div.style = "background:#222; padding:10px; margin-bottom:10px; border-radius:5px;";
    div.innerHTML = `
        <input type="text" class="nombre-actor" placeholder="Nombre Actor" onblur="buscarDatosTMDB(this.value, 'actor', ${id})">
        <input type="hidden" id="f-act-${id}" class="foto-actor">
        <input type="hidden" id="b-act-${id}" class="bio-actor">
        <input type="hidden" id="n-act-${id}" class="nac-actor">
        <input type="hidden" id="o-act-${id}" class="ori-actor">
        <input type="hidden" id="fl-act-${id}" class="filmo-actor">
        <button type="button" onclick="this.parentElement.remove()" style="background:red; color:white; border:none; margin-top:5px; padding:5px; width:100%;">Quitar</button>
    `;
    document.getElementById('contenedor-actores').appendChild(div);
}

function mostrarSeccion(id) {
    document.getElementById("side-menu").classList.remove("active");
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    let target = id === 'inicio' ? 'seccion-inicio' : id === 'listado' ? 'seccion-listado' : id;
    if(document.getElementById(target)) document.getElementById(target).style.display = 'block';
    if(id === 'seccion-directores') generarPersonas('director');
    if(id === 'seccion-actores') generarPersonas('actor');
    window.scrollTo(0,0);
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
            div.innerHTML = `<img src="${p.fotoPortada}" class="img-peli" style="width:100%; height:200px; object-fit:cover;"><h4>${p.titulo}</h4>`;
            lista.appendChild(div);
        });
    };
}

function toggleMenu() { document.getElementById("side-menu").classList.toggle("active"); }
function irAListadoEspecial(e) { currentTab = e; mostrarSeccion('listado'); }
function cambiarTab(t) { currentTab = t; cargarPeliculas(); }





