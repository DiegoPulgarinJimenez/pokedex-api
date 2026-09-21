// PokéApp — Lógica de la aplicación. Consume la PokéAPI usando fetch() y renderiza las tarjetas dinámicamente.

const API_BASE_URL = "https://pokeapi.co/api/v2";
const DEFAULT_POKEMON_COUNT = 12;
const FALLBACK_MAX_POKEMON_COUNT = 1351;
const ALL_POKEMON_LIMIT = 100000;
const SUGGESTION_LIMIT = 10;

// Total real de Pokémon disponibles (incluye formas); se actualiza con la API.
let availablePokemonCount = FALLBACK_MAX_POKEMON_COUNT;

// Nombres de todos los Pokémon para las sugerencias de búsqueda.
let allPokemonNames = [];

const searchForm = document.getElementById("search-form");
const searchInput = document.getElementById("search-input");
const suggestionsElement = document.getElementById("suggestions");
const countInput = document.getElementById("pokemon-count");
const loadButton = document.getElementById("load-button");
const evolutionToggle = document.getElementById("show-evolutions-toggle");
const statsToggle = document.getElementById("show-stats-toggle");
const typeFilter = document.getElementById("type-filter");
const generationFilter = document.getElementById("generation-filter");
const resultsContainer = document.getElementById("results-container");
const resultsCounter = document.getElementById("results-counter");
const messageElement = document.getElementById("message");
const loadingElement = document.getElementById("loading");

// Bloquea búsquedas simultáneas para evitar estados inconsistentes.
let isRequestInProgress = false;

// Indica si el usuario quiere ver la línea evolutiva en cada tarjeta.
let showEvolutions = false;

// Indica si el usuario quiere ver las estadísticas (poder + stats base).
let showStats = false;

// Lista actualmente mostrada; permite re-renderizar sin volver a consultar la API.
let currentPokemonList = [];

// Evoluciones ya cargadas de la lista actual (Map nombre -> línea evolutiva).
let currentEvolutions = null;

// Mapa de colores por tipo para las insignias.
const typeColors = {
  normal: "#a8a878",
  fire: "#f08030",
  water: "#6890f0",
  electric: "#f8d030",
  grass: "#78c850",
  ice: "#98d8d8",
  fighting: "#c03028",
  poison: "#a040a0",
  ground: "#e0c068",
  flying: "#a890f0",
  psychic: "#f85888",
  bug: "#a8b820",
  rock: "#b8a038",
  ghost: "#705898",
  dragon: "#7038f8",
  dark: "#705848",
  steel: "#b8b8d0",
  fairy: "#ee99ac",
};

// Etiquetas en español para las estadísticas base.
const statLabels = {
  hp: "PS",
  attack: "Ataque",
  defense: "Defensa",
  "special-attack": "At. Esp.",
  "special-defense": "Def. Esp.",
  speed: "Velocidad",
};

// Generaciones disponibles para el filtro.
const GENERATIONS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX"];

// Comunicación con la API

// Obtiene un Pokémon específico por nombre desde la PokéAPI.
async function fetchPokemonByName(name) {
  const response = await fetch(`${API_BASE_URL}/pokemon/${encodeURIComponent(name)}`);
  return handleApiResponse(response);
}

// Obtiene un Pokémon específico desde una URL ya dada.
async function fetchPokemonByUrl(url) {
  const response = await fetch(url);
  return handleApiResponse(response);
}

// Obtiene la lista de Pokémon (se usa para conocer el total y muestrear).
async function fetchPokemonList(limit) {
  const response = await fetch(`${API_BASE_URL}/pokemon?limit=${limit}`);
  return handleApiResponse(response);
}

// Obtiene los datos de la especie (generación, legendario, cadena evolutiva).
async function fetchPokemonSpecies(url) {
  const response = await fetch(url);
  return handleApiResponse(response);
}

// Obtiene la cadena evolutiva completa de una URL.
async function fetchEvolutionChain(url) {
  const response = await fetch(url);
  return handleApiResponse(response);
}

// Convierte una respuesta de fetch en datos o lanza un error descriptivo.
async function handleApiResponse(response) {
  if (!response.ok) {
    // 404 significa que el Pokémon no existe.
    if (response.status === 404) {
      const error = new Error("Not Found");
      error.isNotFound = true;
      throw error;
    }
    throw new Error(`Error de la API: ${response.status}`);
  }
  return response.json();
}

