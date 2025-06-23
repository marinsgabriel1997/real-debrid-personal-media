import {
  getRdApiKey,
  saveTorrentData,
  getAllTorrentData,
  getMediaLibrary,
  saveMediaLibrary,
  getOmdbApiKey,
} from "./config.js";
import {
  getTorrents,
  addMagnet,
  getTorrentInfo,
  selectTorrentFiles,
  deleteTorrent,
  getMediaInfoFromOmdb,
  searchMediaByTitle,
  unrestrictLink,
  getStreamingTranscode,
} from "./api.js";

let seriesLibrary = getMediaLibrary("series") || {};
let movieLibrary = getMediaLibrary("movies") || {};

function getDOMElements() {
  return {
    // Left panel
    torrentList: document.querySelector(".management-view .torrent-list"),
    actionInput: document.querySelector(".management-view .action-input"),
    actionButton: document.querySelector(".management-view .action-button"),
    syncButton: document.getElementById("sync-torrents-btn"),
    filterInput: document.getElementById("torrent-filter-input"),
    videoOnlyCheckbox: document.getElementById("video-only-checkbox"),

    // Right panel (organizer)
    mediaTypeSelect: document.getElementById("media-type-select"),
    collectionSelect: document.getElementById("media-select-input"),
    seriesOrganizer: document.getElementById("series-organizer"),
    movieOrganizer: document.getElementById("movie-organizer"),

    // Series form
    seriesNameInput: document.getElementById("series-name-input"),
    seriesImdbIdInput: document.getElementById("series-imdb-id-input"),
    saveSeriesBtn: document.getElementById("save-series-btn"),
    fetchSeriesMetadataBtn: document.getElementById(
      "fetch-series-metadata-btn"
    ),
    seasonList: document.querySelector("#series-organizer .season-list"),

    // Movie form
    saveMovieCollectionBtn: document.getElementById(
      "save-movie-collection-btn"
    ),
    movieCollectionNameInput: document.getElementById(
      "movie-collection-name-input"
    ),
    movieList: document.querySelector("#movie-organizer .episode-list"),
    newMovieCollectionForm: document.getElementById(
      "new-movie-collection-form"
    ),
    selectedMovieCollectionHeader: document.getElementById(
      "selected-movie-collection-header"
    ),
    selectedMovieCollectionName: document.getElementById(
      "selected-movie-collection-name"
    ),
  };
}

/**
 * Renderiza uma lista plana de arquivos de todos os torrents.
 * @param {Array<object>} torrents A lista de torrents a ser processada.
 */
function renderTorrentList(torrents) {
  const { torrentList, filterInput, videoOnlyCheckbox } = getDOMElements();
  const showVideoOnly = videoOnlyCheckbox ? videoOnlyCheckbox.checked : true;

  torrentList.innerHTML = ""; // Limpa a lista atual

  if (!torrents || torrents.length === 0) {
    torrentList.innerHTML =
      '<p class="empty-state">Nenhum torrent local encontrado. Clique em "Sincronizar" para buscar na sua conta.</p>';
    return;
  }

  // Coleta todos os arquivos de todos os torrents
  const allFiles = [];

  torrents.forEach((torrent) => {
    if (torrent.files && torrent.files.length > 0) {
      torrent.files.forEach((file, index) => {
        const downloadLink = torrent.links[index];
        // Só inclui arquivos que tenham links válidos
        if (!downloadLink || downloadLink === "#") {
          return; // Pula arquivos sem link válido
        }

        const fileName = file.path.split("/").pop(); // Remove o caminho, pega só o nome
        const isVideo = isVideoFile(fileName);

        // Filtra por vídeos se a opção estiver marcada
        if (showVideoOnly && !isVideo) {
          return; // Pula arquivos não-vídeo
        }

        allFiles.push({
          name: fileName,
          link: downloadLink,
          isVideo: isVideo,
          torrentName: torrent.filename,
          torrentId: torrent.id,
          torrentStatus: torrent.status,
        });
      });
    } else if (torrent.status === "downloaded" && torrent.links.length > 0) {
      // Fallback para caso não tenha a lista de arquivos mas tenha links
      const isVideo = isVideoFile(torrent.filename);
      if (!showVideoOnly || isVideo) {
        torrent.links.forEach((link) => {
          // Só inclui links válidos
          if (link && link !== "#") {
            allFiles.push({
              name: torrent.filename,
              link: link,
              isVideo: isVideo,
              torrentName: torrent.filename,
              torrentId: torrent.id,
              torrentStatus: torrent.status,
            });
          }
        });
      }
    }
  });

  if (allFiles.length === 0) {
    const emptyMessage = showVideoOnly
      ? "Nenhum arquivo de vídeo disponível encontrado nos torrents. Aguarde o download ou sincronize novamente."
      : "Nenhum arquivo disponível encontrado nos torrents. Aguarde o download ou sincronize novamente.";
    torrentList.innerHTML = `<p class="empty-state">${emptyMessage}</p>`;
    return;
  }

  // Ordena alfabeticamente
  allFiles.sort((a, b) =>
    a.name.localeCompare(b.name, "pt-BR", { numeric: true })
  );

  // Renderiza cada arquivo como um item individual
  allFiles.forEach((file) => {
    const fileElement = renderFileItem(file);
    torrentList.appendChild(fileElement);
  });

  // Reaplicar filtro se houver texto no campo de filtro
  if (filterInput && filterInput.value.trim()) {
    applyFileFilter(filterInput.value);
  }
}

/**
 * Renderiza um item de arquivo individual
 * @param {object} file - Objeto do arquivo com suas propriedades
 * @returns {HTMLElement} Elemento DOM do arquivo
 */
function renderFileItem(file) {
  const item = document.createElement("div");
  item.className = "file-item-row";
  item.dataset.fileName = file.name;
  item.dataset.torrentId = file.torrentId;
  item.dataset.link = file.link;
  item.draggable = true;

  const videoIcon = file.isVideo ? "🎬" : "📄";
  const statusClass = getStatusClass(file.torrentStatus);

  item.innerHTML = `
    <div class="file-info">
      <div class="file-icon">${videoIcon}</div>
      <div class="file-details">
        <div class="file-name">${file.name}</div>
        <div class="file-source">De: ${file.torrentName}</div>
      </div>
    </div>
    <div class="file-status ${statusClass}">${getStatusText(
    file.torrentStatus
  )}</div>
  `;

  return item;
}

/**
 * Obtém a classe CSS para o status do torrent
 */
function getStatusClass(status) {
  const statusClasses = {
    downloaded: "status-complete",
    downloading: "status-downloading",
    queued: "status-queued",
    error: "status-error",
    dead: "status-error",
  };
  return statusClasses[status] || "status-default";
}

/**
 * Obtém o texto formatado para o status do torrent
 */
function getStatusText(status) {
  const statusMap = {
    magnet_error: "Erro",
    magnet_conversion: "Convertendo",
    waiting_files_selection: "Aguardando",
    queued: "Na fila",
    downloading: "Baixando",
    downloaded: "Disponível",
    error: "Erro",
    virus: "Vírus",
    compressing: "Comprimindo",
    uploading: "Enviando",
    dead: "Morto",
  };
  return statusMap[status] || status;
}

/**
 * Aguarda um torrent ter sua lista de arquivos disponível.
 * @param {string} apiKey A chave da API.
 * @param {string} torrentId O ID do torrent.
 * @returns {Promise<object>} As informações detalhadas do torrent.
 */
