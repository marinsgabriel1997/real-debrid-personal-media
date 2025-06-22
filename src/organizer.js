/**
 * Módulo para gerenciar a lógica do painel Organizador.
 */
import { saveMediaLibrary, getMediaLibrary, getTmdbApiKey } from "./config.js";
import { getMediaInfoFromTmdb } from "./api.js";

// Mantém o estado da biblioteca em memória para evitar leituras constantes do localStorage
let seriesLibrary = getMediaLibrary("series") || {};
let movieLibrary = getMediaLibrary("movies") || {};

function getDOMElements() {
  return {
    // Selects
    mediaTypeSelect: document.getElementById("media-type-select"),
    collectionSelect: document.getElementById("media-select-input"),
    // Organizers
    seriesOrganizer: document.getElementById("series-organizer"),
    movieOrganizer: document.getElementById("movie-organizer"),
    // Series specific
    addSeasonBtn: document.getElementById("add-season-btn"),
    seriesForm: document.querySelector("#series-organizer .media-form"),
    seriesNameInput: document.getElementById("series-name-input"),
    seriesImdbIdInput: document.getElementById("series-imdb-id-input"),
    saveSeriesBtn: document.getElementById("save-series-btn"),
    seasonList: document.querySelector("#series-organizer .season-list"),
    // Movie specific
    addMovieBtn: document.getElementById("add-movie-btn"),
    movieForm: document.querySelector("#movie-organizer .media-form"),
  };
}

function handleMediaTypeChange() {
  const { mediaTypeSelect, seriesOrganizer, movieOrganizer, collectionSelect } =
    getDOMElements();
  const selectedType = mediaTypeSelect.value;

  // Alterna a visibilidade dos painéis
  seriesOrganizer.style.display = selectedType === "series" ? "block" : "none";
  movieOrganizer.style.display = selectedType === "movies" ? "block" : "none";

  // Limpa e popula o segundo select com base no tipo
  collectionSelect.innerHTML =
    '<option value="new" selected>Cadastrar Nova...</option>';
  const library = selectedType === "series" ? seriesLibrary : movieLibrary;
  for (const id in library) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = library[id].name;
    collectionSelect.appendChild(option);
  }

  // Adiciona o listener para a mudança de coleção
  collectionSelect.addEventListener("change", handleCollectionChange);

  // Dispara o evento para carregar o estado inicial
  handleCollectionChange();
}

function handleAddSeason() {
  const { seriesOrganizer } = getDOMElements();
  const seasonList = seriesOrganizer.querySelector(".season-list");
  const seasonCount = seasonList.children.length;

  const newSeason = document.createElement("li");
  newSeason.className = "season-item";
  newSeason.innerHTML = `
        <div class="season-title">Temporada ${seasonCount + 1}</div>
        <ul class="episode-list">
            <li class="drop-zone">Arraste um episódio aqui</li>
        </ul>
    `;
  seasonList.appendChild(newSeason);
}

function handleAddMovie() {
  const { movieOrganizer } = getDOMElements();
  const movieList = movieOrganizer.querySelector(".episode-list");
  const newDropZone = document.createElement("li");
  newDropZone.className = "drop-zone";
  newDropZone.textContent = `Arraste um filme aqui`;
  movieList.appendChild(newDropZone);
}

function initDragAndDrop() {
  const organizer = document.querySelector(".organizer-content");

  organizer.addEventListener("dragover", (e) => {
    if (e.target.classList.contains("drop-zone")) {
      e.preventDefault();
      e.target.classList.add("drag-over");
    }
  });

  organizer.addEventListener("dragleave", (e) => {
    if (e.target.classList.contains("drop-zone")) {
      e.target.classList.remove("drag-over");
    }
  });

  organizer.addEventListener("drop", (e) => {
    e.preventDefault();
    if (
      e.target.classList.contains("drop-zone") &&
      !e.target.classList.contains("filled")
    ) {
      e.target.classList.remove("drag-over");

      const data = JSON.parse(e.dataTransfer.getData("application/json"));
      const mediaType = getDOMElements().mediaTypeSelect.value;

      e.target.classList.add("filled");

      if (mediaType === "movies") {
        e.target.innerHTML = `
                    <div class="file-info">
                        <span class="file-name" title="${data.fileName}">${data.fileName}</span>
                        <input type="text" class="imdb-input" placeholder="IMDb ID do Filme">
                    </div>
                    <button class="remove-file" title="Remover arquivo">x</button>
                `;
      } else {
        e.target.innerHTML = `
                    <span class="file-name" title="${data.fileName}">${data.fileName}</span>
                    <button class="remove-file" title="Remover arquivo">x</button>
                `;
      }

      e.target.dataset.torrentId = data.torrentId;
      e.target.dataset.fileLink = data.fileLink;

      // Adiciona uma nova zona de soltura
      const episodeList = e.target.parentElement;
      if (episodeList) {
        const newDropZone = document.createElement("li");
        newDropZone.className = "drop-zone";
        newDropZone.textContent = `Arraste um ${
          mediaType === "series" ? "episódio" : "filme"
        } aqui`;
        episodeList.appendChild(newDropZone);
      }
    }
  });

  organizer.addEventListener("click", (e) => {
    if (e.target.classList.contains("remove-file")) {
      const dropZone = e.target.closest(".drop-zone");
      if (dropZone && dropZone.classList.contains("filled")) {
        dropZone.remove();
      }
    }
  });
}