// Extracción de datos

// Normaliza los datos de la API (Pokémon + especie) a un objeto simple.
function mapPokemonData(data, species) {
  const stats = (data.stats || []).map((entry) => ({
    name: statLabels[entry.stat.name] || entry.stat.name,
    value: entry.base_stat,
  }));
  const totalStats = stats.reduce((sum, stat) => sum + stat.value, 0);

  return {
    name: data.name,
    image: getPokemonImage(data),
    types: data.types.map((typeEntry) => typeEntry.type.name),
    generation: getGenerationName(species),
    isLegendary: Boolean(species?.is_legendary),
    evolutionChainUrl: species?.evolution_chain?.url || null,
    stats,
    totalStats,
  };
}

// Consulta la especie y arma el objeto final de un Pokémon.
async function fetchAndMapPokemon(data) {
  const species = await fetchPokemonSpecies(data.species.url);
  return mapPokemonData(data, species);
}

// Convierte "generation-i" en "I", "generation-ii" en "II", etc.
function getGenerationName(species) {
  const name = species?.generation?.name || "";
  return name.replace("generation-", "").toUpperCase();
}

// Prioriza el arte oficial; si no existe, usa el sprite frontal clásico.
function getPokemonImage(data) {
  return (
    data.sprites?.other?.["official-artwork"]?.front_default ||
    data.sprites?.front_default ||
    ""
  );
}

// Recorre la cadena evolutiva y acumula los nombres en orden.
function collectEvolutionNames(node, names) {
  names.push(node.species.name);
  node.evolves_to.forEach((child) => collectEvolutionNames(child, names));
}

// Obtiene la línea evolutiva completa (nombre + imagen) de un Pokémon.
async function fetchEvolutionLine(url) {
  const data = await fetchEvolutionChain(url);
  const names = [];
  collectEvolutionNames(data.chain, names);

  // Cada especie se consulta para recuperar su imagen.
  return Promise.all(
    names.map(async (name) => {
      try {
        const pokemon = await fetchPokemonByName(name);
        return { name: pokemon.name, image: getPokemonImage(pokemon) };
      } catch (error) {
        // Si una especie no tiene un Pokémon homónimo, se muestra solo el nombre.
        return { name, image: "" };
      }
    })
  );
}

// Obtiene las evoluciones de una lista (Map nombre -> línea evolutiva).
async function fetchEvolutions(pokemonList) {
  const entries = await Promise.all(
    pokemonList.map(async (pokemon) => {
      const line = pokemon.evolutionChainUrl
        ? await fetchEvolutionLine(pokemon.evolutionChainUrl)
        : null;
      return [pokemon.name, line];
    })
  );
  return new Map(entries);
}

// Elige count entradas al azar (sin repetir) de una lista.
function getRandomItems(items, count) {
  const total = Math.min(count, items.length);
  const indexes = new Set();
  while (indexes.size < total) {
    indexes.add(Math.floor(Math.random() * items.length));
  }
  return [...indexes].map((index) => items[index]);
}

// Devuelve los nombres de todos los Pokémon (para las sugerencias).
async function fetchAllPokemonNames() {
  const data = await fetchPokemonList(ALL_POKEMON_LIMIT);
  return data.results.map((item) => item.name);
}

// Lee y valida la cantidad de Pokémon elegida por el usuario.
function getInitialCount() {
  const value = parseInt(countInput.value, 10);
  if (Number.isNaN(value)) {
    return DEFAULT_POKEMON_COUNT;
  }
  return Math.min(Math.max(value, 1), availablePokemonCount);
}

// Renderizado del DOM

// Aplica los filtros de tipo y generación sobre la lista cargada.
function applyFilters(pokemonList) {
  const selectedType = typeFilter.value;
  const selectedGeneration = generationFilter.value;

  return pokemonList.filter(
    (pokemon) =>
      (!selectedType || pokemon.types.includes(selectedType)) &&
      (!selectedGeneration || pokemon.generation === selectedGeneration)
  );
}