async function pollTorrentInfo(apiKey, torrentId) {
  const MAX_ATTEMPTS = 20;
  const DELAY = 3000; // 3 segundos

  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    try {
      const torrentInfo = await getTorrentInfo(apiKey, torrentId);

      // Se a lista de arquivos estiver pronta, retorna.
      if (torrentInfo && torrentInfo.files && torrentInfo.files.length > 0) {
        return torrentInfo;
      }

      // Se o status indicar um erro terminal, para de tentar.
      const errorStatus = [
        "magnet_error",
        "error",
        "virus",
        "dead",
        "downloaded", // Se já foi baixado, pode não ter a seleção de arquivos.
      ];
      if (errorStatus.includes(torrentInfo.status)) {
        throw new Error(
          `O torrent entrou em um estado inesperado: ${getStatusText(
            torrentInfo.status
          )}`
        );
      }
    } catch (error) {
      console.error(`Tentativa de polling ${i + 1} falhou:`, error);
      // Se o erro for crítico, propaga para o chamador.
      if (error.message.includes("inesperado")) {
        throw error;
      }
    }
    // Aguarda antes da próxima tentativa
    await new Promise((resolve) => setTimeout(resolve, DELAY));
  }
  throw new Error(
    "Não foi possível obter a lista de arquivos do torrent após várias tentativas."
  );
}

async function handleAddLink() {
  const { actionInput, actionButton } = getDOMElements();
  const link = actionInput.value.trim();

  if (!link) {
    console.log("Por favor, insira um magnet link.");
    return;
  }

  if (!link.startsWith("magnet:?")) {
    console.log(
      "No momento, apenas magnet links são suportados. Por favor, insira um magnet válido."
    );
    return;
  }

  const apiKey = getRdApiKey();
  if (!apiKey) {
    console.log(
      "A API Key não está configurada. Por favor, adicione-a nas Configurações."
    );
    return;
  }

  actionButton.disabled = true;
  actionButton.textContent = "Analisando magnet...";

  let probeTorrentId = null;
  let shouldDeleteProbe = false; // Flag para controlar a exclusão

  try {
    // 1. Adiciona o magnet para obter a lista de arquivos (torrent "sonda")
    const probeTorrent = await addMagnet(apiKey, link);
    probeTorrentId = probeTorrent.id;
    shouldDeleteProbe = true; // Assume que será deletado, a menos que seja reutilizado
    actionButton.textContent = "Obtendo lista de arquivos...";

    // 2. Aguarda até que a lista de arquivos esteja disponível
    const torrentDetails = await pollTorrentInfo(apiKey, probeTorrentId);

    if (
      !torrentDetails ||
      !torrentDetails.files ||
      torrentDetails.files.length === 0
    ) {
      throw new Error("Nenhum arquivo encontrado no magnet link.");
    }

    const filesToDownload = torrentDetails.files;
    const fileCount = filesToDownload.length;

    // 3. Processa o primeiro arquivo reutilizando o torrent "sonda"
    const firstFile = filesToDownload[0];
    const firstFileName = firstFile.path.split("/").pop() || firstFile.path;
    actionButton.textContent = `Adicionando 1/${fileCount}: ${firstFileName}`;
    await selectTorrentFiles(apiKey, probeTorrentId, firstFile.id.toString());

    // O torrent sonda foi reutilizado, então não devemos mais deletá-lo.
    shouldDeleteProbe = false;

    // 4. Se houver mais arquivos, adiciona-os em novos torrents
    if (fileCount > 1) {
      for (let i = 1; i < fileCount; i++) {
        const file = filesToDownload[i];
        const fileName = file.path.split("/").pop() || file.path;
        actionButton.textContent = `Adicionando ${
          i + 1
        }/${fileCount}: ${fileName}`;

        // Adiciona o mesmo magnet novamente para criar um novo torrent
        const newTorrent = await addMagnet(apiKey, link);

        // Seleciona apenas o arquivo atual para este novo torrent
        await selectTorrentFiles(apiKey, newTorrent.id, file.id.toString());

        // Pequeno atraso para não sobrecarregar a API
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const message =
      fileCount === 1
        ? `O torrent com 1 arquivo foi adicionado para download.`
        : `${fileCount} torrents foram adicionados à sua conta, um para cada arquivo.`;

    console.log(`${message} Clique em "Sincronizar" para atualizar a lista.`);

    actionInput.value = "";
  } catch (error) {
    console.log(`Erro ao adicionar o magnet link: ${error.message}`);
    console.error("Erro ao adicionar magnet:", error);
  } finally {
    // 5. Limpa o torrent sonda APENAS se algo deu errado antes da reutilização
    if (probeTorrentId && shouldDeleteProbe) {
      try {
        await deleteTorrent(apiKey, probeTorrentId);
        console.log(`Torrent sonda ${probeTorrentId} removido com sucesso.`);
      } catch (cleanupError) {
        console.error(
          `Falha ao remover o torrent sonda ${probeTorrentId}:`,
          cleanupError
        );
        console.log(
          `Atenção: Não foi possível remover o torrent temporário "${probeTorrentId}" da sua conta. Você pode removê-lo manualmente.`
        );
      }
    }
    actionButton.disabled = false;
    actionButton.textContent = "Analisar e Adicionar";
  }
}

/**
 * Busca torrents da API, processa e salva no cache, depois renderiza.
 */
async function syncTorrents() {
  const { torrentList, syncButton } = getDOMElements();
  const apiKey = getRdApiKey();

  if (!apiKey) {
    console.log(
      "Por favor, configure sua API Key na página de Configurações para poder sincronizar."
    );
    return;
  }

  syncButton.disabled = true;
  syncButton.textContent = "Sincronizando...";
  torrentList.innerHTML =
    '<p class="empty-state">Buscando torrents na nuvem...</p>';

  try {
    const torrentsFromApi = await getTorrents(apiKey);

    const processedTorrents = [];
    for (const basicTorrentInfo of torrentsFromApi) {
      let fullTorrentData = basicTorrentInfo;
      if (
        basicTorrentInfo.status === "downloaded" ||
        (basicTorrentInfo.files && basicTorrentInfo.files.length > 0)
      ) {
        try {
          const detailedInfo = await getTorrentInfo(
            apiKey,
            basicTorrentInfo.id
          );
          fullTorrentData = { ...basicTorrentInfo, ...detailedInfo };
        } catch (infoError) {
          console.warn(
            `Não foi possível obter detalhes do torrent ${basicTorrentInfo.filename}: ${infoError.message}`
          );
        }
      }
      saveTorrentData(fullTorrentData.id, fullTorrentData);
      processedTorrents.push(fullTorrentData);
    }

    renderTorrentList(processedTorrents);
  } catch (error) {
    torrentList.innerHTML = `<p class="empty-state error">Erro ao sincronizar: ${error.message}</p>`;
    console.error("Erro ao sincronizar torrents:", error);
  } finally {
    syncButton.disabled = false;
    syncButton.textContent = "Sincronizar";
  }
}

/**
 * Carrega e renderiza os torrents a partir do cache local.
 */
function renderTorrentsFromCache() {
  const torrents = getAllTorrentData();
  renderTorrentList(torrents);
}

function initTorrentDrag() {
  const torrentList = document.querySelector(".management-view .torrent-list");
  if (!torrentList) return;

  // Drag from file list
  torrentList.addEventListener("dragstart", (e) => {
    if (e.target.classList.contains("file-item-row")) {
      e.target.classList.add("dragging");
      const torrentId = e.target.dataset.torrentId;
      const fileLink = e.target.dataset.link;
      const fileName = e.target.dataset.fileName;

      const data = JSON.stringify({ torrentId, fileLink, fileName });
      e.dataTransfer.setData("application/json", data);
      e.dataTransfer.effectAllowed = "move";
    }
  });

  torrentList.addEventListener("dragend", (e) => {
    if (e.target.classList.contains("file-item-row")) {
      e.target.classList.remove("dragging");
    }
  });
}

function handleAddMovieSlot() {
  const movieEpisodeList = document.querySelector(
    "#movie-organizer .episode-list"
  );
  if (movieEpisodeList) {
    addNewSlot(movieEpisodeList, true);
  }
}

/**
 * Inicializa todas as funcionalidades do painel do organizador
 */
function initOrganizer() {
  initOrganizerDropZones();
  initOrganizerButtons();
}

/**
 * Inicializa as zonas de drop do organizador
 */
function initOrganizerDropZones() {
  const organizer = document.querySelector(".organizer-content");
  if (!organizer) return;

  // Prevent default drag behaviors
  organizer.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });

  organizer.addEventListener("dragenter", (e) => {
    e.preventDefault();
  });

  // Handle drops on drop zones
  organizer.addEventListener("drop", (e) => {
    e.preventDefault();

    if (
      e.target.classList.contains("drop-zone") &&
      !e.target.classList.contains("filled")
    ) {
      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        handleDropOnOrganizer(e.target, data);
      } catch (error) {
        console.error("Erro ao processar drop:", error);
      }
    }
  });

  // Handle drops on filled slots for reordering
  organizer.addEventListener("drop", (e) => {
    e.preventDefault();

    if (
      e.target.classList.contains("filled-drop-zone") ||
      e.target.closest(".filled-drop-zone")
    ) {
      const dropZone = e.target.classList.contains("filled-drop-zone")
        ? e.target
        : e.target.closest(".filled-drop-zone");

      try {
        const data = JSON.parse(e.dataTransfer.getData("application/json"));
        handleReorderInOrganizer(dropZone, data);
      } catch (error) {
        console.error("Erro ao reordenar:", error);
      }
    }
  });

  // Add visual feedback during drag
  organizer.addEventListener("dragover", (e) => {
    const dropZone = e.target.closest(".drop-zone, .filled-drop-zone");
    if (dropZone) {
      dropZone.classList.add("drag-over");
    }
  });

  organizer.addEventListener("dragleave", (e) => {
    const dropZone = e.target.closest(".drop-zone, .filled-drop-zone");
    if (dropZone && !dropZone.contains(e.relatedTarget)) {
      dropZone.classList.remove("drag-over");
    }
  });
}

