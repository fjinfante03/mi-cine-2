let db;
let currentTab = 'todas';
let guardando = false;
const API_KEY = '854e46049386f788b77a1188730b200b'; 

// 1. INICIALIZAR BASE DE DATOS
const request = indexedDB.open("CineTrackDB", 30);
request.onsuccess = (e) => { db = e.target.result; cargarPeliculas(); };
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

// 2. BUSCADOR AUTOMÁTICO DE PELÍCULAS (API)
async function buscarPeliEnAPI() {
    const query = document.getElementById('input-busqueda-api').value;
    if (query.length < 2) return;

    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
    const data = await res.json();
    
    const contenedor = document.getElementById('resultados-api');
    contenedor.innerHTML = "";
    contenedor.style.display = "block";

    data.results.slice(0, 5).forEach(peli => {
        const div = document.createElement('div');
        div.style = "padding:10px; border-bottom:1px solid #333; cursor:pointer; display:flex; gap:10px; align-items:center; color:white;";
        div.innerHTML = `
            <img src="https://image.tmdb.org/t/p/w92${peli.poster_path}" style="width:30px; border-radius:3px;">
            <div>
                <div style="font-weight:bold; font-size:14px;">${peli.title}</div>
                <div style="font-size:11px; color:#888;">${peli.release_date ? peli.release_date.split('-')[0] : ''}</div>
            </div>`;
        div.onclick = () => importarDatosPeli(peli.id);
        contenedor.appendChild(div);
    });
}

async function importarDatosPeli(movieId) {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${movieId}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
    const p = await res.json();

    document.getElementById('titulo').value = p.title;
    document.getElementById('anio').value = p.release_date ? p.release_date.split('-')[0] : '';
    document.getElementById('genero').value = p.genres.map(g => g.name).join(', ');
    document.getElementById('fotoPortada').value = `https://image.tmdb.org/t/p/w500${p.poster_path}`;
    document.getElementById('resultados-api').style.display = "none";

    const director = p.credits.crew.find(c => c.job === 'Director');
    if (director) {
        document.getElementById('nombreDirector').value = director.name;
        buscarDatosTMDB(director.name, 'director');
    }

    const contenedorActores = document.getElementById('contenedor-actores');
    contenedorActores.innerHTML = "";
    const topActores = p.credits.cast.slice(0, 5);
    
    for (let actor of topActores) {
        const id = Date.now() + Math.random();
        agregarCampoActorManual(actor.name, id);
        await buscarDatosTMDB(actor.name, 'actor', id);
    }
}

