/**
 * Módulo de Navegação
 * Responsável por gerenciar a navegação entre os diferentes menus da aplicação
 */

import { initManagement } from "./management.js";
import { initSettings } from "./settings.js";
import { initApiExplorer } from "./api-explorer.js";

const LAST_ACTIVE_MENU_KEY = "rdmm_lastActiveMenu";

// Mapeia IDs de menu para suas funções de inicialização para carregamento sob demanda
const moduleInitializers = {
  management: initManagement,
  settings: initSettings,
  "api-explorer": initApiExplorer,
  // Futuros módulos de página podem ser adicionados aqui
  // series: initSeries,
};

class NavigationManager {
  constructor() {
    this.currentMenu = null;
    this.menuStack = [];
    this.menuElements = new Map();
    this.initializedModules = new Set(); // Rastreia módulos já inicializados

    this.init();
  }

  /**
   * Inicializa o sistema de navegação
   */
  init() {
    this.setupMenuElements();
    this.setupEventListeners();
    this.showDefaultMenu();
  }

  /**
   * Configura os elementos de menu disponíveis
   */
  setupMenuElements() {
    const menus = document.querySelectorAll("[data-menu]");

    menus.forEach((menu) => {
      const menuId = menu.getAttribute("data-menu");
      this.menuElements.set(menuId, {
        element: menu,
        isVisible: false,
      });
    });
  }

  /**
   * Configura os listeners de eventos para botões de navegação
   */
  setupEventListeners() {
    // Botões de navegação
    const navButtons = document.querySelectorAll("[data-nav-to]");
    navButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        const targetMenu = button.getAttribute("data-nav-to");
        this.navigateTo(targetMenu);
      });
    });

    // Botões de voltar
    const backButtons = document.querySelectorAll("[data-nav-back]");
    backButtons.forEach((button) => {
      button.addEventListener("click", (e) => {
        e.preventDefault();
        this.goBack();
      });
    });

    // Navegação por teclas (opcional)
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.goBack();
      }
    });
  }

  /**
   * Navega para um menu específico
   * @param {string} menuId - ID do menu de destino
   * @param {boolean} addToStack - Se deve adicionar ao histórico de navegação
   */
  navigateTo(menuId, addToStack = true) {
    if (this.currentMenu === menuId || !this.menuElements.has(menuId)) {
      if (this.currentMenu !== menuId) {
        console.warn(`Menu "${menuId}" não encontrado`);
      }
      return;
    }

    // Inicializa o módulo associado a este menu se for a primeira vez
    this.initModule(menuId);

    // Adiciona menu atual ao stack se necessário
    if (addToStack && this.currentMenu) {
      this.menuStack.push(this.currentMenu);
    }

    // Esconde o menu atual
    if (this.currentMenu) {
      const currentMenuData = this.menuElements.get(this.currentMenu);
      if (currentMenuData && currentMenuData.isVisible) {
        currentMenuData.element.classList.remove("menu--visible");
        currentMenuData.isVisible = false;
      }
    }

    // Mostra o novo menu
    const menuData = this.menuElements.get(menuId);
    if (menuData) {
      menuData.element.classList.add("menu--visible");
      menuData.isVisible = true;
    }

    this.currentMenu = menuId;
    this.updateActiveLink(menuId);

    // Dispara evento customizado para outros módulos
    this.dispatchNavigationEvent("menuChanged", {
      from: this.menuStack[this.menuStack.length - 1] || null,
      to: menuId,
    });

    // Salva o menu recém-navegado no localStorage
    try {
      localStorage.setItem(LAST_ACTIVE_MENU_KEY, menuId);
    } catch (error) {
      console.error("Falha ao salvar o menu ativo no localStorage:", error);
    }
  }

  /**
   * Inicializa um módulo sob demanda, garantindo que seja executado apenas uma vez.
   * @param {string} menuId O ID do menu que corresponde ao módulo a ser inicializado.
   */
  initModule(menuId) {
    if (this.initializedModules.has(menuId)) {
      return; // Módulo já foi inicializado
    }

    const initializer = moduleInitializers[menuId];
    if (typeof initializer === "function") {
      try {
        console.log(`🚀 Inicializando módulo "${menuId}"...`);
        initializer();
        this.initializedModules.add(menuId);
      } catch (error) {
        console.error(`❌ Erro ao inicializar o módulo "${menuId}":`, error);
      }
    }
  }

  /**
   * Volta para o menu anterior
   */
  goBack() {
    if (this.menuStack.length === 0) return;

    const previousMenu = this.menuStack.pop();
    this.navigateTo(previousMenu, false);
  }

  /**
   * Atualiza o link ativo na navegação
   * @param {string} menuId - ID do menu que se tornou ativo
   */
  updateActiveLink(menuId) {
    const navButtons = document.querySelectorAll("[data-nav-to]");
    navButtons.forEach((button) => {
      if (button.getAttribute("data-nav-to") === menuId) {
        button.classList.add("active");
      } else {
        button.classList.remove("active");
      }
    });
  }

  /**
   * Mostra o menu padrão, priorizando o que está salvo no localStorage.
   */
  showDefaultMenu() {
    let menuToShow = null;

    try {
      const savedMenu = localStorage.getItem(LAST_ACTIVE_MENU_KEY);
      // Verifica se o menu salvo existe nos elementos de menu mapeados
      if (savedMenu && this.menuElements.has(savedMenu)) {
        menuToShow = savedMenu;
      }
    } catch (error) {
      console.error(
        "Erro ao acessar o localStorage para obter o último menu ativo:",
        error
      );
    }

    // Se nenhum menu salvo for válido, usa o menu padrão definido no HTML
    if (!menuToShow) {
      menuToShow =
        document
          .querySelector("[data-menu-default]")
          ?.getAttribute("data-menu") || this.menuElements.keys().next().value;
    }

    if (menuToShow) {
      // A chamada para navigateTo cuidará de salvar o estado no localStorage
      this.navigateTo(menuToShow, false);
    } else {
      console.error("Nenhum menu padrão ou salvo para exibir.");
    }
  }

  /**
   * Dispara eventos customizados de navegação
   * @param {string} eventType - Tipo do evento
   * @param {Object} detail - Detalhes do evento
   */
  dispatchNavigationEvent(eventType, detail) {
    const event = new CustomEvent(`navigation:${eventType}`, {
      detail,
      bubbles: true,
    });
    document.dispatchEvent(event);
  }

  /**
   * Obtém o menu atual
   * @returns {string|null} ID do menu atual
   */
  getCurrentMenu() {
    return this.currentMenu;
  }

  /**
   * Obtém o histórico de navegação
   * @returns {Array<string>} Array com IDs dos menus no histórico
   */
  getNavigationHistory() {
    return [...this.menuStack];
  }

  /**
   * Limpa o histórico de navegação
   */
  clearHistory() {
    this.menuStack = [];
  }
}