/**
 * Manipula o drop de arquivos no organizador
 */
function handleDropOnOrganizer(dropZone, fileData) {
  const { mediaTypeSelect, collectionSelect } = getDOMElements();
  const isMovie = mediaTypeSelect.value === "movies";

  dropZone.classList.remove("drag-over");

  if (isMovie) {
    if (collectionSelect.value === "new") {
      console.log(
        "Por favor, crie e selecione uma coleção de filmes antes de adicionar arquivos."
      );
      return;
    }

    // Cria um item de filme com um nome padrão extraído do arquivo
    const movieData = {
      internalId: generateUniqueId(),
      originalFileData: fileData,
      name: fileData.fileName.replace(/\\.[^/.]+$/, ""), // Remove extensão
      imdbLink: "",
    };

    const movieItem = renderMovieItem(movieData);
    dropZone.replaceWith(movieItem); // Substitui o slot vazio pelo item preenchido
    handleSaveMovieItem(movieItem); // Salva o novo item na coleção

    const episodeList = movieItem.closest(".episode-list");
    checkAndAddNewSlot(episodeList, true); // Garante que há um novo slot vazio
  } else {
    // Lógica para séries
    const episodeData = {
      internalId: fileData.fileLink, // Usando o link original como ID
      originalFileData: fileData,
      name: fileData.fileName,
    };
    const episodeItem = renderSeriesEpisodeItem(episodeData);
    dropZone.replaceWith(episodeItem);

    // Salva o novo episódio na coleção
    handleSaveSeriesEpisode(episodeItem);

    const episodeList = episodeItem.closest(".episode-list");
    checkAndAddNewSlot(episodeList, false);
  }
}

/**
 * Manipula reordenação dentro do organizador
 */
function handleReorderInOrganizer(targetDropZone, fileData) {
  targetDropZone.classList.remove("drag-over");

  // Find the dragging element
  const draggingElement = document.querySelector(".filled-drop-zone.dragging");
  if (!draggingElement) return;

  // Store current data
  const targetData = targetDropZone.dataset.fileData;

  // Swap the data
  targetDropZone.dataset.fileData = draggingElement.dataset.fileData;
  draggingElement.dataset.fileData = targetData;

  // Update visual content
  const targetFileData = JSON.parse(targetDropZone.dataset.fileData);
  const draggingFileData = JSON.parse(draggingElement.dataset.fileData);

  updateDropZoneContent(targetDropZone, targetFileData);
  updateDropZoneContent(draggingElement, draggingFileData);

  console.log("Arquivos reordenados no organizador");
}

/**
 * Atualiza o conteúdo visual de uma drop zone
 */
function updateDropZoneContent(dropZone, fileData) {
  const droppedFile = dropZone.querySelector(".dropped-file");
  if (droppedFile) {
    droppedFile.querySelector(".file-name").textContent = fileData.fileName;
  }
}

/**
 * Remove um arquivo do organizador
 */
function removeFileFromOrganizer(dropZone) {
  // Reset the drop zone
  dropZone.classList.remove("filled-drop-zone");
  dropZone.classList.add("drop-zone");
  dropZone.draggable = false;

  // Clear data
  delete dropZone.dataset.fileData;

  // Get episode list and context
  const seasonItem = dropZone.closest(".season-item");
  const episodeList = dropZone.closest(".episode-list");
  const isMovieOrganizer = dropZone.closest("#movie-organizer") !== null;

  // Get all slots in this episode list
  const allSlots = Array.from(
    episodeList.querySelectorAll(".drop-zone, .filled-drop-zone")
  );
  const currentIndex = allSlots.indexOf(dropZone);

  // Remove all empty slots after this one
  cleanupEmptySlots(episodeList, currentIndex);

  // Reset content based on position (recalculate after cleanup)
  const updatedSlots = episodeList.querySelectorAll(
    ".drop-zone, .filled-drop-zone"
  );
  const updatedIndex = Array.from(updatedSlots).indexOf(dropZone) + 1;

  if (seasonItem && !isMovieOrganizer) {
    dropZone.textContent = `Arraste o Episódio ${updatedIndex} aqui`;
  } else {
    dropZone.textContent = `Arraste o arquivo do Filme ${updatedIndex} aqui`;
  }

  console.log("Arquivo removido do organizador e slots limpos");
}

/**
 * Remove slots vazios desnecessários mantendo pelo menos um no final
 */
function cleanupEmptySlots(episodeList, fromIndex) {
  const allSlots = Array.from(
    episodeList.querySelectorAll(".drop-zone, .filled-drop-zone")
  );
  const isMovieOrganizer = episodeList.closest("#movie-organizer") !== null;

  // Find the last filled slot
  let lastFilledIndex = -1;
  for (let i = allSlots.length - 1; i >= 0; i--) {
    if (allSlots[i].classList.contains("filled-drop-zone")) {
      lastFilledIndex = i;
      break;
    }
  }

  // Remove empty slots after the last filled slot, but keep one empty slot
  const slotsToKeep = lastFilledIndex + 2; // Keep filled slots + 1 empty slot

  for (let i = allSlots.length - 1; i >= slotsToKeep; i--) {
    if (allSlots[i].classList.contains("drop-zone")) {
      allSlots[i].remove();
    }
  }

  // Ensure there's at least one empty slot
  const remainingSlots = episodeList.querySelectorAll(
    ".drop-zone, .filled-drop-zone"
  );
  const hasEmptySlot = Array.from(remainingSlots).some(
    (slot) =>
      slot.classList.contains("drop-zone") &&
      !slot.classList.contains("filled-drop-zone")
  );

  if (!hasEmptySlot) {
    addNewSlot(episodeList, isMovieOrganizer);
  }

  // Renumber remaining empty slots
  renumberSlots(episodeList, isMovieOrganizer);
}

/**
 * Renumera os slots para manter a sequência correta
 */
function renumberSlots(episodeList, isMovieOrganizer) {
  const allSlots = episodeList.querySelectorAll(
    ".drop-zone, .filled-drop-zone"
  );

  allSlots.forEach((slot, index) => {
    if (
      slot.classList.contains("drop-zone") &&
      !slot.classList.contains("filled-drop-zone")
    ) {
      const slotNumber = index + 1;
      if (isMovieOrganizer) {
        slot.textContent = `Arraste o arquivo do Filme ${slotNumber} aqui`;
      } else {
        slot.textContent = `Arraste o Episódio ${slotNumber} aqui`;
      }
    }
  });
}

