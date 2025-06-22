/**
 * Módulo para gerenciar a sidebar e seus componentes.
 */

import { getRdApiKey } from "./config.js";
import { validateApiKey } from "./api.js";

/**
 * Atualiza o status da API no badge do header.
 * @param {'connected'|'disconnected'|'loading'|'error'} status O status da API.
 */
export function updateSidebarApiStatus(status) {
  const allApiStatusBadges = document.querySelectorAll(".api-status-badge");
  const allStatusSpans = document.querySelectorAll(".api-status-text");

  if (allApiStatusBadges.length === 0) return;

  let newClassName = "api-status-badge";
  let newText = "";

  // Define texto e classe baseado no status
  switch (status) {
    case "connected":
      newText = "API Conectada";
      newClassName += " api-connected";
      break;
    case "loading":
      newText = "Validando API...";
      newClassName += " api-loading";
      break;
    case "error":
      newText = "Erro na API";
      newClassName += " api-error";
      break;
    case "disconnected":
    default:
      newText = "API Desconectada";
      newClassName += " api-disconnected";
      break;
  }

  // Atualiza todos os elementos encontrados
  allApiStatusBadges.forEach((badge) => {
    badge.className = newClassName;
  });
  allStatusSpans.forEach((span) => {
    span.textContent = newText;
  });
}

/**
 * Verifica a API Key e atualiza o status na sidebar.
 */
async function checkAndSetApiStatus() {
  const apiKey = getRdApiKey();

  if (!apiKey) {
    updateSidebarApiStatus("disconnected");
    return;
  }

  updateSidebarApiStatus("loading");

  try {
    await validateApiKey(apiKey);
    updateSidebarApiStatus("connected");
  } catch (error) {
    updateSidebarApiStatus("error");
    console.error(
      "Erro ao validar API Key na inicialização da sidebar:",
      error
    );
  }
}

/**
 * Inicializa o módulo da sidebar.
 */
let isSidebarInitialized = false;
export function initSidebar() {
  if (isSidebarInitialized) return;

  // Realiza a primeira verificação de status
  checkAndSetApiStatus();

  // Adiciona um listener para re-verificar quando o usuário volta para a aba
  window.addEventListener("focus", checkAndSetApiStatus);

  isSidebarInitialized = true;
  console.log("✅ Módulo da sidebar inicializado e status da API verificado.");
}
