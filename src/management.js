import { getRdApiKey, saveTorrentData, getAllTorrentData } from "./config.js";
import { getTorrents, addMagnet, getTorrentInfo } from "./api.js";

function getDOMElements() {
  return {
    torrentList: document.querySelector(".management-view .torrent-list"),
    actionInput: document.querySelector(".management-view .action-input"),
    actionButton: document.querySelector(".management-view .action-button"),
    syncButton: document.getElementById("sync-torrents-btn"),
  };
}

function renderTorrentItem(torrent) {
  const item = document.createElement("div");
  item.className = "torrent-item";
  item.dataset.id = torrent.id;

  const statusMap = {
    magnet_error: "Erro de Magnet",
    magnet_conversion: "Convertendo Magnet",
    waiting_files_selection: "Aguardando seleção",
    queued: "Na fila",
    downloading: "Baixando",
    downloaded: "Completo",
    error: "Erro",
    virus: "Vírus detectado",
    compressing: "Comprimindo",
    uploading: "Enviando",
    dead: "Morto",
  };

  const statusText = statusMap[torrent.status] || torrent.status;
  const progress = torrent.progress || 0;
  const statusWithProgress =
    torrent.status === "downloading"
      ? `${statusText} (${progress}%)`
      : statusText;

  // Gera a lista de arquivos se existirem
  let filesHtml = "";
  if (torrent.files && torrent.files.length > 0) {
    const fileItems = torrent.files
      .map((file, index) => {
        // Associa o arquivo ao link de download correspondente
        const downloadLink = torrent.links[index] || "#";
        // Pega apenas o nome do arquivo, não o caminho completo
        const fileName = file.path.split("/").pop();
        return `<div class="file-item" data-link="${downloadLink}" draggable="true">🎬 ${fileName}</div>`;
      })
      .join("");

    filesHtml = `<div class="file-list">${fileItems}</div>`;
  } else if (torrent.status === "downloaded" && torrent.links.length > 0) {
    // Fallback para caso não tenha a lista de arquivos mas tenha links (ex: download de link único)
    const fileItems = torrent.links
      .map((link) => {
        return `<div class="file-item" data-link="${link}" draggable="true">🎬 ${torrent.filename}</div>`;
      })
      .join("");
    filesHtml = `<div class="file-list">${fileItems}</div>`;
  }

  item.innerHTML = `
        <div class="torrent-header">
            <div class="name">${torrent.filename}</div>
            <div class="status">${statusWithProgress}</div>
        </div>
        ${filesHtml}
    `;

  // Adiciona evento de clique para expandir/recolher
  item.querySelector(".torrent-header").addEventListener("click", () => {
    item.classList.toggle("selected");
  });

  return item;
}

/**
 * Renderiza uma lista de torrents na tela.
 * @param {Array<object>} torrents A lista de torrents a ser renderizada.
 */
function renderTorrentList(torrents) {
  const { torrentList } = getDOMElements();
  torrentList.innerHTML = ""; // Limpa a lista atual

  if (!torrents || torrents.length === 0) {
    torrentList.innerHTML =
      '<p class="empty-state">Nenhum torrent local encontrado. Clique em "Sincronizar" para buscar na sua conta.</p>';
    return;
  }

  torrents.forEach((torrent) => {
    const torrentElement = renderTorrentItem(torrent);
    torrentList.appendChild(torrentElement);
  });
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

  torrentList.addEventListener("dragstart", (e) => {
    if (e.target.classList.contains("file-item")) {
      e.target.classList.add("dragging");
      const torrentId = e.target.closest(".torrent-item").dataset.id;
      const fileLink = e.target.dataset.link;
      const fileName = e.target.textContent;

      const data = JSON.stringify({ torrentId, fileLink, fileName });
      e.dataTransfer.setData("application/json", data);
      e.dataTransfer.effectAllowed = "move";
    }
  });

  torrentList.addEventListener("dragend", (e) => {
    if (e.target.classList.contains("file-item")) {
      e.target.classList.remove("dragging");
    }
  });
}

export function initManagement() {
  const elements = getDOMElements();
  if (!elements.torrentList) return;

  renderTorrentsFromCache();
  initTorrentDrag();

  elements.actionButton.addEventListener("click", handleAddLink);
  elements.syncButton.addEventListener("click", syncTorrents);

  console.log("✅ Módulo de Gerenciamento inicializado.");
}
