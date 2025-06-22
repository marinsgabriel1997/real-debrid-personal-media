/**
 * Arquivo principal da aplicação
 * Responsável por inicializar todos os módulos e configurações
 */

import { initNavigation } from "./navigation.js";
import { initSettings } from "./settings.js";
import { initSidebar } from "./sidebar.js";
import { initManagement } from "./management.js";
import { initOrganizer } from "./organizer.js";

/**
 * Inicializa a aplicação
 */
function initApp() {
  console.log("🚀 Inicializando aplicação...");

  // Inicializa o sistema de navegação
  const navigation = initNavigation();
  console.log("✅ Sistema de navegação inicializado:", navigation);

  // Inicializa o módulo da sidebar
  initSidebar();

  // Inicializa o módulo de configurações
  initSettings();

  // Inicializa o módulo de gerenciamento
  initManagement();

  // Inicializa o módulo do organizador
  initOrganizer();

  // Aqui você pode inicializar outros módulos futuramente
  // initAPI();
  // initUI();
  // etc...

  console.log("🎉 Aplicação inicializada com sucesso!");
}

// Aguarda o DOM estar pronto e inicializa a aplicação
document.addEventListener("DOMContentLoaded", initApp);

// Exporta função de inicialização para uso em outros contextos se necessário
export { initApp };
