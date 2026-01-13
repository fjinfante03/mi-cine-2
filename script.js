let db;
let currentTab = 'todas';
const API_KEY = '854e46049386f788b77a1188730b200b';

// 1. INICIAR BASE DE DATOS
const request = indexedDB.open("CineTrackDB", 60);
request.onsuccess = (e) => { 
    db = e.target.result; 
    console.log("DB Conectada");
    cargarPeliculas(); 
};
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

// 2. FUNCIÓN DEL BOTÓN BUSCAR (Esta es la que fallaba)
async function buscarPeliEnAPI() {
    const input = document.getElementById('input-api');
    if (!input) return;
    const query = input.value.trim();
    
    if (query.length < 2) {
        alert("Escribe el nombre de una película para buscar.");
        return;
    }

    try {
        const url = `https://api.themoviedb.org/3/search/movie?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`;
        const res = await fetch(url);
        const data = await res.json();
        
        const contenedor = document.getElementById('resultados-api');
        contenedor.innerHTML = "";
        
        if (!data.results || data.results.length === 0) {
            alert("No se han encontrado películas con ese nombre.");
            return;
        }

        contenedor.style.display = "block";
        data.results.slice(0, 5).forEach(peli => {
            const div = document.createElement('div');
            div.style = "padding:12px; border-bottom:1px solid #444; color:white; cursor:pointer; background:#111;";
            div.innerHTML = `<strong>${peli.title}</strong> (${peli.release_date?.split('-')[0] || '?'})`;
            div.onclick = () => {
                importarPeli(peli.id);
                contenedor.style.display = "none";
                input.value = peli.title;
            };
            contenedor.appendChild(div);
        });
    } catch (error) {
        console.error(error);
        alert("Error al conectar con el servidor de películas.");
    }
}

// 3. IMPORTAR DATOS AL FORMULARIO
async function importarPeli(id) {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/movie/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
        const p = await res.json();

        // Rellenar campos del formulario
        document.getElementById('titulo').value = p.title || '';
        document.getElementById('anio').value = p.release_date?.split('-')[0] || '';
        document.getElementById('genero').value = p.genres[0]?.name || '';
        document.getElementById('fotoPortada').value = p.poster_path ? `https://image.tmdb.org/t/p/w500${p.poster_path}` : '';

        // Director
        const dir = p.credits.crew.find(c => c.job === 'Director');
        if (dir) {
            document.getElementById('nombreDirector').value = dir.name;
            await buscarPersonaAPI(dir.name, 'director');
        }

        // Actores
        const contAct = document.getElementById('contenedor-actores');
        contAct.innerHTML = "";
        const reparto = p.credits.cast.slice(0, 4);
        
        for (let actor of reparto) {
            const actId = Date.now() + Math.random();
            agregarFilaActor(actor.name, actId);
            await buscarPersonaAPI(actor.name, 'actor', actId);
        }
        
        alert("¡Datos de la película cargados!");
    } catch (e) {
        alert("Hubo un error al obtener los detalles.");
    }
}

// 4. RESTO DE FUNCIONES (Guardado, UI, etc.)
function agregarFilaActor(nombre, id) {
    const div = document.createElement('div');
    div.className = "actor-row";
    div.id = `row-${id}`;
    div.style = "background:#222; padding:8px; margin-bottom:5px; border-radius:5px; display:flex; gap:10px; align-items:center;";
    div.innerHTML = `
        <input type="text" class="nombre-input" value="${nombre}" style="flex-grow:1; background:none; border:none; color:white; font-size:14px;">
        <input type="hidden" class="f-ac"><input type="hidden" class="b-ac"><input type="hidden" class="n-ac"><input type="hidden" class="o-ac"><input type="hidden" class="fl-ac">
        <button type="button" onclick="this.parentElement.remove()" style="color:red; background:none; border:none; font-size:18px; cursor:pointer;">✕</button>`;
    document.getElementById('contenedor-actores').appendChild(div);
}

function validarYGuardar(estado) {
    const tit = document.getElementById('titulo').value;
    if (!tit) return alert("El título es obligatorio");

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
        reparto: Array.from(document.querySelectorAll('.actor-row')).map(r => ({
            nombre: r.querySelector('.nombre-input').value,
            foto: r.querySelector('.f-ac').value,
            bio: r.querySelector('.b-ac').value,
            nac: r.querySelector('.n-ac').value,
            ori: r.querySelector('.o-ac').value,
            filmo: r.querySelector('.fl-ac').value
        }))
    };

    const tx = db.transaction("peliculas", "readwrite");
    tx.objectStore("peliculas").add(peli);
    tx.oncomplete = () => {
        document.getElementById('form-pelicula').reset();
        document.getElementById('contenedor-actores').innerHTML = "";
        irAListadoEspecial(estado);
    };
}

async function buscarPersonaAPI(nombre, tipo, actorId = null) {
    try {
        const res = await fetch(`https://api.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${encodeURIComponent(nombre)}&language=es-ES`);
        const data = await res.json();
        if (data.results?.[0]) {
            const pId = data.results[0].id;
            const detRes = await fetch(`https://api.themoviedb.org/3/person/${pId}?api_key=${API_KEY}&language=es-ES&append_to_response=combined_credits`);
            const d = await detRes.json();

            if (tipo === 'director') {
                document.getElementById('fotoDirector').value = d.profile_path ? `https://image.tmdb.org/t/p/w500${d.profile_path}` : '';
                document.getElementById('nacDirector').value = d.birthday || "";
                document.getElementById('oriDirector').value = d.place_of_birth || "";
                document.getElementById('bioDirector').value = d.biography || "";
            } else {
                const row = document.getElementById(`row-${actorId}`);
                if(row) {
                    row.querySelector('.f-ac').value = d.profile_path ? `https://image.tmdb.org/t/p/w500${d.profile_path}` : '';
                    row.querySelector('.b-ac').value = d.biography || "";
                    row.querySelector('.n-ac').value = d.birthday || "";
                    row.querySelector('.o-ac').value = d.place_of_birth || "";
                    row.querySelector('.fl-ac').value = JSON.stringify(d.combined_credits?.cast?.slice(0,10) || []);
                }
            }
        }
    } catch (e) { console.error(e); }
}

function mostrarSeccion(id) {
    document.getElementById("side-menu").classList.remove("active");
    document.querySelectorAll('.container').forEach(s => s.style.display = 'none');
    const target = id === 'listado' ? 'seccion-listado' : (id === 'inicio' ? 'seccion-inicio' : id);
    if(document.getElementById(target)) document.getElementById(target).style.display = 'block';
    if(id === 'seccion-directores') generarPersonas('director');
    if(id === 'seccion-actores') generarPersonas('actor');
}

function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    if(!lista) return;
    lista.innerHTML = "";
    if(!db) return;
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        e.target.result.filter(p => currentTab === 'todas' || p.estado === currentTab).forEach(p => {
            const div = document.createElement('div');
            div.className = "card-peli";
            div.innerHTML = `<img src="${p.fotoPortada}" style="width:100%; border-radius:8px;"><h4 style="margin:5px 0; font-size:12px;">${p.titulo}</h4>`;
            lista.appendChild(div);
        });
    };
}

function toggleMenu() { document.getElementById("side-menu").classList.toggle("active"); }
function irAListadoEspecial(e) { currentTab = e; mostrarSeccion('listado'); cargarPeliculas(); }
function agregarCampoActor() { agregarFilaActor("", Date.now()); }


