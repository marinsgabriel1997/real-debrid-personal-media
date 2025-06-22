/**
 * Módulo para gerenciar a lógica da página de Configurações.
 */

import {
  getRdApiKey,
  setRdApiKey,
  removeRdApiKey,
  getTmdbApiKey,
  setTmdbApiKey,
  removeTmdbApiKey,
} from "./config.js";
import { validateApiKey, getTraffic, validateTmdbApiKey } from "./api.js";
import { updateSidebarApiStatus } from "./sidebar.js";

/**
 * Agrupa a busca por elementos do DOM para fácil manutenção.
 * @returns {object} Um objeto com os elementos do DOM.
 */
function getDOMElements() {
  return {
    rdApiKeyInput: document.getElementById("rd-api-key"),
    saveRdApiKeyBtn: document.getElementById("save-rd-api-key"),
    removeRdApiKeyBtn: document.getElementById("remove-rd-api-key"),
    forceUserCheckBtn: document.getElementById("force-user-check"),
    apiStatusIndicator: document.getElementById("api-status-indicator"),
    usernameSpan: document.getElementById("user-username"),
    userTypeSpan: document.getElementById("user-type"),
    userExpirationSpan: document.getElementById("user-expiration"),
    userPointsSpan: document.getElementById("user-points"),
    trafficGrid: document.getElementById("traffic-details-grid"),
    exportBtn: document.getElementById("export-data-btn"),
    importBtn: document.getElementById("import-data-btn"),
    importInput: document.getElementById("import-file-input"),
    clearBtn: document.getElementById("clear-data-btn"),
    // TMDB elements
    tmdbApiKeyInput: document.getElementById("tmdb-api-key"),
    saveTmdbApiKeyBtn: document.getElementById("save-tmdb-api-key"),
    removeTmdbApiKeyBtn: document.getElementById("remove-tmdb-api-key"),
  };
}

/**
 * Atualiza o indicador visual de status da API.
 * @param {'ok'|'error'|'loading'|'none'} status O status a ser exibido.
 */
function updateApiStatus(status) {
  const { apiStatusIndicator } = getDOMElements();
  apiStatusIndicator.className = "api-status"; // Reseta as classes
  apiStatusIndicator.title = `Status da API: ${status}`;
  if (status !== "none") {
    apiStatusIndicator.classList.add(status);
  }

  // Atualiza também o status na sidebar
  switch (status) {
    case "ok":
      updateSidebarApiStatus("connected");
      break;
    case "loading":
      updateSidebarApiStatus("loading");
      break;
    case "error":
      updateSidebarApiStatus("error");
      break;
    case "none":
    default:
      updateSidebarApiStatus("disconnected");
      break;
  }
}

/**
 * Limpa os dados do usuário e de tráfego da tela.
 */
function clearUserData() {
  const elements = getDOMElements();
  elements.usernameSpan.textContent = "--";
  elements.userTypeSpan.textContent = "--";
  elements.userExpirationSpan.textContent = "--";
  elements.userPointsSpan.textContent = "--";
  elements.trafficGrid.innerHTML =
    '<p class="empty-state">Valide sua API para carregar os dados.</p>';
}

/**
 * Exibe os dados do usuário na tela.
 * @param {object} userData Dados do usuário.
 */
function displayUserData(userData) {
  const elements = getDOMElements();
  elements.usernameSpan.textContent = userData.username;
  elements.userTypeSpan.textContent =
    userData.type === "premium" ? "Premium" : "Gratuito";
  elements.userExpirationSpan.textContent = new Date(
    userData.expiration
  ).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  elements.userPointsSpan.textContent = userData.points;
}

/**
 * Exibe os dados de tráfego do hoster na grade.
 * @param {object} trafficData Os dados de tráfego da API.
 */
function displayTrafficData(trafficData) {
  const { trafficGrid } = getDOMElements();
  trafficGrid.innerHTML = ""; // Limpa a grade

  const hosters = Object.keys(trafficData);

  if (hosters.length === 0) {
    trafficGrid.innerHTML =
      '<p class="empty-state">Nenhum dado de tráfego de hoster limitado disponível.</p>';
    return;
  }

  // Helper para converter bytes em uma unidade legível
  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  };

  hosters.forEach((host) => {
    const data = trafficData[host];
    // A API retorna o limite em GB, então convertemos para bytes.
    const limitBytes = (data.limit || 0) * 1024 * 1024 * 1024;
    const usedBytes = data.bytes || 0;
    const percentage = limitBytes > 0 ? (usedBytes / limitBytes) * 100 : 0;

    const item = document.createElement("div");
    item.className = "traffic-item";
    item.innerHTML = `
      <span class="hoster-name" title="${host}">${host}</span>
      <div class="progress-bar" title="${percentage.toFixed(2)}%">
        <div class="progress" style="width: ${percentage}%"></div>
      </div>
      <span class="traffic-usage">${formatBytes(usedBytes)} / ${
      data.limit
    } GB</span>
    `;
    trafficGrid.appendChild(item);
  });
}

