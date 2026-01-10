let db;
let currentTab = 'todas';
const request = indexedDB.open("CineTrackDB", 2); // Subimos versión para nuevos campos

request.onsuccess = (e) => { db = e.target.result; cargarPeliculas(); };
request.onupgradeneeded = (e) => {
    db = e.target.result;
    if (!db.objectStoreNames.contains("peliculas")) {
        db.createObjectStore("peliculas", { keyPath: "id", autoIncrement: true });
    }
};

function validarYGuardar(estado) {
    const id = document.getElementById('edit-id').value;
    const peli = {
        titulo: document.getElementById('titulo').value,
        nombreDirector: document.getElementById('nombreDirector').value,
        fotoDirector: document.getElementById('fotoDirector').value,
        actores: document.getElementById('actores').value, // Lista separada por comas
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
        alert("Guardado!");
        document.getElementById('form-pelicula').reset();
        document.getElementById('edit-id').value = "";
        mostrarSeccion('listado');
    };
}

function cargarPeliculas() {
    const lista = document.getElementById('lista-peliculas');
    const busqueda = document.getElementById('buscador').value.toLowerCase();
    lista.innerHTML = "";
    
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        let pelis = e.target.result;
        
        // Filtrar por Tab y Buscador
        pelis.filter(p => {
            const matchesTab = currentTab === 'todas' || p.estado === currentTab;
            const matchesBusqueda = p.titulo.toLowerCase().includes(busqueda) || (p.actores && p.actores.toLowerCase().includes(busqueda));
            return matchesTab && matchesBusqueda;
        }).forEach(p => {
            const div = document.createElement('div');
            div.className = 'card-peli';
            div.innerHTML = `
                <img src="${p.fotoActor || 'https://via.placeholder.com/150'}" class="img-peli" onclick="ampliar('${p.fotoActor}')">
                <div style="padding:10px;">
                    <h4>${p.titulo}</h4>
                    <div style="display:flex; justify-content:space-between; margin-top:10px;">
                        <button onclick="editar(${p.id})" style="background:none; border:none; color:cyan;">✏️</button>
                        <button onclick="eliminar(${p.id})" style="background:none; border:none; color:red;">🗑️</button>
                    </div>
                </div>
            `;
            lista.appendChild(div);
        });
    };
}

function eliminar(id) {
    if(confirm("¿Borrar película?")) {
        db.transaction("peliculas", "readwrite").objectStore("peliculas").delete(id).onsuccess = () => cargarPeliculas();
    }
}

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
        document.getElementById('form-title').innerText = "Editando: " + p.titulo;
    };
}

function ampliar(src) {
    if(!src) return;
    document.getElementById('modal-img').style.display = 'flex';
    document.getElementById('img-ampliada').src = src;
}

function abrirEstadisticas() {
    mostrarSeccion('pantalla-estadisticas');
    db.transaction("peliculas").objectStore("peliculas").getAll().onsuccess = (e) => {
        const p = e.target.result;
        const totalMins = p.reduce((a, b) => a + (b.duracion || 0), 0);
        const media = p.reduce((a, b) => a + (b.nota || 0), 0) / (p.length || 1);
        
        // Frecuencias
        const plat = p.reduce((acc, p) => { acc[p.plataforma] = (acc[p.plataforma] || 0) + 1; return acc; }, {});
        const gen = p.reduce((acc, p) => { acc[p.genero] = (acc[p.genero] || 0) + 1; return acc; }, {});

        document.getElementById('stats-content').innerHTML = `
            <div class="persona-card">
                <h3>Resumen General</h3>
                <p>🎬 Total: ${p.length} películas</p>
                <p>🕒 Tiempo: ${Math.floor(totalMins/60)}h ${totalMins%60}min</p>
                <p>⭐ Nota Media: ${media.toFixed(1)}</p>
            </div>
            <div class="persona-card">
                <h3>Top Plataforma: ${Object.keys(plat).sort((a,b) => plat[b]-plat[a])[0] || '-'}</h3>
                <h3>Top Género: ${Object.keys(gen).sort((a,b) => gen[b]-gen[a])[0] || '-'}</h3>
            </div>
        `;
    };
}
// Las funciones de toggleMenu, exportar, importar y mostrarSeccion se mantienen igual que el código anterior.