/**
 * Adiciona um novo slot para episódio/filme
 */
function addNewSlot(episodeList, isMovieOrganizer = false) {
  const allSlots = episodeList.querySelectorAll(
    ".drop-zone, .filled-drop-zone"
  );
  const nextIndex = allSlots.length + 1;

  const newSlot = document.createElement("li");
  newSlot.className = "drop-zone";

  if (isMovieOrganizer) {
    newSlot.textContent = `Arraste o arquivo do Filme ${nextIndex} aqui`;
  } else {
    newSlot.textContent = `Arraste o Episódio ${nextIndex} aqui`;
  }

  episodeList.appendChild(newSlot);
  console.log(`Novo slot ${nextIndex} adicionado`);
}

/**
 * Verifica se precisa adicionar um novo slot automaticamente
 */
function checkAndAddNewSlot(episodeList, isMovieOrganizer = false) {
  const emptySlots = episodeList.querySelectorAll(
    ".drop-zone:not(.filled-drop-zone)"
  );

  // Se não há slots vazios, adiciona um novo
  if (emptySlots.length === 0) {
    addNewSlot(episodeList, isMovieOrganizer);
  }
}

/**
 * Inicializa os botões do organizador
 */
function initOrganizerButtons() {
  // Botão para adicionar temporada
  const addSeasonBtn = document.getElementById("add-season-btn");
  if (addSeasonBtn) {
    addSeasonBtn.addEventListener("click", () => {
      addNewSeason();
    });
  }

  // Botão para adicionar filme
  const addMovieBtn = document.getElementById("add-movie-btn");
  if (addMovieBtn) {
    addMovieBtn.addEventListener("click", () => {
      const movieEpisodeList = document.querySelector(
        "#movie-organizer .episode-list"
      );
      if (movieEpisodeList) {
        addNewSlot(movieEpisodeList, true);
      }
    });
  }
}

/**
 * Adiciona uma nova temporada
 */
function addNewSeason() {
  const seasonList = document.querySelector("#series-organizer .season-list");
  if (!seasonList) return;

  const currentSeasons = seasonList.querySelectorAll(".season-item");
  const nextSeasonNumber = currentSeasons.length + 1;

  const newSeason = document.createElement("li");
  newSeason.className = "season-item";
  newSeason.innerHTML = `
    <div class="season-header">
      <div class="season-title">Temporada ${nextSeasonNumber}</div>
      <button class="remove-season-btn" title="Remover temporada">🗑️</button>
    </div>
    <ul class="episode-list">
      <li class="drop-zone">Arraste o Episódio 1 aqui</li>
    </ul>
  `;

  seasonList.appendChild(newSeason);
  console.log(`Temporada ${nextSeasonNumber} adicionada`);
}

/**
 * Normaliza uma string removendo acentos e convertendo para minúsculas
 * @param {string} text - Texto a ser normalizado
 * @returns {string} Texto normalizado
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Verifica se um arquivo corresponde aos critérios de filtro
 * @param {string} fileName - Nome do arquivo
 * @param {string} filterText - Texto do filtro
 * @returns {boolean} True se corresponde ao filtro
 */
function fileMatchesFilter(fileName, filterText) {
  if (!filterText.trim()) return true;

  // Divide o texto de filtro em palavras individuais
  const filterWords = filterText
    .trim()
    .split(/\s+/)
    .map((word) => normalizeText(word))
    .filter((word) => word.length > 0);

  // Se não há palavras válidas, mostra todos
  if (filterWords.length === 0) return true;

  // Normaliza o nome do arquivo
  const normalizedFileName = normalizeText(fileName);

  // Verifica se todas as palavras do filtro estão presentes no nome do arquivo
  return filterWords.every((word) => normalizedFileName.includes(word));
}

/**
 * Aplica o filtro na lista de arquivos atualmente exibida
 * @param {string} filterText - Texto do filtro
 */
function applyFileFilter(filterText) {
  const { torrentList, videoOnlyCheckbox } = getDOMElements();
  const fileItems = torrentList.querySelectorAll(".file-item-row");

  // Se não há items, não faz nada
  if (fileItems.length === 0) return;

  const showVideoOnly = videoOnlyCheckbox ? videoOnlyCheckbox.checked : true;
  let visibleCount = 0;

  fileItems.forEach((item) => {
    const fileName = item.dataset.fileName;
    const shouldShow = fileMatchesFilter(fileName, filterText);

    if (shouldShow) {
      item.style.display = "";
      visibleCount++;
    } else {
      item.style.display = "none";
    }
  });

  // Atualiza mensagem se nenhum resultado for encontrado
  if (visibleCount === 0 && filterText.trim()) {
    if (!torrentList.querySelector(".filter-no-results")) {
      const noResultsMsg = document.createElement("p");
      noResultsMsg.className = "empty-state filter-no-results";
      const fileType = showVideoOnly ? "vídeo" : "arquivo";
      noResultsMsg.textContent = `Nenhum ${fileType} encontrado para "${filterText}"`;
      torrentList.appendChild(noResultsMsg);
    }
  } else {
    // Remove mensagem de "não encontrado" se existir
    const noResultsMsg = torrentList.querySelector(".filter-no-results");
    if (noResultsMsg) {
      noResultsMsg.remove();
    }
  }
}

/**
 * Inicializa os event listeners para o filtro
 */
function initTorrentFilter() {
  const { filterInput } = getDOMElements();
  if (!filterInput) return;

  // Aplica filtro conforme o usuário digita (com debounce simples)
  let filterTimeout;
  filterInput.addEventListener("input", (e) => {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
      applyFileFilter(e.target.value);
    }, 300); // Aguarda 300ms após parar de digitar
  });

  // Aplica filtro imediatamente quando pressiona Enter
  filterInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(filterTimeout);
      applyFileFilter(e.target.value);
    }
  });
}

/**
 * Inicializa o controle do checkbox "mostrar somente vídeos"
 */
function initVideoOnlyFilter() {
  const { videoOnlyCheckbox } = getDOMElements();
  if (!videoOnlyCheckbox) return;

  // Atualiza a visualização quando o checkbox é alterado
  videoOnlyCheckbox.addEventListener("change", () => {
    // Re-renderiza todos os torrents com a nova configuração
    renderTorrentsFromCache();
  });
}

/**
 * Verifica se um arquivo é um arquivo de vídeo baseado na extensão
 * @param {string} fileName - Nome do arquivo
 * @returns {boolean} True se for um arquivo de vídeo
 */
function isVideoFile(fileName) {
  const videoExtensions = [
    ".mp4",
    ".mkv",
    ".avi",
    ".mov",
    ".wmv",
    ".flv",
    ".webm",
    ".m4v",
    ".mpg",
    ".mpeg",
    ".3gp",
    ".ogv",
    ".ts",
    ".m2ts",
    ".mts",
    ".vob",
    ".asf",
    ".rm",
    ".rmvb",
    ".divx",
    ".xvid",
  ];

  const fileExtension = fileName
    .toLowerCase()
    .substring(fileName.lastIndexOf("."));
  return videoExtensions.includes(fileExtension);
}

/**
 * Inicializa os botões de remoção de temporada
 */
function initSeasonRemoveButtons() {
  const seasonList = document.querySelector("#series-organizer .season-list");
  if (!seasonList) return;

  // Delegate event for remove buttons (for dynamically added seasons)
  seasonList.addEventListener("click", (e) => {
    if (
      e.target.classList.contains("remove-season-btn") ||
      e.target.closest(".remove-season-btn")
    ) {
      const removeBtn = e.target.classList.contains("remove-season-btn")
        ? e.target
        : e.target.closest(".remove-season-btn");

      const seasonItem = removeBtn.closest(".season-item");
      if (seasonItem) confirmAndRemoveSeason(seasonItem);
    }
  });
}

/**
 * Confirma e remove uma temporada
 */