// Renderiza la lista cargada aplicando los filtros actuales.
function renderCurrentList() {
  const filteredList = applyFilters(currentPokemonList);

  clearResults();
  filteredList.forEach((pokemon) => {
    const evolutionLine = currentEvolutions ? currentEvolutions.get(pokemon.name) : null;
    resultsContainer.appendChild(createPokemonCard(pokemon, evolutionLine));
  });
  updateCounter(filteredList.length);

  // Sin resultados por los filtros, se muestra un mensaje contextual.
  if (filteredList.length === 0) {
    showInfo("No hay Pokémon que coincidan con los filtros seleccionados.");
  } else {
    hideMessage();
  }
}

// Consulta las evoluciones (si están activadas) y actualiza el estado.
async function fetchAndRender(pokemonList) {
  currentPokemonList = pokemonList;
  currentEvolutions = showEvolutions ? await fetchEvolutions(pokemonList) : null;
  renderCurrentList();
}

// Crea una tarjeta individual (article) a partir de los datos del Pokémon.
function createPokemonCard(pokemon, evolutionLine) {
  const card = document.createElement("article");
  card.classList.add("card");

  const image = document.createElement("img");
  image.classList.add("card__image");
  image.src = pokemon.image;
  image.alt = `Imagen de ${pokemon.name}`;
  image.loading = "lazy";

  const body = document.createElement("div");
  body.classList.add("card__body");

  const name = document.createElement("h3");
  name.classList.add("card__name");
  name.textContent = pokemon.name;

  const generation = document.createElement("p");
  generation.classList.add("card__generation");
  generation.textContent = `Gen ${pokemon.generation}`;

  const typesContainer = document.createElement("div");
  typesContainer.classList.add("card__types");

  pokemon.types.forEach((type) => {
    const badge = document.createElement("span");
    badge.classList.add("badge");
    badge.textContent = capitalize(type);
    badge.style.backgroundColor = typeColors[type] || "#9ca3af";
    typesContainer.appendChild(badge);
  });

  const bodyContent = [name, generation];

  if (showStats) {
    bodyContent.push(createPowerElement(pokemon.totalStats));
  }

  bodyContent.push(typesContainer);

  if (showStats) {
    bodyContent.push(createStatsSection(pokemon.stats));
  }

  body.append(...bodyContent);

  if (pokemon.isLegendary) {
    const legendaryBadge = document.createElement("span");
    legendaryBadge.classList.add("badge", "badge--legendary");
    legendaryBadge.textContent = "Legendario";
    body.appendChild(legendaryBadge);
  }

  if (evolutionLine && evolutionLine.length > 1) {
    body.appendChild(createEvolutionRow(evolutionLine));
  }

  card.append(image, body);
  return card;
}

// Crea la línea destacada con el poder total (suma de stats base).
function createPowerElement(totalStats) {
  const power = document.createElement("p");
  power.classList.add("card__power");
  power.textContent = `Poder: ${totalStats}`;
  return power;
}

// Crea la sección con las 6 estadísticas base (etiqueta + valor).
function createStatsSection(stats) {
  const container = document.createElement("div");
  container.classList.add("card__stats");

  stats.forEach((stat) => {
    const label = document.createElement("span");
    label.classList.add("card__stat-label");
    label.textContent = stat.name;

    const value = document.createElement("span");
    value.classList.add("card__stat-value");
    value.textContent = stat.value;

    container.append(label, value);
  });

  return container;
}

// Crea la fila de etapas evolutivas (mini tarjetas separadas por flechas).
function createEvolutionRow(evolutionLine) {
  const container = document.createElement("div");
  container.classList.add("card__evolution-row");

  evolutionLine.forEach((stage, index) => {
    if (index > 0) {
      const arrow = document.createElement("span");
      arrow.classList.add("card__evolution-arrow");
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = "→";
      container.appendChild(arrow);
    }
    container.appendChild(createEvolutionStage(stage));
  });

  return container;
}

// Crea una mini tarjeta con la imagen y el nombre de una etapa evolutiva.
function createEvolutionStage(stage) {
  const stageElement = document.createElement("div");
  stageElement.classList.add("card__evolution-stage");

  if (stage.image) {
    const image = document.createElement("img");
    image.classList.add("card__evolution-image");
    image.src = stage.image;
    image.alt = `Imagen de ${stage.name}`;
    image.loading = "lazy";
    stageElement.appendChild(image);
  }

  const name = document.createElement("span");
  name.classList.add("card__evolution-name");
  name.textContent = stage.name;
  stageElement.appendChild(name);

  return stageElement;
}