async function handleImdbIdBlur() {
  const { seriesImdbIdInput, seriesNameInput } = getDOMElements();
  const imdbId = seriesImdbIdInput.value.trim();
  const tmdbApiKey = getTmdbApiKey();

  if (!imdbId) return;
  if (!tmdbApiKey) {
    alert("Chave da API do TMDB não configurada. Preencha o nome manualmente.");
    return;
  }

  try {
    const mediaInfo = await getMediaInfoFromTmdb(tmdbApiKey, imdbId);
    // O nome da série vem em 'name' para TV e 'title' para filmes.
    seriesNameInput.value =
      mediaInfo.name || mediaInfo.title || "Nome não encontrado";
  } catch (error) {
    alert(`Não foi possível buscar o nome da série: ${error.message}`);
    seriesNameInput.value = ""; // Limpa para preenchimento manual
  }
}

function loadSeriesView(seriesData) {
  const { seriesNameInput, seriesImdbIdInput, seasonList } = getDOMElements();

  seriesNameInput.value = seriesData.name || "";
  seriesImdbIdInput.value = seriesData.id || "";
  seasonList.innerHTML = ""; // Limpa as temporadas existentes

  if (seriesData.seasons) {
    Object.keys(seriesData.seasons)
      .sort((a, b) => a - b)
      .forEach((seasonNumber) => {
        const seasonData = seriesData.seasons[seasonNumber];
        const seasonItem = document.createElement("li");
        seasonItem.className = "season-item";

        const episodeList = document.createElement("ul");
        episodeList.className = "episode-list";

        const filledEpisodes = Object.keys(seasonData.files).map((fileLink) => {
          const fileData = seasonData.files[fileLink];
          return `<li class="drop-zone filled" data-torrent-id="${fileData.torrentId}" data-file-link="${fileLink}">
                  <span class="file-name" title="${fileData.fileName}">${fileData.fileName}</span>
                  <button class="remove-file" title="Remover arquivo">x</button>
                </li>`;
        });

        episodeList.innerHTML = filledEpisodes.join("");

        // Adiciona sempre uma zona de soltura vazia no final
        const newDropZone = document.createElement("li");
        newDropZone.className = "drop-zone";
        newDropZone.textContent = `Arraste um episódio aqui`;
        episodeList.appendChild(newDropZone);

        seasonItem.innerHTML = `<div class="season-title">Temporada ${seasonNumber}</div>`;
        seasonItem.appendChild(episodeList);
        seasonList.appendChild(seasonItem);
      });
  }

  if (seasonList.children.length === 0) {
    handleAddSeason();
  }
}

function handleCollectionChange() {
  const { collectionSelect, saveSeriesBtn, seriesImdbIdInput } =
    getDOMElements();
  const selectedId = collectionSelect.value;

  if (selectedId === "new") {
    saveSeriesBtn.textContent = "Criar Série";
    seriesImdbIdInput.disabled = false;
    loadSeriesView({ name: "", id: "", seasons: { 1: { files: {} } } }); // Visão limpa
  } else {
    saveSeriesBtn.textContent = "Salvar Alterações";
    seriesImdbIdInput.disabled = true;
    const seriesData = seriesLibrary[selectedId];
    if (seriesData) {
      loadSeriesView(seriesData);
    }
  }
}

function handleSaveSeries() {
  const { seriesNameInput, seriesImdbIdInput, seasonList } = getDOMElements();
  let name = seriesNameInput.value.trim();
  const imdbId = seriesImdbIdInput.value.trim();

  if (!imdbId) {
    alert("O IMDb ID da série é obrigatório.");
    return;
  }
  if (!name) {
    name = imdbId;
  }

  const isNew = !seriesLibrary[imdbId];
  if (isNew) {
    seriesLibrary[imdbId] = { id: imdbId, name, seasons: {} };
  } else {
    seriesLibrary[imdbId].name = name;
  }

  // Lê o estado atual do DOM para salvar os arquivos
  const seasons = {};
  seasonList.querySelectorAll(".season-item").forEach((seasonEl, index) => {
    const seasonNumber = index + 1;
    const files = {};
    seasonEl.querySelectorAll(".drop-zone.filled").forEach((fileEl) => {
      const fileLink = fileEl.dataset.fileLink;
      files[fileLink] = {
        torrentId: fileEl.dataset.torrentId,
        fileName: fileEl.querySelector(".file-name").textContent,
      };
    });
    seasons[seasonNumber] = { files };
  });
  seriesLibrary[imdbId].seasons = seasons;

  saveMediaLibrary("series", seriesLibrary);
  alert(`Série "${name}" salva com sucesso!`);

  if (isNew) {
    handleMediaTypeChange();
    getDOMElements().collectionSelect.value = imdbId;
    handleCollectionChange();
  }
}

export function initOrganizer() {
  const elements = getDOMElements();
  if (!elements.mediaTypeSelect) return;

  elements.mediaTypeSelect.addEventListener("change", handleMediaTypeChange);
  elements.addSeasonBtn.addEventListener("click", handleAddSeason);
  elements.addMovieBtn.addEventListener("click", handleAddMovie);

  // Novos listeners para criação de série
  elements.seriesImdbIdInput.addEventListener("blur", handleImdbIdBlur);
  elements.saveSeriesBtn.addEventListener("click", handleSaveSeries);

  // Inicializa o drag and drop globalmente no painel
  initDragAndDrop();

  // Dispara a função uma vez para configurar o estado inicial
  handleMediaTypeChange();

  console.log("✅ Módulo Organizador inicializado.");
}