function confirmAndRemoveSeason(seasonItem) {
  const seasonTitle = seasonItem.querySelector(".season-title").textContent;
  const filledSlots = seasonItem.querySelectorAll(".filled-drop-zone");

  let confirmMessage = `Tem certeza que deseja remover a "${seasonTitle}"?`;

  if (filledSlots.length > 0) {
    const fileNames = Array.from(filledSlots).map((slot) => {
      const fileData = JSON.parse(slot.dataset.fileData || "{}");
      return fileData.fileName || "Arquivo desconhecido";
    });

    confirmMessage += `\n\nEsta temporada contém ${filledSlots.length} arquivo(s):\n`;
    confirmMessage += fileNames
      .slice(0, 3)
      .map((name) => `• ${name}`)
      .join("\n");

    if (fileNames.length > 3) {
      confirmMessage += `\n• ... e mais ${fileNames.length - 3} arquivo(s)`;
    }

    confirmMessage += "\n\nTodos os arquivos organizados serão perdidos.";
  }

  if (confirm(confirmMessage)) {
    removeSeason(seasonItem);
  }
}

/**
 * Remove uma temporada e renumera as restantes
 */
function removeSeason(seasonItem) {
  const seasonList = seasonItem.parentElement;
  const seasonTitle = seasonItem.querySelector(".season-title").textContent;

  // Remove the season
  seasonItem.remove();

  // Renumber remaining seasons
  renumberSeasons(seasonList);

  console.log(`${seasonTitle} removida com sucesso`);
}

/**
 * Renumera as temporadas após remoção
 */
function renumberSeasons(seasonList) {
  const seasonItems = seasonList.querySelectorAll(".season-item");

  seasonItems.forEach((item, index) => {
    const seasonNumber = index + 1;
    const titleElement = item.querySelector(".season-title");
    titleElement.textContent = `Temporada ${seasonNumber}`;
  });

  // Ensure there's at least one season
  if (seasonItems.length === 0) {
    addNewSeason();
  }
}

/**
 * Busca informações da mídia no OMDb quando o campo IMDb ID perde o foco
 */
async function handleImdbIdBlur() {
  const { seriesImdbIdInput, seriesNameInput } = getDOMElements();
  const imdbId = seriesImdbIdInput.value.trim();
  const omdbApiKey = getOmdbApiKey();

  if (!imdbId) return;
  if (!omdbApiKey) {
    console.warn(
      "Chave da API do OMDb não configurada. Preencha o nome manualmente."
    );
    return;
  }

  try {
    const mediaInfo = await getMediaInfoFromOmdb(omdbApiKey, imdbId);
    if (mediaInfo.Title) {
      seriesNameInput.value = mediaInfo.Title;
    } else {
      console.log(mediaInfo.Error || "Nome não encontrado para este ID.");
      seriesNameInput.value = "";
    }
  } catch (error) {
    console.log(`Não foi possível buscar o nome da série: ${error.message}`);
    seriesNameInput.value = "";
  }
}

/**
 * Utilitário para gerar um ID único para novas coleções.
 * @returns {string} Um ID único.
 */
function generateUniqueId() {
  return `rdmm-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .substr(2, 9)}`;
}

/**
 * Utilitário para extrair um IMDb ID válido de uma string (link ou ID puro).
 * @param {string} input O texto do input.
 * @returns {string|null} O IMDb ID (ex: tt1234567) ou null se não for válido.
 */
function extractImdbId(input) {
  if (!input) return null;
  const match = input.match(/(tt\d{7,8})/);
  return match ? match[0] : null;
}

/**
 * Busca metadados da série no OMDb e preenche os campos.
 */
async function handleFetchSeriesMetadata() {
  const { seriesNameInput, seriesImdbIdInput, fetchSeriesMetadataBtn } =
    getDOMElements();
  const name = seriesNameInput.value.trim();
  const imdbInputValue = seriesImdbIdInput.value.trim();
  const omdbApiKey = getOmdbApiKey();

  if (!omdbApiKey) {
    console.log("Configure sua API Key do OMDb nas Configurações.");
    return;
  }

  // Prioriza a busca por ID se houver um
  const imdbId = extractImdbId(imdbInputValue);

  if (!imdbId && !name) {
    console.log("Preencha o Nome da Série ou o ID/Link do IMDb para buscar.");
    return;
  }

  fetchSeriesMetadataBtn.disabled = true;
  fetchSeriesMetadataBtn.textContent = "Buscando...";

  try {
    let mediaInfo;
    if (imdbId) {
      // Busca pelo ID
      mediaInfo = await getMediaInfoFromOmdb(omdbApiKey, imdbId);
    } else {
      // Busca pelo nome
      mediaInfo = await searchMediaByTitle(omdbApiKey, name);
    }

    // Atualiza os campos com os dados encontrados
    seriesNameInput.value = mediaInfo.Title || name;
    if (mediaInfo.imdbID) {
      seriesImdbIdInput.value = `https://www.imdb.com/title/${mediaInfo.imdbID}/`;
    }
    console.log(`Metadados para "${mediaInfo.Title}" encontrados com sucesso!`);
  } catch (error) {
    console.log(`Erro ao buscar metadados: ${error.message}`);
  } finally {
    fetchSeriesMetadataBtn.disabled = false;
    fetchSeriesMetadataBtn.textContent = "Buscar Metadados";
  }
}

/**
 * Carrega a visualização de uma série no formulário do organizador
 * @param {object} seriesData Os dados da série a serem carregados
 */
function loadSeriesView(seriesData) {
  const { seriesNameInput, seriesImdbIdInput, seasonList } = getDOMElements();

  seriesNameInput.value = seriesData.name || "";
  seriesImdbIdInput.value = seriesData.imdbLink || "";
  seasonList.innerHTML = ""; // Limpa as temporadas existentes

  if (seriesData.seasons && Object.keys(seriesData.seasons).length > 0) {
    Object.keys(seriesData.seasons)
      .sort((a, b) => parseInt(a) - parseInt(b))
      .forEach((seasonNumber) => {
        addNewSeason(false); // Adiciona uma temporada sem reordenar
        const newSeasonEl = seasonList.lastElementChild;
        const episodeList = newSeasonEl.querySelector(".episode-list");
        episodeList.innerHTML = ""; // Limpa o slot padrão

        const seasonData = seriesData.seasons[seasonNumber];

        if (seasonData.files) {
          Object.entries(seasonData.files)
            .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0))
            .forEach(([fileKey, fileData]) => {
              const episodeData = {
                internalId: fileKey, // Usando a chave (link original) como ID
                originalFileData: fileData,
                name: fileData.fileName, // Nome padrão
              };
              const filledSlot = renderSeriesEpisodeItem(episodeData);
              episodeList.appendChild(filledSlot);
            });
        }
        addNewSlot(episodeList, false); // Adiciona um slot vazio no final
      });
  }

  if (seasonList.children.length === 0) {
    addNewSeason(false);
  }
  renumberSeasons(seasonList);
}

function createMediaActionButtonsHTML(fileData) {
  const unrestrictedLink = fileData?.unrestrictedLink;
  const unrestrictedId = fileData?.unrestrictedId;
  const isStreamable = fileData?.streamable === 1;

  let downloadButtonHTML;
  if (unrestrictedLink) {
    downloadButtonHTML = `<a class="action-button download-btn" href="${unrestrictedLink}" target="_blank" rel="noopener noreferrer">Download</a>`;
  } else {
    downloadButtonHTML = `<button class="action-button download-btn" disabled title="Link de download indisponível. Clique em Atualizar.">Download</button>`;
  }

  let streamButtonHTML;
  if (unrestrictedId && isStreamable) {
    const streamingUrl = `https://real-debrid.com/streaming-${unrestrictedId}`;
    streamButtonHTML = `<a class="action-button stream-btn" href="${streamingUrl}" target="_blank" rel="noopener noreferrer" title="Abrir streaming em nova aba">Streaming</a>`;
  } else {
    const disabledTitle = !unrestrictedId
      ? "Streaming indisponível. Clique em Atualizar para obter o ID."
      : "Streaming indisponível. O arquivo não é compatível com streaming.";
    streamButtonHTML = `<button class="action-button stream-btn" disabled title="${disabledTitle}">Streaming</button>`;
  }

  const updateButtonHTML = `<button class="action-button secondary update-btn">Atualizar Links</button>`;

  return `
    <div class="media-item__actions">
        ${streamButtonHTML}
        ${downloadButtonHTML}
        ${updateButtonHTML}
    </div>
    `;
}

