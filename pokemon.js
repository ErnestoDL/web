(function () {
  const POKEMON = "pikachu";

  function showError(msg) {
    const el = document.getElementById("pokemonMsg");
    if (!el) return;
    el.textContent = msg;
    el.style.display = "block";
  }

  document.addEventListener("DOMContentLoaded", async () => {
    const nameEl = document.getElementById("pokemonName");
    const imgEl = document.getElementById("pokemonImg");
    if (!nameEl || !imgEl) return;

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${POKEMON}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      nameEl.textContent = data.name;
      const sprite = data?.sprites?.front_default;
      if (sprite) {
        imgEl.src = sprite;
        imgEl.alt = data.name;
      } else {
        imgEl.remove();
        showError("No se encontró imagen para este Pokémon.");
      }
    } catch (e) {
      console.error("Error consultando PokeAPI:", e);
      showError("No se pudo cargar el Pokémon.");
    }
  });
})();