// Actualiza el contador de Pokémon mostrados.
function updateCounter(count) {
  resultsCounter.textContent = count === 1 ? "Mostrando 1 Pokémon" : `Mostrando ${count} Pokémon`;
}

// Estados de la interfaz

function showLoading() {
  loadingElement.hidden = false;
  hideMessage();
  clearResults();
  updateCounter(0);
}

function hideLoading() {
  loadingElement.hidden = true;
}

// Muestra un mensaje informativo o de error según corresponda.
function showError(text) {
  showMessage(text, "error");
}

function showInfo(text) {
  showMessage(text, "info");
}

function showMessage(text, type) {
  messageElement.textContent = text;
  messageElement.classList.remove("message--error", "message--info");
  messageElement.classList.add(`message--${type}`, "message--visible");
}

function hideMessage() {
  messageElement.textContent = "";
  messageElement.classList.remove("message--error", "message--info", "message--visible");
}

function clearResults() {
  resultsContainer.innerHTML = "";
}

// Habilita o deshabilita los controles durante una petición.
function setControlsDisabled(disabled) {
  searchInput.disabled = disabled;
  countInput.disabled = disabled;
  loadButton.disabled = disabled;
  evolutionToggle.disabled = disabled;
  statsToggle.disabled = disabled;
  typeFilter.disabled = disabled;
  generationFilter.disabled = disabled;
  searchForm.querySelector('button[type="submit"]').disabled = disabled;
}

// Flujos principales

// Carga inicial: elige Pokémon aleatorios y renderiza sus tarjetas.
async function loadInitialPokemon() {
  if (isRequestInProgress) {
    return;
  }

  // Limpia el campo de búsqueda y los filtros para que actúe como reinicio.
  searchInput.value = "";
  hideSuggestions();
  typeFilter.value = "";
  generationFilter.value = "";

  showLoading();
  setControlsDisabled(true);
  isRequestInProgress = true;
  try {
    const list = await fetchPokemonList(ALL_POKEMON_LIMIT);
    allPokemonNames = list.results.map((item) => item.name);
    availablePokemonCount = list.results.length;
    countInput.max = availablePokemonCount;
    const selected = getRandomItems(list.results, getInitialCount());
    const details = await Promise.all(selected.map((item) => fetchPokemonByUrl(item.url)));
    const pokemonList = await Promise.all(details.map(fetchAndMapPokemon));
    await fetchAndRender(pokemonList);
  } catch (error) {
    console.error("Error al cargar la lista inicial:", error);
    showError("No fue posible conectarse con la PokéAPI. Intenta nuevamente.");
  } finally {
    hideLoading();
    setControlsDisabled(false);
    isRequestInProgress = false;
  }
}

// Búsqueda por nombre: normaliza la entrada y consulta la API.
async function handleSearch(event) {
  event.preventDefault();

  hideSuggestions();

  if (isRequestInProgress) {
    return;
  }

  const query = normalizeQuery(searchInput.value);

  if (!query) {
    showError("Por favor, ingresa el nombre de un Pokémon.");
    clearResults();
    updateCounter(0);
    return;
  }

  // Una búsqueda nueva reinicia los filtros.
  typeFilter.value = "";
  generationFilter.value = "";

  showLoading();
  setControlsDisabled(true);
  isRequestInProgress = true;
  try {
    const data = await fetchPokemonByName(query);
    const pokemon = await fetchAndMapPokemon(data);
    await fetchAndRender([pokemon]);
  } catch (error) {
    console.error("Error al buscar el Pokémon:", error);
    if (error.isNotFound) {
      showError("No encontramos ese Pokémon. Verifica el nombre e inténtalo nuevamente.");
    } else {
      showError("No fue posible conectarse con PokéAPI. Intenta nuevamente.");
    }
    clearResults();
    updateCounter(0);
  } finally {
    hideLoading();
    setControlsDisabled(false);
    isRequestInProgress = false;
  }
}

// Quita espacios sobrantes y normaliza mayúsculas/minúsculas.
function normalizeQuery(value) {
  return value.trim().toLowerCase();
}