/**
 * Renderiza o item de um filme no organizador
 * @param {object} movieData - Os dados do filme a serem renderizados
 * @returns {HTMLElement} - O elemento <li> do item do filme
 */
function renderMovieItem(movieData) {
  const item = document.createElement("li");
  item.className = "media-item movie-item"; // Classe genérica + específica
  item.dataset.internalId = movieData.internalId;

  const originalFileData = movieData.originalFileData || { fileName: "" };
  item.dataset.fileData = JSON.stringify(originalFileData);

  const nameValue = movieData.name || "";
  const imdbValue = movieData.imdbLink || "";

  item.innerHTML = `
    <div class="media-item__content">
      <div class="media-item__file-info">
          <span class="file-icon">🎬</span>
          <span class="file-name" title="${originalFileData.fileName}">${
    originalFileData.fileName
  }</span>
          <button class="remove-file-btn" title="Remover arquivo">✕</button>
      </div>
      <div class="media-item__metadata movie-metadata-form">
          <input type="text" class="movie-name-input action-input" placeholder="Nome do Filme" value="${nameValue}">
          <input type="text" class="movie-imdb-input action-input" placeholder="ID ou Link do IMDb" value="${imdbValue}">
          <button class="fetch-movie-metadata-btn action-button secondary">Buscar</button>
      </div>
      ${createMediaActionButtonsHTML(movieData)}
    </div>
  `;

  return item;
}

/**
 * Renderiza o item de um episódio de série no organizador
 * @param {object} episodeData - Os dados do episódio
 * @returns {HTMLElement} - O elemento <li> do item do episódio
 */
function renderSeriesEpisodeItem(episodeData) {
  const item = document.createElement("li");
  item.className = "media-item series-episode-item"; // Classe genérica + específica
  item.dataset.fileKey = episodeData.internalId; // Link original como chave

  const originalFileData = episodeData.originalFileData || { fileName: "" };
  item.dataset.fileData = JSON.stringify(originalFileData);

  item.innerHTML = `
    <div class="media-item__content">
      <div class="media-item__file-info">
        <span class="file-icon">🎬</span>
        <span class="file-name" title="${originalFileData.fileName}">${
    originalFileData.fileName
  }</span>
        <button class="remove-file-btn" title="Remover arquivo">✕</button>
      </div>
       ${createMediaActionButtonsHTML(originalFileData)}
    </div>
  `;
  // Adiciona listeners específicos se necessário no futuro
  return item;
}

/**
 * Carrega a visualização de uma coleção de filmes no organizador
 * @param {object} collectionData - Os dados da coleção a serem carregados
 */
function loadMovieView(collectionData) {
  const { movieList } = getDOMElements();
  movieList.innerHTML = ""; // Limpa a lista

  if (collectionData && collectionData.movies) {
    Object.values(collectionData.movies)
      .sort((a, b) => (a.order || 0) - (b.order || 0)) // Ordena se houver ordem definida
      .forEach((movieData) => {
        const movieItem = renderMovieItem(movieData);
        movieList.appendChild(movieItem);
      });
  }

  // Adiciona um slot vazio no final se uma coleção estiver selecionada
  if (collectionData && collectionData.id !== "new") {
    addNewSlot(movieList, true);
  }
}

/**
 * Salva (auto-save) os dados de um item de filme na coleção em memória e no storage.
 * @param {HTMLElement} movieItemElement - O elemento <li> do item do filme.
 */
function handleSaveMovieItem(movieItemElement) {
  const { collectionSelect } = getDOMElements();
  const collectionId = collectionSelect.value;

  if (!collectionId || collectionId === "new") return;

  const internalId = movieItemElement.dataset.internalId;
  if (!internalId) return;

  const name = movieItemElement.querySelector(".movie-name-input").value.trim();
  const imdbLink = movieItemElement
    .querySelector(".movie-imdb-input")
    .value.trim();
  const originalFileData = JSON.parse(movieItemElement.dataset.fileData);

  const movieData = {
    internalId,
    originalFileData,
    name,
    imdbLink,
  };

  // Garante que a estrutura exista
  if (!movieLibrary[collectionId]) movieLibrary[collectionId] = { movies: {} };
  if (!movieLibrary[collectionId].movies)
    movieLibrary[collectionId].movies = {};

  // Atualiza os dados do filme
  movieLibrary[collectionId].movies[internalId] = movieData;

  saveMediaLibrary("movies", movieLibrary);
  console.log(`Filme "${name || originalFileData.fileName}" salvo na coleção.`);
}

/**
 * Busca metadados de um filme individual e atualiza seus campos.
 * @param {HTMLElement} buttonElement - O botão "Buscar" que foi clicado.
 */
async function handleFetchMovieMetadata(buttonElement) {
  const movieItem = buttonElement.closest(".movie-item");
  if (!movieItem) return;

  const nameInput = movieItem.querySelector(".movie-name-input");
  const imdbInput = movieItem.querySelector(".movie-imdb-input");

  const name = nameInput.value.trim();
  const imdbInputValue = imdbInput.value.trim();
  const omdbApiKey = getOmdbApiKey();

  if (!omdbApiKey) {
    console.log("Configure sua API Key do OMDb nas Configurações.");
    return;
  }
  const imdbId = extractImdbId(imdbInputValue);
  if (!imdbId && !name) {
    console.log("Preencha o Nome do Filme ou o ID/Link do IMDb para buscar.");
    return;
  }

  buttonElement.disabled = true;
  buttonElement.textContent = "...";

  try {
    let mediaInfo;
    if (imdbId) {
      mediaInfo = await getMediaInfoFromOmdb(omdbApiKey, imdbId);
    } else {
      mediaInfo = await searchMediaByTitle(omdbApiKey, name);
    }

    nameInput.value = mediaInfo.Title || name;
    if (mediaInfo.imdbID) {
      imdbInput.value = `https://www.imdb.com/title/${mediaInfo.imdbID}/`;
    }

    handleSaveMovieItem(movieItem); // Salva os dados atualizados
    console.log(`Metadados para "${mediaInfo.Title}" atualizados!`);
  } catch (error) {
    console.log(`Erro ao buscar metadados: ${error.message}`);
  } finally {
    buttonElement.disabled = false;
    buttonElement.textContent = "Buscar";
  }
}

/**
 * Manipula a mudança de uma coleção selecionada (série ou filme)
 */
function handleCollectionChange() {
  const {
    collectionSelect,
    saveSeriesBtn,
    mediaTypeSelect,
    // Movie elements
    newMovieCollectionForm,
    selectedMovieCollectionHeader,
    selectedMovieCollectionName,
    movieList,
  } = getDOMElements();
  const selectedId = collectionSelect.value;
  const selectedType = mediaTypeSelect.value;

  if (selectedType === "series") {
    // Hide movie panel elements
    newMovieCollectionForm.style.display = "none";
    selectedMovieCollectionHeader.style.display = "none";
    movieList.innerHTML = ""; // Limpa a lista de filmes para evitar confusão

    if (selectedId === "new") {
      saveSeriesBtn.textContent = "Criar Série";
      loadSeriesView({ name: "", imdbLink: "", seasons: {} });
    } else {
      saveSeriesBtn.textContent = "Salvar Alterações";
      const seriesData = seriesLibrary[selectedId];
      if (seriesData) {
        loadSeriesView(seriesData);
      }
    }
  } else if (selectedType === "movies") {
    if (selectedId === "new") {
      newMovieCollectionForm.style.display = "block";
      selectedMovieCollectionHeader.style.display = "none";
      loadMovieView(null); // Limpa a lista de filmes
    } else {
      newMovieCollectionForm.style.display = "none";
      selectedMovieCollectionHeader.style.display = "block";
      const collectionData = movieLibrary[selectedId];
      if (collectionData) {
        selectedMovieCollectionName.textContent = collectionData.name;
        loadMovieView(collectionData);
      }
    }
  }
}

