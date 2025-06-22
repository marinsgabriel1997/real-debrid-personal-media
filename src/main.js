/**
 * Arquivo principal da aplicação
 * Responsável por inicializar todos os módulos e configurações
 */

import { initNavigation } from "./navigation.js";
import { initSidebar } from "./sidebar.js";

// A inicialização dos módulos de página (management, settings, etc.)
// agora é tratada dinamicamente pelo NavigationManager.

/**
 * Inicializa a aplicação
 */
function initApp() {
  console.log("🚀 Inicializando aplicação...");

  // Inicializa a sidebar, que é um componente global e persistente
  initSidebar();

  // Inicializa o sistema de navegação, que cuidará da inicialização dos módulos de página
  initNavigation();

  console.log("🎉 Aplicação inicializada com sucesso!");
}

// Aguarda o DOM estar pronto e inicializa a aplicação
document.addEventListener("DOMContentLoaded", initApp);

// Exporta função de inicialização para uso em outros contextos se necessário
export { initApp };
