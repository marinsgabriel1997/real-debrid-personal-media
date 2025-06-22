import { getRdApiKey, saveTorrentData, getAllTorrentData } from "./config.js";
import { getTorrents, addMagnet, getTorrentInfo } from "./api.js";

function getDOMElements() {
  return {
    torrentList: document.querySelector(".management-view .torrent-list"),
    actionInput: document.querySelector(".management-view .action-input"),
    actionButton: document.querySelector(".management-view .action-button"),
    syncButton: document.getElementById("sync-torrents-btn"),
    filterInput: document.getElementById("torrent-filter-input"),
    videoOnlyCheckbox: document.getElementById("video-only-checkbox"),
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
        const downloadLink = torrent.links[index] || "#";
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
          allFiles.push({
            name: torrent.filename,
            link: link,
            isVideo: isVideo,
            torrentName: torrent.filename,
            torrentId: torrent.id,
            torrentStatus: torrent.status,
          });
        });
      }
    }
  });

  if (allFiles.length === 0) {
    const emptyMessage = showVideoOnly
      ? "Nenhum arquivo de vídeo encontrado nos torrents."
      : "Nenhum arquivo encontrado nos torrents.";
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

async function handleAddLink() {
  const { actionInput, actionButton } = getDOMElements();
  const link = actionInput.value.trim();

  if (!link) {
    alert("Por favor, insira um magnet link.");
    return;
  }

  if (!link.startsWith("magnet:?")) {
    alert(
      "No momento, apenas magnet links são suportados. Por favor, insira um magnet válido."
    );
    return;
  }

  const apiKey = getRdApiKey();
  if (!apiKey) {
    alert(
      "A API Key não está configurada. Por favor, adicione-a nas Configurações."
    );
    return;
  }

  actionButton.disabled = true;
  actionButton.textContent = "Adicionando...";

  try {
    await addMagnet(apiKey, link);
    alert(
      "Magnet link adicionado com sucesso! Clique em Sincronizar para ver a atualização."
    );
    actionInput.value = "";
  } catch (error) {
    alert(`Erro ao adicionar o magnet link: ${error.message}`);
    console.error("Erro ao adicionar magnet:", error);
  } finally {
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
    alert(
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
  // Remove visual feedback
  dropZone.classList.remove("drag-over");

  // Fill the drop zone
  dropZone.classList.remove("drop-zone");
  dropZone.classList.add("filled-drop-zone");

  dropZone.innerHTML = `
    <div class="dropped-file">
      <span class="file-icon">🎬</span>
      <span class="file-name">${fileData.fileName}</span>
      <button class="remove-file-btn" title="Remover arquivo">✕</button>
    </div>
  `;

  // Store file data
  dropZone.dataset.fileData = JSON.stringify(fileData);

  // Add event listener for remove button
  const removeBtn = dropZone.querySelector(".remove-file-btn");
  removeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    removeFileFromOrganizer(dropZone);
  });

  // Make the filled zone draggable for reordering
  dropZone.draggable = true;

  dropZone.addEventListener("dragstart", (e) => {
    e.dataTransfer.setData("application/json", dropZone.dataset.fileData);
    e.dataTransfer.effectAllowed = "move";
    dropZone.classList.add("dragging");
  });

  dropZone.addEventListener("dragend", (e) => {
    dropZone.classList.remove("dragging");
  });

  // Check if we need to add a new slot
  const episodeList = dropZone.closest(".episode-list");
  const isMovieOrganizer = dropZone.closest("#movie-organizer") !== null;

  if (episodeList) {
    checkAndAddNewSlot(episodeList, isMovieOrganizer);
  }

  console.log(`Arquivo ${fileData.fileName} adicionado ao organizador`);
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
      if (seasonItem) {
        confirmAndRemoveSeason(seasonItem);
      }
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
      } else if (
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
    organizer.addEventListener("dragover", (e) => {
      const dropZone = e.target.closest(".drop-zone, .filled-drop-zone");
      if (dropZone) dropZone.classList.add("drag-over");
    });
    organizer.addEventListener("dragleave", (e) => {
      const dropZone = e.target.closest(".drop-zone, .filled-drop-zone");
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
  }
}

export function initManagement() {
  const elements = getDOMElements();
  if (!elements.torrentList) return;

  renderTorrentsFromCache();
  initEventListeners();
}
