let db;
let currentTab = 'todas';
let guardando = false;
const API_KEY = '854e46049386f788b77a1188730b200b'; // Tu API Key de TMDb

// 1. CONEXIÓN DB
const request = indexedDB.open("CineTrackDB", 35);
request.onsuccess = (e) => { db = e.target.result; cargarPeliculas(); };
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

// 2. BUSCADOR DE PELÍCULAS (API)
async function buscarPeliEnAPI() {
    const query = document.getElementById('input-api').value;
    if (query.length < 2) return;

    const res = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
    const data = await res.json();
    
    const contenedor = document.getElementById('resultados-api');
    contenedor.innerHTML = "";
    contenedor.style.display = "block";

    data.results.slice(0, 5).forEach(peli => {
        const div = document.createElement('div');
        div.className = "item-api";
        div.style = "padding:10px; border-bottom:1px solid #333; cursor:pointer; color:white; font-size:14px;";
        div.innerHTML = `<strong>${peli.title}</strong> (${peli.release_date ? peli.release_date.split('-')[0] : '?'})`;
        div.onclick = () => importarPeli(peli.id);
        contenedor.appendChild(div);
    });
}

async function importarPeli(id) {
    const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
    const p = await res.json();

    document.getElementById('titulo').value = p.title;
    document.getElementById('anio').value = p.release_date ? p.release_date.split('-')[0] : '';
    document.getElementById('genero').value = p.genres.map(g => g.name).join(', ');
    document.getElementById('fotoPortada').value = `https://image.tmdb.org/t/p/w500${p.poster_path}`;
    document.getElementById('resultados-api').style.display = "none";

    const dir = p.credits.crew.find(c => c.job === 'Director');
    if (dir) {
        document.getElementById('nombreDirector').value = dir.name;
        await buscarPersonaAPI(dir.name, 'director');
    }

    const contAct = document.getElementById('contenedor-actores');
    contAct.innerHTML = "";
    for (let actor of p.credits.cast.slice(0, 5)) {
        const actId = Date.now() + Math.random();
        agregarFilaActor(actor.name, actId);
        await buscarPersonaAPI(actor.name, 'actor', actId);
    }
}

// 3. BUSCADOR DE BIOGRAFÍAS (API)
async function buscarPersonaAPI(nombre, tipo, actorId = null) {
    const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${encodeURIComponent(nombre)}&language=es-ES`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
        const pId = data.results[0].id;
        const detRes = await fetch(`https://api.themoviedb.org/3/person/${pId}?api_key=${API_KEY}&language=es-ES&append_to_response=combined_credits`);
        const det = await detRes.json();

        if (tipo === 'director') {
            document.getElementById('fotoDirector').value = `https://image.tmdb.org/t/p/w500${det.profile_path}`;
            document.getElementById('nacDirector').value = det.birthday || "---";
            document.getElementById('oriDirector').value = det.place_of_birth || "---";
            document.getElementById('bioDirector').value = det.biography || "Sin bio.";
        } else {
            const f = document.getElementById(`f-${actorId}`);
            const b = document.getElementById(`b-${actorId}`);
            const n = document.getElementById(`n-${actorId}`);
            const o = document.getElementById(`o-${actorId}`);
            const fl = document.getElementById(`fl-${actorId}`);
            if(f) f.value = `https://image.tmdb.org/t/p/w500${det.profile_path}`;
            if(b) b.value = det.biography || "";
            if(n) n.value = det.birthday || "";
            if(o) o.value = det.place_of_birth || "";
            if(fl) fl.value = JSON.stringify(det.combined_credits.cast.slice(0,12));
        }
    }
}

// 4. GUARDADO
function validarYGuardar(estado) {
    if (guardando) return;
    const tit = document.getElementById('titulo').value.trim();
    if (!tit) return alert("Pon un título");
    guardando = true;

    const peli = {
        titulo: tit,
        nombreDirector: document.getElementById('nombreDirector').value,
        fotoDirector: document.getElementById('fotoDirector').value,
        nacimDirector: document.getElementById('nacDirector').value,
        origenDirector: document.getElementById('oriDirector').value,
        bioDirector: document.getElementById('bioDirector').value,
        fotoPortada: document.getElementById('fotoPortada').value,
        anio: document.getElementById('anio').value,
        nota: document.getElementById('nota').value,
        genero: document.getElementById('genero').value,
        estado: estado,
        reparto: Array.from(document.querySelectorAll('.actor-row')).map(row => ({
            nombre: row.querySelector('.n-ac').value,
            foto: row.querySelector('.f-ac').value,
            bio: row.querySelector('.b-ac').value,
            nac: row.querySelector('.nac-ac').value,
            ori: row.querySelector('.ori-ac').value,
            filmo: row.querySelector('.fl-ac').value
        }))
    };

    const tx = db.transaction("peliculas", "readwrite");
    tx.objectStore("peliculas").add(peli);
    tx.oncomplete = () => {
        guardando = false;
        document.getElementById('form-pelicula').reset();
        document.getElementById('contenedor-actores').innerHTML = "";
        irAListadoEspecial(estado);
    };
}