/**
 * Manipula a mudança do tipo de mídia (série/filme)
 */
function handleMediaTypeChange() {
  const { mediaTypeSelect, seriesOrganizer, movieOrganizer, collectionSelect } =
    getDOMElements();
  const selectedType = mediaTypeSelect.value;

  seriesOrganizer.style.display = selectedType === "series" ? "block" : "none";
  movieOrganizer.style.display = selectedType === "movies" ? "block" : "none";

  collectionSelect.innerHTML =
    '<option value="new" selected>Cadastrar Nova...</option>';
  const library = selectedType === "series" ? seriesLibrary : movieLibrary;

  Object.values(library)
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach((item) => {
      const option = document.createElement("option");
      option.value = item.id;
      option.textContent = item.name;
      collectionSelect.appendChild(option);
    });

  handleCollectionChange();
}

/**
 * Salva as informações da série que estão no organizador
 */
function handleSaveSeries() {
  const { seriesNameInput, seriesImdbIdInput, seasonList, collectionSelect } =
    getDOMElements();
  const name = seriesNameInput.value.trim();
  const imdbInputValue = seriesImdbIdInput.value.trim();
  const imdbId = extractImdbId(imdbInputValue);

  if (!name && !imdbId) {
    console.log(
      "É obrigatório preencher pelo menos o Nome ou o ID/Link do IMDb."
    );
    return;
  }

  let currentId = collectionSelect.value;
  const isNew = currentId === "new";

  if (isNew) {
    currentId = generateUniqueId();
  }

  seriesLibrary[currentId] = {
    ...(seriesLibrary[currentId] || {}),
    id: currentId,
    name: name || `Série ${currentId.substring(0, 5)}`, // Nome fallback
    imdbLink: imdbInputValue,
    seasons: {},
  };

  const seasons = {};
  seasonList.querySelectorAll(".season-item").forEach((seasonEl) => {
    const title = seasonEl.querySelector(".season-title").textContent;
    const seasonNumberMatch = title.match(/\d+/);
    if (!seasonNumberMatch) return;
    const seasonNumber = seasonNumberMatch[0];

    const files = {};
    let fileOrder = 0;
    seasonEl.querySelectorAll(".media-item").forEach((fileEl) => {
      const fileKey = fileEl.dataset.fileKey; // O link original do arquivo
      if (fileKey && fileEl.dataset.fileData) {
        const fileData = JSON.parse(fileEl.dataset.fileData);
        files[fileKey] = {
          ...fileData,
          order: fileOrder++,
        };
      }
    });

    if (Object.keys(files).length > 0) {
      seasons[seasonNumber] = { files };
    }
  });
  seriesLibrary[currentId].seasons = seasons;

  saveMediaLibrary("series", seriesLibrary);
  console.log(`Série "${seriesLibrary[currentId].name}" salva com sucesso!`);

  if (isNew) {
    handleMediaTypeChange();
    getDOMElements().collectionSelect.value = currentId;
    handleCollectionChange();
  }
}

/**
 * Salva uma coleção de filmes
 */
function handleSaveMovieCollection() {
  const { movieCollectionNameInput, collectionSelect } = getDOMElements();
  const name = movieCollectionNameInput.value.trim();

  if (!name) {
    console.log("O nome da coleção de filmes é obrigatório.");
    return;
  }

  const nameExists = Object.values(movieLibrary).some(
    (collection) => collection.name.toLowerCase() === name.toLowerCase()
  );
  if (nameExists) {
    console.log(`Uma coleção com o nome "${name}" já existe.`);
    return;
  }

  const newId = generateUniqueId();
  movieLibrary[newId] = {
    id: newId,
    name: name,
    movies: {},
  };

  saveMediaLibrary("movies", movieLibrary);
  console.log(`Coleção "${name}" criada com sucesso!`);

  movieCollectionNameInput.value = "";
  handleMediaTypeChange();
  getDOMElements().collectionSelect.value = newId;
  handleCollectionChange();
}

/**
 * Manipula uma ação de arquivo (Streaming, Download, Atualizar).
 * @param {'stream' | 'download' | 'update'} actionType - O tipo de ação a ser executada.
 * @param {HTMLElement} buttonElement - O elemento do botão que foi clicado.
 */
async function handleFileAction(actionType, buttonElement) {
  const itemElement = buttonElement.closest(".media-item");
  if (!itemElement) return;

  const apiKey = getRdApiKey();
  if (!apiKey) {
    console.log("API Key do Real-Debrid não configurada.");
    return;
  }

  const { mediaTypeSelect, collectionSelect } = getDOMElements();
  const mediaType = mediaTypeSelect.value;
  const collectionId = collectionSelect.value;

  let fileData, fileKey;
  let library, saveCallback, updateElementCallback;

  if (mediaType === "movies") {
    library = movieLibrary;
    fileKey = itemElement.dataset.internalId; // Chave é o ID interno
    fileData = library[collectionId]?.movies[fileKey];

    saveCallback = () => saveMediaLibrary("movies", library);
    updateElementCallback = (newFileData) => {
      const updatedItem = renderMovieItem(newFileData);
      itemElement.replaceWith(updatedItem);
    };
  } else {
    // mediaType === 'series'
    library = seriesLibrary;
    const seasonItem = itemElement.closest(".season-item");
    if (!seasonItem) {
      console.log("Erro: seasonItem não encontrado");
      return;
    }

    const seasonTitle = seasonItem.querySelector(".season-title").textContent;
    const seasonNumber = seasonTitle.match(/\d+/)[0];
    fileKey = itemElement.dataset.fileKey; // Chave é o link original
    fileData = library[collectionId]?.seasons[seasonNumber]?.files[fileKey];

    saveCallback = () => saveMediaLibrary("series", library);
    updateElementCallback = (newFileData) => {
      const episodeData = {
        internalId: fileKey,
        originalFileData: newFileData,
      };
      const updatedItem = renderSeriesEpisodeItem(episodeData);
      itemElement.replaceWith(updatedItem);
    };
  }

  if (!fileData) {
    console.log("Erro: Não foi possível encontrar os dados do arquivo.");
    return;
  }

  const originalLink =
    mediaType === "movies" ? fileData.originalFileData.fileLink : fileKey;
  const forceUpdate = actionType === "update";

  buttonElement.disabled = true;
  const originalText = buttonElement.textContent;
  buttonElement.textContent = "Aguarde...";

  try {
    // Etapa 1: Obter o link desrestringido (se necessário)
    if (!fileData.unrestrictedLink || forceUpdate) {
      const unrestricResult = await unrestrictLink(apiKey, {
        link: originalLink,
      });
      fileData.unrestrictedLink = unrestricResult.download;
      fileData.unrestrictedId = unrestricResult.id; // ID para transcodificação
      fileData.streamable = unrestricResult.streamable; // Salva o status de streamable
      saveCallback();
      console.log("Link desrestringido atualizado:", fileData);

      // Atualiza o item na UI para refletir o novo estado (ex: botão de stream)
      if (mediaType === "movies") {
        updateElementCallback(fileData);
      } else {
        updateElementCallback(fileData);
      }
    }

    if (actionType === "update") {
      console.log("Links atualizados com sucesso!");
      return;
    }

    // Etapa 2: Executar a ação
    if (actionType === "download") {
      window.open(fileData.unrestrictedLink, "_blank");
    }
  } catch (error) {
    console.log(`Erro ao executar a ação: ${error.message}`);
    console.error("Erro na ação do arquivo:", error);
  } finally {
    buttonElement.disabled = false;
    buttonElement.textContent = originalText;
  }
}

/**
 * Salva (auto-save) os dados de um episódio de série na coleção em memória e no storage.
 * @param {HTMLElement} episodeItemElement - O elemento <li> do item do episódio.
 */
