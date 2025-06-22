/**
 * Módulo para gerenciar a lógica da página de Configurações.
 */

import {
  getRdApiKey,
  setRdApiKey,
  removeRdApiKey,
  getOmdbApiKey,
  setOmdbApiKey,
  removeOmdbApiKey,
  getUserData,
  removeUserData,
  getTrafficData,
  saveTrafficData,
  removeTrafficData,
} from "./config.js";
import { getTraffic, getMediaInfoFromOmdb } from "./api.js";
import { forceCheckApiStatus, updateApiStatus } from "./navigation.js";

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
    usernameSpan: document.getElementById("user-username"),
    userTypeSpan: document.getElementById("user-type"),
    userExpirationSpan: document.getElementById("user-expiration"),
    userPointsSpan: document.getElementById("user-points"),
    trafficGrid: document.getElementById("traffic-details-grid"),
    exportBtn: document.getElementById("export-data-btn"),
    importBtn: document.getElementById("import-data-btn"),
    importInput: document.getElementById("import-file-input"),
    clearBtn: document.getElementById("clear-data-btn"),
    // OMDb elements
    omdbApiKeyInput: document.getElementById("omdb-api-key"),
    saveOmdbApiKeyBtn: document.getElementById("save-omdb-api-key"),
    removeOmdbApiKeyBtn: document.getElementById("remove-omdb-api-key"),
  };
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
 * Busca e exibe os dados de tráfego.
 * @param {string} apiKey
 */
async function fetchAndDisplayTraffic(apiKey) {
  try {
    const trafficData = await getTraffic(apiKey);
    displayTrafficData(trafficData);
    saveTrafficData(trafficData); // Salva os dados no cache
  } catch (error) {
    console.error("Falha ao carregar dados de tráfego:", error);
    const { trafficGrid } = getDOMElements();
    trafficGrid.innerHTML =
      '<p class="empty-state text-danger">Erro ao carregar dados de tráfego.</p>';
  }
}

/**
 * Carrega e exibe os dados iniciais, usando o cache se disponível.
 * @param {boolean} [forceRefresh=false] - Força a atualização dos dados de tráfego.
 */
function loadAndDisplayInitialData(forceRefresh = false) {
  const { rdApiKeyInput, omdbApiKeyInput } = getDOMElements();
  const rdApiKey = getRdApiKey();
  rdApiKeyInput.value = rdApiKey || "";

  const userData = getUserData();

  if (userData) {
    displayUserData(userData);
    const cachedTraffic = getTrafficData();
    if (cachedTraffic && !forceRefresh) {
      console.log("Usando dados de tráfego do cache.");
      displayTrafficData(cachedTraffic);
    } else {
      console.log(
        forceRefresh
          ? "Forçando atualização dos dados de tráfego."
          : "Cache de tráfego vazio. Buscando novos dados."
      );
      fetchAndDisplayTraffic(rdApiKey);
    }
  } else {
    clearUserData();
  }

  // Atualiza o status da API na sidebar (ele decidirá se precisa de fetch)
  updateApiStatus();

  // Carrega chave do OMDb
  const omdbApiKey = getOmdbApiKey();
  if (omdbApiKey) {
    omdbApiKeyInput.value = omdbApiKey;
  } else {
    omdbApiKeyInput.value = "";
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

  // Define a chave temporariamente para que a verificação possa usá-la
  setRdApiKey(apiKey);

  const isValid = await forceCheckApiStatus();

  if (isValid) {
    alert("API Key válida e salva com sucesso!");
    // Recarrega os dados na tela com base na nova chave
    loadAndDisplayInitialData();
  } else {
    alert(`Erro ao validar a API Key. Verifique se a chave está correta.`);
    // A chave inválida já foi removida do storage pela forceCheckApiStatus
    rdApiKeyInput.value = "";
    clearUserData();
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
  removeUserData();
  removeTrafficData();

  rdApiKeyInput.value = "";
  clearUserData();
  updateApiStatus(); // Atualiza o status para desconectado
  alert("API Key removida com sucesso.");
}

/**
 * Manipula o clique no botão de salvar API key do OMDb.
 */
async function handleSaveOmdbApiKey() {
  const { omdbApiKeyInput } = getDOMElements();
  const apiKey = omdbApiKeyInput.value.trim();

  if (!apiKey) {
    alert("Por favor, insira uma API Key do OMDb para salvar.");
    return;
  }

  // Mostra um feedback visual (opcional, mas bom para UX)
  omdbApiKeyInput.style.borderColor = "#f39c12"; // Laranja para "loading"

  try {
    // Valida a chave fazendo uma busca de teste
    await getMediaInfoFromOmdb(apiKey, "tt1375666"); // "A Origem" como teste
    setOmdbApiKey(apiKey);
    omdbApiKeyInput.style.borderColor = "#2ecc71"; // Verde para "sucesso"
    alert("API Key do OMDb válida e salva com sucesso!");
  } catch (error) {
    omdbApiKeyInput.style.borderColor = "#e74c3c"; // Vermelho para "erro"
    alert(`Erro ao validar a API Key do OMDb: ${error.message}`);
  }
}

/**
 * Manipula a remoção da API key do OMDb.
 */
function handleRemoveOmdbApiKey() {
  const { omdbApiKeyInput } = getDOMElements();
  removeOmdbApiKey();
  omdbApiKeyInput.value = "";
  omdbApiKeyInput.style.borderColor = ""; // Reseta a borda
  alert("API Key do OMDb removida com sucesso.");
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
  elements.forceUserCheckBtn.addEventListener("click", async () => {
    const isValid = await forceCheckApiStatus();
    if (isValid) {
      loadAndDisplayInitialData(true); // Força a atualização do tráfego
    }
  });

  // Listeners do OMDb
  elements.saveOmdbApiKeyBtn.addEventListener("click", handleSaveOmdbApiKey);
  elements.removeOmdbApiKeyBtn.addEventListener(
    "click",
    handleRemoveOmdbApiKey
  );

  // Listeners de Gerenciamento de Dados
  elements.exportBtn.addEventListener("click", handleExportData);
  elements.importBtn.addEventListener("click", handleImportData);
  elements.clearBtn.addEventListener("click", handleClearData);

  // Carrega os dados iniciais ao carregar a página
  loadAndDisplayInitialData();

  console.log("✅ Módulo de Configurações inicializado.");
}
