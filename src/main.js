/**
 * Arquivo principal da aplicação
 * Responsável por inicializar todos os módulos e configurações
 */

import { initNavigation } from "./navigation.js";

// A inicialização dos módulos de página (management, settings, etc.)
// e da sidebar agora é tratada dinamicamente pelo NavigationManager.

/**
 * Inicializa a aplicação
 */
function initApp() {
  console.log("🚀 Inicializando aplicação...");

  // Inicializa o sistema de navegação, que cuidará do resto
  initNavigation();

  console.log("🎉 Aplicação inicializada com sucesso!");
}

// Aguarda o DOM estar pronto e inicializa a aplicação
document.addEventListener("DOMContentLoaded", initApp);

// Exporta função de inicialização para uso em outros contextos se necessário
export { initApp };