function handleSaveSeriesEpisode(episodeItemElement) {
  const { collectionSelect } = getDOMElements();
  const seriesId = collectionSelect.value;

  if (!seriesId || seriesId === "new") return;

  const seasonItem = episodeItemElement.closest(".season-item");
  if (!seasonItem) return;

  const seasonTitle = seasonItem.querySelector(".season-title").textContent;
  const seasonNumberMatch = seasonTitle.match(/\d+/);
  if (!seasonNumberMatch) return;
  const seasonNumber = seasonNumberMatch[0];

  const fileKey = episodeItemElement.dataset.fileKey; // this is the original link
  if (!fileKey) return;

  const fileData = JSON.parse(episodeItemElement.dataset.fileData);

  const episodeData = {
    ...fileData,
    order: Array.from(episodeItemElement.parentElement.children).indexOf(
      episodeItemElement
    ),
  };

  // Ensure library structure exists
  if (!seriesLibrary[seriesId]) return; // Should not happen if an item is dropped
  if (!seriesLibrary[seriesId].seasons) {
    seriesLibrary[seriesId].seasons = {};
  }
  if (!seriesLibrary[seriesId].seasons[seasonNumber]) {
    seriesLibrary[seriesId].seasons[seasonNumber] = { files: {} };
  }

  // Save the episode data
  seriesLibrary[seriesId].seasons[seasonNumber].files[fileKey] = episodeData;

  saveMediaLibrary("series", seriesLibrary);
  console.log(
    `Episódio "${episodeData.fileName}" salvo na temporada ${seasonNumber}.`
  );
}

/**
 * Remove um item de mídia (filme ou episódio) do organizador e da biblioteca.
 * @param {HTMLElement} removeBtn - O botão de remover que foi clicado.
 */
function handleRemoveMediaItem(removeBtn) {
  const mediaItem = removeBtn.closest(".media-item");
  if (!mediaItem) return;

  const { collectionSelect } = getDOMElements();
  const collectionId = collectionSelect.value;
  const isMovie = mediaItem.classList.contains("movie-item");

  if (isMovie) {
    const movieId = mediaItem.dataset.internalId;
    if (
      movieLibrary[collectionId] &&
      movieLibrary[collectionId].movies[movieId]
    ) {
      delete movieLibrary[collectionId].movies[movieId];
      saveMediaLibrary("movies", movieLibrary);
      console.log("Filme removido da coleção.");
    }
  } else {
    // É um episódio de série
    const seasonItem = mediaItem.closest(".season-item");
    if (!seasonItem) return;

    const seasonTitle = seasonItem.querySelector(".season-title").textContent;
    const seasonNumberMatch = seasonTitle.match(/\d+/);
    if (!seasonNumberMatch) return;
    const seasonNumber = seasonNumberMatch[0];
    const fileKey = mediaItem.dataset.fileKey;

    if (
      seriesLibrary[collectionId] &&
      seriesLibrary[collectionId].seasons[seasonNumber] &&
      seriesLibrary[collectionId].seasons[seasonNumber].files[fileKey]
    ) {
      delete seriesLibrary[collectionId].seasons[seasonNumber].files[fileKey];
      saveMediaLibrary("series", seriesLibrary);
      console.log(`Episódio da temporada ${seasonNumber} removido.`);
    }
  }

  const episodeList = mediaItem.parentElement;
  mediaItem.remove();
  checkAndAddNewSlot(episodeList, isMovie);
}

function initEventListeners() {
  const elements = getDOMElements();

  // Main page actions
  elements.actionButton.addEventListener("click", handleAddLink);
  elements.syncButton.addEventListener("click", syncTorrents);

  // Filter controls
  let filterTimeout;
  elements.filterInput.addEventListener("input", (e) => {
    clearTimeout(filterTimeout);
    filterTimeout = setTimeout(() => {
      applyFileFilter(e.target.value);
    }, 300);
  });
  elements.filterInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      clearTimeout(filterTimeout);
      applyFileFilter(e.target.value);
    }
  });
  elements.videoOnlyCheckbox.addEventListener(
    "change",
    renderTorrentsFromCache
  );

  // Drag and Drop for file list
  initTorrentDrag();

  // Organizer Panel (Right side)
  const organizer = document.querySelector(".organizer-content");
  if (organizer) {
    organizer.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    });
    organizer.addEventListener("dragenter", (e) => e.preventDefault());
    organizer.addEventListener("drop", (e) => {
      e.preventDefault();
      if (
        e.target.classList.contains("drop-zone") &&
        !e.target.classList.contains("filled")
      ) {
        try {
          const data = JSON.parse(e.dataTransfer.getData("application/json"));
          handleDropOnOrganizer(e.target, data);
        } catch (error) {
          console.error("Erro ao processar drop:", error);
        }
      }
    });
    organizer.addEventListener("dragover", (e) => {
      const dropZone = e.target.closest(".drop-zone, .media-item");
      if (dropZone) dropZone.classList.add("drag-over");
    });
    organizer.addEventListener("dragleave", (e) => {
      const dropZone = e.target.closest(".drop-zone, .media-item");
      if (dropZone && !dropZone.contains(e.relatedTarget)) {
        dropZone.classList.remove("drag-over");
      }
    });

    const seasonList = document.querySelector("#series-organizer .season-list");
    if (seasonList) {
      seasonList.addEventListener("click", (e) => {
        if (
          e.target.classList.contains("remove-season-btn") ||
          e.target.closest(".remove-season-btn")
        ) {
          const removeBtn = e.target.classList.contains("remove-season-btn")
            ? e.target
            : e.target.closest(".remove-season-btn");
          const seasonItem = removeBtn.closest(".season-item");
          if (seasonItem) confirmAndRemoveSeason(seasonItem);
        }
      });
    }

    const addSeasonBtn = document.getElementById("add-season-btn");
    if (addSeasonBtn) addSeasonBtn.addEventListener("click", addNewSeason);

    const addMovieBtn = document.getElementById("add-movie-btn");
    if (addMovieBtn) addMovieBtn.addEventListener("click", handleAddMovieSlot);

    // --- New Listeners for Organizer ---
    const {
      mediaTypeSelect,
      collectionSelect,
      saveSeriesBtn,
      fetchSeriesMetadataBtn,
      saveMovieCollectionBtn,
      movieList,
    } = getDOMElements();

    mediaTypeSelect.addEventListener("change", handleMediaTypeChange);
    if (collectionSelect) {
      collectionSelect.addEventListener("change", handleCollectionChange);
    }
    if (saveSeriesBtn) {
      saveSeriesBtn.addEventListener("click", handleSaveSeries);
    }
    if (fetchSeriesMetadataBtn) {
      fetchSeriesMetadataBtn.addEventListener(
        "click",
        handleFetchSeriesMetadata
      );
    }
    if (saveMovieCollectionBtn) {
      saveMovieCollectionBtn.addEventListener(
        "click",
        handleSaveMovieCollection
      );
    }

    // --- Listener geral para o conteúdo do organizador ---
    const organizerContent = document.querySelector(".organizer-content");
    if (organizerContent) {
      organizerContent.addEventListener("click", (e) => {
        const target = e.target;

        // Ações de arquivo (Download, Update)
        if (target.matches(".update-btn")) {
          handleFileAction("update", target);
        }

        // Busca de metadados de filme
        if (target.matches(".fetch-movie-metadata-btn")) {
          handleFetchMovieMetadata(target);
        }

        // Remover item de mídia
        if (target.matches(".remove-file-btn")) {
          handleRemoveMediaItem(target);
        }
      });

      organizerContent.addEventListener(
        "blur",
        (e) => {
          if (e.target.matches(".movie-name-input, .movie-imdb-input")) {
            const movieItem = e.target.closest(".movie-item");
            if (movieItem) {
              handleSaveMovieItem(movieItem);
            }
          }
        },
        true
      );
    }
  }
}

export function initManagement() {
  const elements = getDOMElements();
  if (!elements.torrentList) return;

  renderTorrentsFromCache();
  initEventListeners();
  handleMediaTypeChange(); // Garante que o estado inicial do organizador seja carregado
}
