const API_BASE = 'https://pokeapi.co/api/v2';

const SPECIAL_ATTACK_WAIT_TURNS = 3;
const SPECIAL_DEFENSE_WAIT_TURNS = 2;

const MISS_CHANCE_NORMAL = 0.15;
const MISS_CHANCE_SPECIAL = 0.25;
const MISS_CHANCE_DEFENSE = 0.20;

const SHIELD_HITS = 2;
const SHIELD_REDUCTION = 0.40;

// UI
const el = (id) => document.getElementById(id);

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

function titleCase(name) {
  if (!name) return '';
  return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('HTTP ' + res.status + ' al pedir ' + url);
  return await res.json();
}

function getStat(data, statName) {
  const s = data.stats.find(x => x.stat && x.stat.name === statName);
  return s ? s.base_stat : 1;
}

function getSprite(data) {
  return (
    data.sprites?.other?.['official-artwork']?.front_default ||
    data.sprites?.front_default ||
    ''
  );
}

function compactMoves(data) {
  const moves = (data.moves || []).map(m => m.move?.name).filter(Boolean);
  if (moves.length <= 40) return moves;

  const out = [];
  const used = new Set();
  while (out.length < 40 && used.size < moves.length) {
    const pick = moves[randInt(0, moves.length - 1)];
    if (!used.has(pick)) {
      used.add(pick);
      out.push(pick);
    }
  }
  return out;
}

function toFighter(data) {
  const types = (data.types || []).map(t => t.type?.name).filter(Boolean);
  return {
    id: data.id,
    name: data.name,
    displayName: titleCase(data.name),
    sprite: getSprite(data),
    types,
    stats: {
      attack: getStat(data, 'attack'),
      defense: getStat(data, 'defense'),
      spAttack: getStat(data, 'special-attack'),
      spDefense: getStat(data, 'special-defense'),
      speed: getStat(data, 'speed'),
    },
    hp: 100,

    atkWait: SPECIAL_ATTACK_WAIT_TURNS,
    defWait: SPECIAL_DEFENSE_WAIT_TURNS,

    shieldHits: 0,

    moves: compactMoves(data),
  };
}

function getRandomMoveName(fighter) {
  if (!fighter.moves || fighter.moves.length === 0) return 'Ataque';
  const mv = fighter.moves[randInt(0, fighter.moves.length - 1)];
  return titleCase(mv);
}

function computeDamage(action, attacker, defender) {
  const rng = randInt(0, 6);
  let base;

  if (action === 'specialAttack') {
    const ratio = attacker.stats.spAttack / Math.max(1, defender.stats.spDefense);
    base = 10 + ratio * 14 + rng;
    base = clamp(base, 8, 35);
  } else {
    const ratio = attacker.stats.attack / Math.max(1, defender.stats.defense);
    base = 6 + ratio * 10 + rng;
    base = clamp(base, 4, 25);
  }

  return Math.round(base);
}

function updateHpUI(prefix, fighter) {
  const fill = el(prefix + 'HpFill');
  const text = el(prefix + 'HpText');
  if (!fill || !text) return;

  const hp = clamp(fighter.hp, 0, 100);
  fill.style.width = hp + '%';
  text.textContent = hp + '%';

  fill.style.opacity = (hp <= 25) ? '0.85' : '1';
}

function updateBuffUI(prefix, fighter) {
  const buff = el(prefix + 'Buff');
  if (!buff) return;

  if (fighter.shieldHits > 0) {
    buff.textContent = `Escudo activo: reduce daño (${fighter.shieldHits} golpe(s) restantes)`;
  } else {
    buff.textContent = '';
  }
}

function setMsg(kind, text) {
  const box = el('setupMsg');
  if (!box) return;
  box.className = 'msg' + (kind ? ' ' + kind : '');
  box.textContent = text;
}

function addLogLine(text) {
  const log = el('battleLog');
  if (!log) return;
  const li = document.createElement('li');
  li.textContent = text;
  log.appendChild(li);
  li.scrollIntoView({ block: 'end' });
}

function setTurnLabel(text) {
  const t = el('turnLabel');
  if (t) t.textContent = text;
}

let state = null;