// Activa o desactiva la visualización de evoluciones en las tarjetas.
async function handleEvolutionToggle() {
  showEvolutions = evolutionToggle.checked;

  if (!currentPokemonList.length) {
    return;
  }

  // Al desactivar no hay que consultar la API: se re-renderiza sin evoluciones.
  if (!showEvolutions) {
    currentEvolutions = null;
    renderCurrentList();
    return;
  }

  showLoading();
  setControlsDisabled(true);
  isRequestInProgress = true;
  try {
    currentEvolutions = await fetchEvolutions(currentPokemonList);
    renderCurrentList();
  } catch (error) {
    console.error("Error al cargar las evoluciones:", error);
    showError("No fue posible cargar las evoluciones. Intenta nuevamente.");
    currentEvolutions = null;
    renderCurrentList();
  } finally {
    hideLoading();
    setControlsDisabled(false);
    isRequestInProgress = false;
  }
}

// Convierte la primera letra en mayúscula (para nombres de tipos).
function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// Rellena el selector de tipos a partir del mapa de colores.
function populateTypeFilter() {
  Object.keys(typeColors).forEach((type) => {
    const option = document.createElement("option");
    option.value = type;
    option.textContent = capitalize(type);
    typeFilter.appendChild(option);
  });
}

// Rellena el selector de generaciones.
function populateGenerationFilter() {
  GENERATIONS.forEach((generation) => {
    const option = document.createElement("option");
    option.value = generation;
    option.textContent = `Generación ${generation}`;
    generationFilter.appendChild(option);
  });
}

// Aplica el filtro de tipo sobre la lista actual.
function handleTypeFilterChange() {
  renderCurrentList();
}

// Aplica el filtro de generación sobre la lista actual.
function handleGenerationFilterChange() {
  renderCurrentList();
}

// Muestra u oculta las estadísticas (poder + stats base) en las tarjetas.
function handleStatsToggle() {
  showStats = statsToggle.checked;
  renderCurrentList();
}

// Sugerencias de búsqueda por nombre.

// Maneja la escritura en el campo de búsqueda y muestra sugerencias.
async function handleSearchInput() {
  const query = normalizeQuery(searchInput.value);

  if (!query) {
    hideSuggestions();
    return;
  }

  // Carga los nombres una sola vez (si aún no están disponibles).
  if (allPokemonNames.length === 0) {
    try {
      allPokemonNames = await fetchAllPokemonNames();
    } catch (error) {
      console.error("Error al cargar las sugerencias:", error);
      return;
    }
  }

  const matches = allPokemonNames
    .filter((name) => name.startsWith(query))
    .slice(0, SUGGESTION_LIMIT);

  if (matches.length === 0) {
    hideSuggestions();
    return;
  }

  renderSuggestions(matches);
}

// Renderiza la lista de sugerencias bajo el campo de búsqueda.
function renderSuggestions(matches) {
  suggestionsElement.innerHTML = "";

  matches.forEach((name) => {
    const item = document.createElement("li");
    item.classList.add("suggestions__item");
    item.setAttribute("role", "option");

    const button = document.createElement("button");
    button.type = "button";
    button.classList.add("suggestions__button");
    button.textContent = name;
    // mousedown se dispara antes que blur, garantizando que el clic se registre.
    button.addEventListener("mousedown", (event) => {
      event.preventDefault();
      selectSuggestion(name);
    });

    item.appendChild(button);
    suggestionsElement.appendChild(item);
  });

  suggestionsElement.hidden = false;
}

// Al elegir una sugerencia se rellena el campo y se ejecuta la búsqueda.
function selectSuggestion(name) {
  searchInput.value = name;
  hideSuggestions();
  searchForm.requestSubmit();
}

// Oculta y vacía la lista de sugerencias.
function hideSuggestions() {
  suggestionsElement.hidden = true;
  suggestionsElement.innerHTML = "";
}

// Inicialización

populateTypeFilter();
populateGenerationFilter();
searchForm.addEventListener("submit", handleSearch);
searchInput.addEventListener("input", handleSearchInput);
searchInput.addEventListener("blur", () => setTimeout(hideSuggestions, 150));
loadButton.addEventListener("click", loadInitialPokemon);
evolutionToggle.addEventListener("change", handleEvolutionToggle);
statsToggle.addEventListener("change", handleStatsToggle);
typeFilter.addEventListener("change", handleTypeFilterChange);
generationFilter.addEventListener("change", handleGenerationFilterChange);

loadInitialPokemon();
