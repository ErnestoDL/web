(function () {
  const API = 'https://pokeapi.co/api/v2';

  const $ = (id) => document.getElementById(id);

  const grid = $('pokedexGrid');
  const statusEl = $('pokedexStatus');
  const nameInput = $('filterName');
  const idInput = $('filterId');
  const typeSelect = $('filterType');
  const clearBtn = $('btnClearFilters');

  if (!grid || !statusEl || !nameInput || !idInput || !typeSelect || !clearBtn) return;

  /** @type {{id:number,name:string,url:string}[]} */
  let indexList = [];

  const cacheMini = new Map();

  /** @type {Set<number> | null} */
  let typeIdSet = null;
  let currentType = '';

  const MAX_IN_FLIGHT = 8;
  let inFlight = 0;
  const queue = [];

  function setStatus(text) {
    statusEl.textContent = text || '';
  }

  function extractIdFromUrl(url) {
    const m = String(url).match(/\/pokemon\/(\d+)\/?$/);
    return m ? Number(m[1]) : NaN;
  }

  function spriteUrlById(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  }

  function readMiniCache() {
    try {
      const raw = localStorage.getItem('pokedexMini_v1');
      if (!raw) return;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return;
      Object.values(obj).forEach((p) => {
        if (p && typeof p.id === 'number') cacheMini.set(p.id, p);
      });
    } catch {
    }
  }

  function writeMiniCache() {
    try {
      const obj = {};
      cacheMini.forEach((v, k) => {
        obj[k] = {
          id: v.id,
          name: v.name,
          types: v.types,
          height: v.height,
          weight: v.weight,
          sprite: v.sprite,
        };
      });
      localStorage.setItem('pokedexMini_v1', JSON.stringify(obj));
    } catch {
    }
  }

  function normalize(str) {
    return String(str || '').trim().toLowerCase();
  }

  function getActiveFilters() {
    const name = normalize(nameInput.value);
    const idVal = normalize(idInput.value);
    const id = idVal ? Number(idVal) : null;
    const type = normalize(typeSelect.value);
    return { name, id, type };
  }

  // --- Render tarjetas ---
  function createCard(p) {
    const card = document.createElement('article');
    card.className = 'card';
    card.dataset.id = String(p.id);
    card.dataset.name = p.name;

    card.innerHTML = `
      <div class="card-top">
        <img class="poke-img" src="${spriteUrlById(p.id)}" alt="${p.name}" loading="lazy" />
        <div class="card-meta">
          <div class="poke-name">${p.name}</div>
          <div class="poke-id">#${p.id}</div>
        </div>
      </div>

      <div class="card-body">
        <div class="types" data-types>Tipos: <span class="muted">cargando…</span></div>
        <div class="stats" data-stats>
          <span class="muted">Altura y peso: cargando…</span>
        </div>
      </div>
    `;

    return card;
  }

  function renderAllCards(list) {
    grid.innerHTML = '';

    const frag = document.createDocumentFragment();
    list.forEach((p) => frag.appendChild(createCard(p)));
    grid.appendChild(frag);

    list.forEach((p) => {
      const mini = cacheMini.get(p.id);
      if (mini) fillCard(p.id, mini);
    });

    observeCards();
  }

  function fillCard(id, mini) {
    const card = grid.querySelector(`.card[data-id="${id}"]`);
    if (!card) return;

    const typesEl = card.querySelector('[data-types]');
    if (typesEl && Array.isArray(mini.types) && mini.types.length) {
      typesEl.innerHTML = `Tipos: ${mini.types.map(t => `<span class="badge">${t}</span>`).join(' ')}`;
    }

    const statsEl = card.querySelector('[data-stats]');
    if (statsEl && (mini.height || mini.weight)) {
      statsEl.innerHTML = `Altura: <strong>${mini.height ?? '-'}</strong> · Peso: <strong>${mini.weight ?? '-'}</strong>`;
    }

    const img = card.querySelector('img.poke-img');
    if (img && mini.sprite) img.src = mini.sprite;
  }

  function enqueue(fn) {
    queue.push(fn);
    pumpQueue();
  }

  function pumpQueue() {
    while (inFlight < MAX_IN_FLIGHT && queue.length) {
      const fn = queue.shift();
      inFlight++;
      Promise.resolve()
        .then(fn)
        .catch(() => {})
        .finally(() => {
          inFlight--;
          pumpQueue();
        });
    }
  }

  async function fetchPokemonMiniByUrl(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const id = data.id;
    const name = data.name;
    const types = (data.types || []).map(t => t.type?.name).filter(Boolean);
    const height = data.height;
    const weight = data.weight;
    const sprite = data?.sprites?.front_default || spriteUrlById(id);

    return { id, name, types, height, weight, sprite };
  }

  function ensureDetails(p) {
    if (cacheMini.has(p.id)) {
      fillCard(p.id, cacheMini.get(p.id));
      return;
    }

    enqueue(async () => {
      try {
        const mini = await fetchPokemonMiniByUrl(p.url);
        cacheMini.set(mini.id, mini);
        fillCard(mini.id, mini);
        if (cacheMini.size % 25 === 0) writeMiniCache();
      } catch (e) {
        console.warn('No se pudo cargar detalles de', p.name, e);
      }
    });
  }

  let observer = null;

  function observeCards() {
    if (observer) observer.disconnect();

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const card = entry.target;
        observer.unobserve(card);

        const id = Number(card.dataset.id);
        const p = indexList.find(x => x.id === id);
        if (p) ensureDetails(p);
      });
    }, { root: null, rootMargin: '200px', threshold: 0.01 });

    grid.querySelectorAll('.card').forEach((card) => observer.observe(card));
  }

  async function loadTypes() {
    const res = await fetch(`${API}/type`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    (data.results || []).forEach((t) => {
      const opt = document.createElement('option');
      opt.value = t.name;
      opt.textContent = t.name;
      typeSelect.appendChild(opt);
    });
  }

  async function loadTypeSet(typeName) {
    if (!typeName) {
      typeIdSet = null;
      currentType = '';
      return;
    }

    if (typeIdSet && currentType === typeName) return;

    setStatus('Cargando filtro por tipo…');

    const res = await fetch(`${API}/type/${typeName}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    const set = new Set();
    (data.pokemon || []).forEach((item) => {
      const url = item?.pokemon?.url;
      const id = extractIdFromUrl(url);
      if (!Number.isNaN(id)) set.add(id);
    });

    typeIdSet = set;
    currentType = typeName;
  }

  async function applyFilters() {
    const { name, id, type } = getActiveFilters();

    try {
      await loadTypeSet(type);
    } catch (e) {
      console.error('Error cargando tipos:', e);
      typeIdSet = null;
      currentType = '';
    }

    let filtered = indexList;

    if (id) {
      filtered = filtered.filter(p => p.id === id);
    }

    if (name) {
      filtered = filtered.filter(p => p.name.includes(name));
    }

    if (typeIdSet) {
      filtered = filtered.filter(p => typeIdSet.has(p.id));
    }

    setStatus(`Mostrando ${filtered.length} Pokémon.`);
    renderAllCards(filtered);
  }

  function clearFilters() {
    nameInput.value = '';
    idInput.value = '';
    typeSelect.value = '';
    typeIdSet = null;
    currentType = '';
    applyFilters();
  }

  async function init() {
    readMiniCache();

    setStatus('Cargando índice de Pokémon…');

    try {
      await loadTypes();
    } catch (e) {
      console.warn('No se pudieron cargar los tipos:', e);
    }

    const res = await fetch(`${API}/pokemon?limit=100000&offset=0`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    indexList = (data.results || [])
      .map((r) => {
        const id = extractIdFromUrl(r.url);
        return { id, name: r.name, url: r.url };
      })
      .filter((p) => !Number.isNaN(p.id))
      .sort((a, b) => a.id - b.id);

    setStatus(`Listo. Total: ${indexList.length} Pokémon.`);

    renderAllCards(indexList);

    nameInput.addEventListener('input', debounce(applyFilters, 250));
    idInput.addEventListener('input', debounce(applyFilters, 250));
    typeSelect.addEventListener('change', applyFilters);
    clearBtn.addEventListener('click', clearFilters);

    window.addEventListener('beforeunload', () => writeMiniCache());
  }

  function debounce(fn, waitMs) {
    let t = null;
    return function () {
      window.clearTimeout(t);
      t = window.setTimeout(() => fn(), waitMs);
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    init().catch((e) => {
      console.error('Error inicializando Pokédex:', e);
      setStatus('No se pudo cargar la Pokédex.');
    });
  });
})();