function resetBattleUI() {
  state = null;

  el('battleLog').innerHTML = '';
  el('winnerBox').hidden = true;
  el('battleArea')?.removeAttribute('hidden');

  el('btnNext').disabled = true;
  el('btnReset').disabled = true;
  el('btnStart').disabled = false;

  setTurnLabel('');
  setMsg('', '');
}

function showWinner(winner) {
  const box = el('winnerBox');
  const img = el('winnerImg');
  const name = el('winnerName');

  if (img) {
    img.src = winner.sprite;
    img.alt = winner.displayName;
  }
  if (name) name.textContent = winner.displayName;

  if (box) box.hidden = false;
}

function swapTurn() {
  state.active = (state.active === 'p1') ? 'p2' : 'p1';
  state.turn += 1;
}

function stepWaitCounters(fighter, usedSpecialAtk, usedSpecialDef) {
  if (usedSpecialAtk) fighter.atkWait = SPECIAL_ATTACK_WAIT_TURNS;
  else fighter.atkWait = Math.max(0, fighter.atkWait - 1);

  if (usedSpecialDef) fighter.defWait = SPECIAL_DEFENSE_WAIT_TURNS;
  else fighter.defWait = Math.max(0, fighter.defWait - 1);
}

function chooseAction(attacker) {
  const canSpecialAtk = attacker.atkWait === 0;
  const canSpecialDef = attacker.defWait === 0;

  const r = Math.random();

  if (canSpecialAtk && r < 0.20) return 'specialAttack';
  if (canSpecialDef && r < 0.35) return 'specialDefense';
  return 'attack';
}

function doTurn() {
  if (!state || state.finished) return;

  const attacker = state[state.active];
  const defender = state[state.active === 'p1' ? 'p2' : 'p1'];

  const action = chooseAction(attacker);
  const attackerName = attacker.displayName;
  const defenderName = defender.displayName;

  setTurnLabel(`Turno ${state.turn} — ${attackerName}`);

  let usedSpecialAtk = false;
  let usedSpecialDef = false;

  if (action === 'specialDefense') {
    usedSpecialDef = true;

    const failed = Math.random() < MISS_CHANCE_DEFENSE;
    if (failed) {
      addLogLine(`Turno ${state.turn} (${attackerName}): intentó Defensa especial… FALLÓ.`);
    } else {
      attacker.shieldHits = SHIELD_HITS;
      addLogLine(`Turno ${state.turn} (${attackerName}): usó Defensa especial. Escudo activo (${SHIELD_HITS} golpes).`);
    }
  } else {
    const isSpecial = action === 'specialAttack';
    usedSpecialAtk = isSpecial;

    const missChance = isSpecial ? MISS_CHANCE_SPECIAL : MISS_CHANCE_NORMAL;
    const failed = Math.random() < missChance;

    const attackLabel = isSpecial ? 'Ataque especial' : 'Ataque';
    const moveName = getRandomMoveName(attacker);

    if (failed) {
      addLogLine(`Turno ${state.turn} (${attackerName}): ${attackLabel} (${moveName})… FALLÓ. Vida de ${defenderName}: ${defender.hp}%.`);
    } else {
      let damage = computeDamage(action, attacker, defender);
      let note = '';

      if (defender.shieldHits > 0) {
        const reduced = Math.round(damage * (1 - SHIELD_REDUCTION));
        note = ` (escudo redujo el daño)`;
        damage = reduced;
        defender.shieldHits = Math.max(0, defender.shieldHits - 1);
      }

      defender.hp = clamp(defender.hp - damage, 0, 100);

      addLogLine(
        `Turno ${state.turn} (${attackerName}): ${attackLabel} (${moveName}). ` +
        `Daño: ${damage}%. Vida de ${defenderName}: ${defender.hp}%.${note}`
      );
    }
  }

  stepWaitCounters(attacker, usedSpecialAtk, usedSpecialDef);

  updateHpUI('p1', state.p1);
  updateHpUI('p2', state.p2);
  updateBuffUI('p1', state.p1);
  updateBuffUI('p2', state.p2);

  if (state.p1.hp <= 0 || state.p2.hp <= 0) {
    state.finished = true;

    const winner = (state.p1.hp > 0) ? state.p1 : state.p2;
    const loser = (winner === state.p1) ? state.p2 : state.p1;

    addLogLine(`FIN: ${winner.displayName} gana. ${loser.displayName} quedó en ${loser.hp}%.`);
    showWinner(winner);

    el('btnNext').disabled = true;
    return;
  }

  swapTurn();
}