// 3. BUSCADOR DE PERSONAS (API)
async function buscarDatosTMDB(nombre, tipo, actorId = null) {
    if (!nombre || nombre.length < 3) return;
    try {
        const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${encodeURIComponent(nombre)}&language=es-ES`);
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
                if(fl) fl.value = JSON.stringify(details.combined_credits.cast.slice(0,10));
            }
        }
    } catch (err) { console.log("Error API", err); }
}

// 4. FUNCIONES DE GUARDADO Y CARGA
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

// 5. GENERAR FICHAS PERSONA
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
            } else if (tipo === 'actor') {
                p.reparto.forEach(a => {
                    if (!mapa[a.nombre]) mapa[a.nombre] = { nombre: a.nombre, foto: a.foto, bio: a.bio, nac: a.nacimiento, ori: a.origen, filmoCompleta: a.filmoCompleta, listaPelis: [] };
                    mapa[a.nombre].listaPelis.push(p);
                });
            }
        });

        Object.values(mapa).forEach(per => {
            const idL = per.nombre.replace(/\s+/g, '');
            const div = document.createElement('div');
            div.className = 'persona-card';
            div.innerHTML = `
                <div class="persona-header">
                    <img src="${per.foto || 'https://via.placeholder.com/150'}" class="persona-img" style="width:90px; height:120px; object-fit:cover; border-radius:8px;">
                    <div class="info-txt">
                        <h3 style="color:#e50914; margin:0;">${per.nombre}</h3>
                        <p style="color:#aaa; font-size:12px;">📍 ${per.ori || '---'}</p>
                        <p style="color:#aaa; font-size:12px;">📅 ${per.nac || '---'}</p>
                    </div>
                </div>
                <div class="persona-tabs" style="display:flex; border-bottom:1px solid #333; margin-top:10px;">
                    <div class="p-tab active" onclick="verTab(this, 'filmo-${idL}')" style="padding:10px; cursor:pointer; font-size:11px;">EN MI LISTA</div>
                    <div class="p-tab" onclick="verTab(this, 'bio-${idL}')" style="padding:10px; cursor:pointer; font-size:11px;">BIOGRAFÍA</div>
                    ${tipo === 'actor' ? `<div class="p-tab" onclick="verTab(this, 'tmdb-${idL}')" style="padding:10px; cursor:pointer; font-size:11px;">FILMOGRAFÍA</div>` : ''}
                </div>
                <div id="filmo-${idL}" class="p-content">
                    <div style="display:flex; gap:10px; overflow-x:auto; padding:10px 0;">
                        ${per.listaPelis.map(pl => `<div style="width:70px; flex-shrink:0;"><img src="${pl.fotoPortada}" style="width:100%; height:100px; object-fit:cover; border-radius:4px;"><span style="font-size:9px; color:#888;">${pl.anio}</span></div>`).join('')}
                    </div>
                </div>
                <div id="bio-${idL}" class="p-content" style="display:none; padding:10px; font-size:13px; color:#ccc;">${per.bio || 'Sin biografía.'}</div>
                <div id="tmdb-${idL}" class="p-content" style="display:none; padding:10px; font-size:11px; color:#888;">
                    ${per.filmoCompleta ? JSON.parse(per.filmoCompleta).map(m => `• ${m.title || m.name} (${m.release_date || '?'})<br>`).join('') : 'Sin datos.'}
                </div>`;
            contenedor.appendChild(div);
        });
    };
}

// 6. NAVEGACIÓN Y AUXILIARES
function verTab(btn, id) {
    const p = btn.parentElement.parentElement;
    p.querySelectorAll('.p-tab').forEach(t => { t.style.borderBottom = "none"; t.style.color = "#666"; });
    btn.style.borderBottom = "2px solid #e50914"; btn.style.color = "white";
    p.querySelectorAll('.p-content').forEach(c => c.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function agregarCampoActor() {
    const id = Date.now();
    agregarCampoActorManual("", id);
}

function agregarCampoActorManual(nombre, id) {
    const div = document.createElement('div');
    div.className = "actor-card-form";
    div.style = "background:#222; padding:10px; margin-bottom:10px; border-radius:5px;";
    div.innerHTML = `
        <input type="text" class="nombre-actor" value="${nombre}" placeholder="Nombre Actor" onblur="buscarDatosTMDB(this.value, 'actor', ${id})" style="width:100%; padding:8px; background:#111; border:1px solid #333; color:white;">
        <input type="hidden" id="f-act-${id}" class="foto-actor">
        <input type="hidden" id="b-act-${id}" class="bio-actor"><input type="hidden" id="n-act-${id}" class="nac-actor"><input type="hidden" id="o-act-${id}" class="ori-actor"><input type="hidden" id="fl-act-${id}" class="filmo-actor">
        <button type="button" onclick="this.parentElement.remove()" style="background:red; color:white; border:none; margin-top:5px; padding:5px; width:100%; border-radius:4px; font-size:11px;">QUITAR</button>`;
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

function toggleMenu() { document.getElementById("side-menu").classList.toggle("active"); }
function irAListadoEspecial(e) { currentTab = e; mostrarSeccion('listado'); }
function cambiarTab(t) { currentTab = t; cargarPeliculas(); }



