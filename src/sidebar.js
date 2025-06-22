/**
 * Módulo para gerenciar a sidebar e seus componentes.
 */

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
 * Inicializa o módulo da sidebar.
 */
export function initSidebar() {
  // Define o status inicial como desconectado
  updateSidebarApiStatus("disconnected");
  console.log("✅ Módulo da sidebar inicializado.");
}