// 5. GENERAR FICHAS ESTILO FILMAFFINITY
function generarFichas(tipo) {
    const contenedor = document.getElementById(tipo === 'director' ? 'lista-directores' : 'lista-actores');
    contenedor.innerHTML = "";
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const pelis = e.target.result;
        let mapa = {};

        pelis.forEach(p => {
            if (tipo === 'director' && p.nombreDirector) {
                if (!mapa[p.nombreDirector]) mapa[p.nombreDirector] = { nombre: p.nombreDirector, foto: p.fotoDirector, bio: p.bioDirector, nac: p.nacimDirector, ori: p.origenDirector, lista: [] };
                mapa[p.nombreDirector].lista.push(p);
            } else if (tipo === 'actor') {
                p.reparto.forEach(a => {
                    if (!mapa[a.nombre]) mapa[a.nombre] = { nombre: a.nombre, foto: a.foto, bio: a.bio, nac: a.nac, ori: a.ori, filmoFull: a.filmo, lista: [] };
                    mapa[a.nombre].lista.push(p);
                });
            }
        });

        Object.values(mapa).forEach(per => {
            const id = per.nombre.replace(/\s+/g, '');
            const div = document.createElement('div');
            div.className = "persona-card";
            div.style = "background:#1f1f1f; padding:15px; border-radius:12px; margin-bottom:20px; border:1px solid #333;";
            div.innerHTML = `
                <div style="display:flex; gap:15px;">
                    <img src="${per.foto}" style="width:80px; height:110px; object-fit:cover; border-radius:8px;">
                    <div>
                        <h3 style="margin:0; color:#e50914;">${per.nombre}</h3>
                        <p style="font-size:12px; color:#888; margin:5px 0;">📍 ${per.ori}<br>📅 ${per.nac}</p>
                    </div>
                </div>
                <div style="display:flex; border-bottom:1px solid #333; margin-top:10px;">
                    <div class="tab-p active" onclick="verTabP(this, 'mi-${id}')" style="padding:8px; font-size:11px; cursor:pointer;">EN MI LISTA</div>
                    <div class="tab-p" onclick="verTabP(this, 'bio-${id}')" style="padding:8px; font-size:11px; cursor:pointer;">BIOGRAFÍA</div>
                    ${tipo === 'actor' ? `<div class="tab-p" onclick="verTabP(this, 'all-${id}')" style="padding:8px; font-size:11px; cursor:pointer;">FILMOGRAFÍA</div>` : ''}
                </div>
                <div id="mi-${id}" class="c-p">
                    <div style="display:flex; gap:10px; overflow-x:auto; padding:10px 0;">
                        ${per.lista.map(pl => `<img src="${pl.fotoPortada}" style="width:60px; height:90px; object-fit:cover; border-radius:4px;">`).join('')}
                    </div>
                </div>
                <div id="bio-${id}" class="c-p" style="display:none; font-size:13px; color:#ccc; padding:10px 0;">${per.bio}</div>
                <div id="all-${id}" class="c-p" style="display:none; font-size:11px; color:#888; padding:10px 0;">
                    ${per.filmoFull ? JSON.parse(per.filmoFull).map(m => `• ${m.title || m.name}<br>`).join('') : '---'}
                </div>
            `;
            contenedor.appendChild(div);
        });
    };
}

// AUXILIARES
function agregarFilaActor(nombre, id) {
    const div = document.createElement('div');
    div.className = "actor-row";
    div.style = "background:#222; padding:8px; margin-bottom:5px; border-radius:5px;";
    div.innerHTML = `
        <input type="text" class="n-ac" value="${nombre}" style="width:80%; background:transparent; border:none; color:white;">
        <input type="hidden" id="f-${id}" class="f-ac"><input type="hidden" id="b-${id}" class="b-ac">
        <input type="hidden" id="n-${id}" class="nac-ac"><input type="hidden" id="o-${id}" class="ori-ac"><input type="hidden" id="fl-${id}" class="fl-ac">
        <button type="button" onclick="this.parentElement.remove()" style="color:red; background:none; border:none;">✕</button>`;
    document.getElementById('contenedor-actores').appendChild(div);
}

function verTabP(btn, id) {
    const p = btn.parentElement.parentElement;
    p.querySelectorAll('.tab-p').forEach(t => { t.classList.remove('active'); t.style.color="#666"; t.style.borderBottom="none"; });
    btn.style.color="white"; btn.style.borderBottom="2px solid #e50914";
    p.querySelectorAll('.c-p').forEach(c => c.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    if (!lista) return;
    lista.innerHTML = "";
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const pelis = e.target.result.filter(p => currentTab === 'todas' || p.estado === currentTab);
        pelis.forEach(p => {
            const div = document.createElement('div');
            div.className = "card-peli";
            div.style = "background:#1f1f1f; border-radius:8px; overflow:hidden;";
            div.innerHTML = `<img src="${p.fotoPortada}" style="width:100%; height:180px; object-fit:cover;"> <h4 style="padding:10px; margin:0; font-size:14px;">${p.titulo}</h4>`;
            lista.appendChild(div);
        });
    };
}

function mostrarSeccion(id) {
    document.getElementById("side-menu").classList.remove("active");
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    let t = id === 'inicio' ? 'seccion-inicio' : id === 'listado' ? 'seccion-listado' : id;
    document.getElementById(t).style.display = 'block';
    if(id === 'seccion-directores') generarFichas('director');
    if(id === 'seccion-actores') generarFichas('actor');
    window.scrollTo(0,0);
}

function toggleMenu() { document.getElementById("side-menu").classList.toggle("active"); }
function irAListadoEspecial(e) { currentTab = e; mostrarSeccion('listado'); }
function cambiarTab(t) { currentTab = t; cargarPeliculas(); }