// Instância singleton do gerenciador de navegação
let navigationManager = null;

/**
 * Inicializa o sistema de navegação
 * @returns {NavigationManager} Instância do gerenciador
 */
export function initNavigation() {
  if (!navigationManager) {
    navigationManager = new NavigationManager();
  }
  return navigationManager;
}

/**
 * Obtém a instância atual do gerenciador de navegação
 * @returns {NavigationManager|null} Instância do gerenciador ou null se não inicializado
 */
export function getNavigation() {
  return navigationManager;
}

/**
 * Navega para um menu específico
 * @param {string} menuId - ID do menu de destino
 */
export function navigateTo(menuId) {
  if (navigationManager) {
    navigationManager.navigateTo(menuId);
  }
}

/**
 * Volta para o menu anterior
 */
export function goBack() {
  if (navigationManager) {
    navigationManager.goBack();
  }
}

// Exporta a classe para uso avançado
export { NavigationManager };

// Log para verificar se o módulo foi carregado
console.log("📱 Módulo de navegação carregado com sucesso!", {
  timestamp: new Date().toLocaleTimeString(),
  available: typeof NavigationManager !== "undefined",
});

// Debug: Verifica se há elementos de menu no DOM quando o módulo carrega
document.addEventListener("DOMContentLoaded", () => {
  console.log("🔍 Debug - Verificando elementos de menu no DOM:", {
    menusEncontrados: document.querySelectorAll("[data-menu]").length,
    botoesNavegacao: document.querySelectorAll("[data-nav-to]").length,
    botoesVoltar: document.querySelectorAll("[data-nav-back]").length,
    menuPadrao:
      document
        .querySelector("[data-menu-default]")
        ?.getAttribute("data-menu") || "nenhum",
  });
});