async function loadDatalist() {
  const key = 'pokeIndexNames_v1';
  const cached = sessionStorage.getItem(key);
  if (cached) {
    try {
      const names = JSON.parse(cached);
      if (Array.isArray(names) && names.length > 0) {
        populateDatalist(names);
        return;
      }
    } catch {}
  }

  const data = await fetchJson(`${API_BASE}/pokemon?limit=100000&offset=0`);
  const names = (data.results || []).map(r => r.name).filter(Boolean);
  sessionStorage.setItem(key, JSON.stringify(names));
  populateDatalist(names);
}

function populateDatalist(names) {
  const dl = el('pokemonList');
  if (!dl) return;

  dl.innerHTML = '';
  const fragment = document.createDocumentFragment();

  const max = Math.min(names.length, 2000);
  for (let i = 0; i < max; i++) {
    const opt = document.createElement('option');
    opt.value = names[i];
    fragment.appendChild(opt);
  }
  dl.appendChild(fragment);
}

function sanitizeIdentifier(value) {
  const v = String(value || '').trim().toLowerCase();
  if (!v) return '';
  return v;
}

async function startBattle() {
  const p1Id = sanitizeIdentifier(el('p1Input').value);
  const p2Id = sanitizeIdentifier(el('p2Input').value);

  if (!p1Id || !p2Id) {
    setMsg('error', 'Selecciona 2 Pokémon (nombre o ID).');
    return;
  }
  if (p1Id === p2Id) {
    setMsg('error', 'Elige 2 Pokémon distintos.');
    return;
  }

  setMsg('', 'Cargando Pokémon…');
  el('btnStart').disabled = true;

  try {
    const [d1, d2] = await Promise.all([
      fetchJson(`${API_BASE}/pokemon/${encodeURIComponent(p1Id)}`),
      fetchJson(`${API_BASE}/pokemon/${encodeURIComponent(p2Id)}`),
    ]);

    const p1 = toFighter(d1);
    const p2 = toFighter(d2);

    state = {
      p1,
      p2,
      turn: 1,
      active: (p1.stats.speed >= p2.stats.speed) ? 'p1' : 'p2',
      finished: false,
    };

    el('battleArea').hidden = false;

    el('p1Img').src = p1.sprite;
    el('p1Img').alt = p1.displayName;
    el('p1Name').textContent = p1.displayName;
    el('p1Meta').textContent = `#${p1.id} • ${p1.types.map(titleCase).join(', ')}`;

    el('p2Img').src = p2.sprite;
    el('p2Img').alt = p2.displayName;
    el('p2Name').textContent = p2.displayName;
    el('p2Meta').textContent = `#${p2.id} • ${p2.types.map(titleCase).join(', ')}`;

    updateHpUI('p1', p1);
    updateHpUI('p2', p2);
    updateBuffUI('p1', p1);
    updateBuffUI('p2', p2);

    el('battleLog').innerHTML = '';
    el('winnerBox').hidden = true;

    setTurnLabel(`Turno 1 — Empieza ${state[state.active].displayName}`);

    el('btnNext').disabled = false;
    el('btnReset').disabled = false;

    setMsg('ok', 'Listo. Presiona "Siguiente turno" para avanzar.');
  } catch (err) {
    console.error(err);
    setMsg('error', 'No se pudo cargar uno de los Pokémon. Verifica el nombre/ID.');
    el('btnStart').disabled = false;
  }
}

function resetBattle() {
  state = null;
  el('battleArea').hidden = true;
  el('battleLog').innerHTML = '';
  el('winnerBox').hidden = true;
  setTurnLabel('');

  el('btnNext').disabled = true;
  el('btnReset').disabled = true;
  el('btnStart').disabled = false;
  setMsg('', '');
}

document.addEventListener('DOMContentLoaded', () => {
  loadDatalist().catch(err => console.warn('No se pudo cargar lista de Pokémon', err));

  el('btnStart').addEventListener('click', startBattle);
  el('btnNext').addEventListener('click', doTurn);
  el('btnReset').addEventListener('click', resetBattle);

  el('p1Input').addEventListener('keydown', (e) => { if (e.key === 'Enter') startBattle(); });
  el('p2Input').addEventListener('keydown', (e) => { if (e.key === 'Enter') startBattle(); });
});