/**
 * Busca os dados da API, exibe na tela e armazena em cache.
 * @param {string} apiKey A chave de API do Real-Debrid.
 * @returns {Promise<void>}
 */
async function fetchAndDisplayData(apiKey) {
  updateApiStatus("loading");
  try {
    const userData = await validateApiKey(apiKey);
    const trafficData = await getTraffic(apiKey);

    localStorage.setItem("rdUserData", JSON.stringify(userData));
    localStorage.setItem("rdTrafficData", JSON.stringify(trafficData));

    displayUserData(userData);
    displayTrafficData(trafficData);
    updateApiStatus("ok");
  } catch (error) {
    updateApiStatus("error");
    clearUserData();
    localStorage.removeItem("rdUserData");
    localStorage.removeItem("rdTrafficData");
    console.error("Falha ao carregar dados do usuário:", error);
    // Propaga o erro para que os chamadores possam lidar com ele (ex: no save).
    throw error;
  }
}

/**
 * Carrega e exibe os dados do usuário se uma API key válida existir.
 * @param {boolean} [forceRefresh=false] - Se true, ignora o cache e busca os dados da API.
 */
async function loadAndDisplayInitialData(forceRefresh = false) {
  const { rdApiKeyInput, tmdbApiKeyInput } = getDOMElements();

  // Carrega chave do Real-Debrid
  const rdApiKey = getRdApiKey();
  if (!rdApiKey) {
    clearUserData();
    updateApiStatus("none");
    rdApiKeyInput.value = "";
  } else {
    rdApiKeyInput.value = rdApiKey;

    const cachedUserData = JSON.parse(localStorage.getItem("rdUserData"));
    const isUserDataExpired = cachedUserData
      ? new Date(cachedUserData.expiration) < new Date()
      : true;

    if (cachedUserData && !isUserDataExpired && !forceRefresh) {
      console.log("Usando dados de usuário e tráfego do cache.");
      const cachedTrafficData = JSON.parse(
        localStorage.getItem("rdTrafficData")
      );

      displayUserData(cachedUserData);
      if (cachedTrafficData) {
        displayTrafficData(cachedTrafficData);
      } else {
        // Se por algum motivo os dados de tráfego não estiverem em cache, busca-os.
        getTraffic(rdApiKey).then((trafficData) => {
          displayTrafficData(trafficData);
          localStorage.setItem("rdTrafficData", JSON.stringify(trafficData));
        });
      }
      updateApiStatus("ok");
    } else {
      console.log(
        forceRefresh
          ? "Forçando atualização dos dados."
          : "Cache inválido ou expirado. Buscando novos dados."
      );
      await fetchAndDisplayData(rdApiKey).catch(() => {
        // O erro já é tratado e logado dentro de fetchAndDisplayData
      });
    }
  }

  // Carrega chave do TMDB
  const tmdbApiKey = getTmdbApiKey();
  if (tmdbApiKey) {
    tmdbApiKeyInput.value = tmdbApiKey;
  } else {
    tmdbApiKeyInput.value = "";
  }
}

/**
 * Manipula o clique no botão de salvar API key.
 */
async function handleSaveApiKey() {
  const { rdApiKeyInput } = getDOMElements();
  const apiKey = rdApiKeyInput.value.trim();

  if (!apiKey) {
    alert("Por favor, insira uma API Key para salvar.");
    return;
  }

  updateApiStatus("loading");

  try {
    // A função fetchAndDisplayData já valida, busca, exibe e armazena em cache.
    await fetchAndDisplayData(apiKey);
    setRdApiKey(apiKey);
    alert("API Key válida e salva com sucesso!");
  } catch (error) {
    updateApiStatus("error");
    alert(`Erro ao validar a API Key: ${error.message}`);
    removeRdApiKey(); // Limpa a chave da configuração
    clearUserData(); // Limpa a tela
  }
}

/**
 * Manipula a remoção da API key.
 */
function handleRemoveApiKey() {
  if (!confirm("Tem certeza que deseja remover sua API Key?")) {
    return;
  }

  const { rdApiKeyInput } = getDOMElements();
  removeRdApiKey();
  localStorage.removeItem("rdUserData");
  localStorage.removeItem("rdTrafficData");

  rdApiKeyInput.value = "";
  clearUserData();
  updateApiStatus("none");
  alert("API Key removida com sucesso.");
}

/**
 * Manipula o clique no botão de salvar API key do TMDB.
 */
async function handleSaveTmdbApiKey() {
  const { tmdbApiKeyInput } = getDOMElements();
  const apiKey = tmdbApiKeyInput.value.trim();

  if (!apiKey) {
    alert("Por favor, insira uma API Key do TMDB para salvar.");
    return;
  }

  // Adicionar um feedback de loading seria uma boa melhoria futura.
  try {
    await validateTmdbApiKey(apiKey);
    setTmdbApiKey(apiKey);
    alert("API Key do TMDB válida e salva com sucesso!");
  } catch (error) {
    alert(`Erro ao validar a API Key do TMDB: ${error.message}`);
    // Mantemos a chave no input para que o usuário possa corrigir.
  }
}

/**
 * Manipula a remoção da API key do TMDB.
 */
function handleRemoveTmdbApiKey() {
  const { tmdbApiKeyInput } = getDOMElements();
  removeTmdbApiKey();
  tmdbApiKeyInput.value = "";
  alert("API Key do TMDB removida com sucesso.");
}

/**
 * Manipula a exportação de dados.
 */
function handleExportData() {
  const data = JSON.stringify(localStorage, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rd-media-manager-backup-${
    new Date().toISOString().split("T")[0]
  }.json`;
  a.click();
  URL.revokeObjectURL(url);
  a.remove();
}

/**
 * Manipula a importação de dados.
 */
function handleImportData() {
  const { importInput } = getDOMElements();
  importInput.click();
  importInput.onchange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (
          !confirm(
            "Tem certeza que deseja importar estes dados? Isso irá sobrescrever todas as suas configurações e biblioteca atuais."
          )
        ) {
          return;
        }
        localStorage.clear();
        for (const key in data) {
          localStorage.setItem(key, data[key]);
        }
        alert("Dados importados com sucesso! A página será recarregada.");
        location.reload();
      } catch (error) {
        alert("Erro ao ler o arquivo de backup. Ele está corrompido?");
        console.error("Erro no parsing do JSON de backup:", error);
      }
    };
    reader.readAsText(file);
    // Reseta o input para permitir importar o mesmo arquivo novamente
    importInput.value = "";
  };
}

/**
 * Manipula a limpeza de todos os dados.
 */
function handleClearData() {
  if (
    !confirm(
      "ATENÇÃO: Você tem certeza que deseja apagar TODOS os dados da aplicação? Isso inclui sua API key e toda a sua biblioteca. Esta ação é irreversível."
    )
  ) {
    return;
  }
  localStorage.clear();
  alert("Todos os dados foram apagados. A página será recarregada.");
  location.reload();
}

/**
 * Inicializa o módulo de Configurações, adicionando os event listeners.
 */
export function initSettings() {
  const elements = getDOMElements();
  if (!elements.saveRdApiKeyBtn) return; // Não executa se não estiver na página certa

  // Listeners do Real-Debrid
  elements.saveRdApiKeyBtn.addEventListener("click", handleSaveApiKey);
  elements.removeRdApiKeyBtn.addEventListener("click", handleRemoveApiKey);
  elements.forceUserCheckBtn.addEventListener("click", () =>
    loadAndDisplayInitialData(true)
  );

  // Listeners do TMDB
  elements.saveTmdbApiKeyBtn.addEventListener("click", handleSaveTmdbApiKey);
  elements.removeTmdbApiKeyBtn.addEventListener(
    "click",
    handleRemoveTmdbApiKey
  );

  // Listeners de Gerenciamento de Dados
  elements.exportBtn.addEventListener("click", handleExportData);
  elements.importBtn.addEventListener("click", handleImportData);
  elements.clearBtn.addEventListener("click", handleClearData);

  // Carrega os dados iniciais ao carregar a página
  loadAndDisplayInitialData();

  console.log("✅ Módulo de Configurações inicializado.");
}
