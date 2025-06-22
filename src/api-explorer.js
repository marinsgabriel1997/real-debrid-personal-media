/**
 * Módulo do API Explorer
 * Permite testar endpoints da API do Real-Debrid diretamente na interface
 */

import * as api from "./api.js";
import { getRdApiKey } from "./config.js";

/**
 * Mapeamento de endpoints para suas respectivas funções na api.js
 */
const ENDPOINT_MAPPING = {
  "/time": { func: "getTime", requiresAuth: false, method: "GET" },
  "/time/iso": { func: "getTimeIso", requiresAuth: false, method: "GET" },
  "/user": { func: "getUser", requiresAuth: true, method: "GET" },
  "/traffic": { func: "getTraffic", requiresAuth: true, method: "GET" },
  "/traffic/details": {
    func: "getTrafficDetails",
    requiresAuth: true,
    method: "GET",
  },
  "/downloads": { func: "getDownloads", requiresAuth: true, method: "GET" },
  "/torrents": { func: "getTorrents", requiresAuth: true, method: "GET" },
  "/torrents/activeCount": {
    func: "getActiveTorrentsCount",
    requiresAuth: true,
    method: "GET",
  },
  "/torrents/availableHosts": {
    func: "getAvailableTorrentHosts",
    requiresAuth: true,
    method: "GET",
  },
  "/streaming/transcode/{id}": {
    func: "getStreamingTranscode",
    requiresAuth: true,
    method: "GET",
  },
  "/streaming/mediaInfos/{id}": {
    func: "getStreamingMediaInfos",
    requiresAuth: true,
    method: "GET",
  },
  "/hosts": { func: "getHosts", requiresAuth: false, method: "GET" },
  "/hosts/status": {
    func: "getHostsStatus",
    requiresAuth: false,
    method: "GET",
  },
  "/hosts/regex": { func: "getHostsRegex", requiresAuth: false, method: "GET" },
  "/hosts/regexFolder": {
    func: "getHostsRegexFolder",
    requiresAuth: false,
    method: "GET",
  },
  "/hosts/domains": {
    func: "getHostsDomains",
    requiresAuth: false,
    method: "GET",
  },
};

/**
 * Função para fazer requisição customizada diretamente à API
 * Para endpoints que não estão mapeados nas funções do api.js
 */
async function makeCustomApiRequest(method, endpoint, apiKey, body = null) {
  const baseUrl = "https://api.real-debrid.com/rest/1.0";

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const options = {
    method,
    headers,
  };

  if (body && (method === "POST" || method === "PUT")) {
    options.body = body;
  }

  const response = await fetch(`${baseUrl}${endpoint}`, options);

  // Para respostas 204 (No Content)
  if (response.status === 204) {
    return {
      success: true,
      message: "Operação realizada com sucesso (204 No Content)",
    };
  }

  // Para respostas de texto simples (como /time)
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("text/plain")) {
    return await response.text();
  }

  // Para respostas JSON
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error || `Erro ${response.status}: ${response.statusText}`
    );
  }

  return data;
}

/**
 * Inicializa o módulo do API Explorer
 */
export function initApiExplorer() {
  console.log("🔬 Inicializando API Explorer...");

  const endpointSelect = document.getElementById("api-endpoint-select");
  const methodSelect = document.getElementById("api-method-select");
  const pathInput = document.getElementById("api-path-input");
  const bodyContainer = document.getElementById("api-body-container");
  const bodyTextarea = document.getElementById("api-body-textarea");
  const sendButton = document.getElementById("send-api-request-btn");
  const responseOutput = document.getElementById("api-response-output");

  if (
    !endpointSelect ||
    !methodSelect ||
    !pathInput ||
    !sendButton ||
    !responseOutput
  ) {
    console.warn("⚠️ Elementos do API Explorer não encontrados");
    return;
  }

  // Quando um endpoint é selecionado, preenche o campo de caminho e método
  endpointSelect.addEventListener("change", (e) => {
    const selectedOption = e.target.selectedOptions[0];
    const endpoint = selectedOption.value;
    const method = selectedOption.getAttribute("data-method");

    pathInput.value = endpoint;
    methodSelect.value = method;

    // Mostra/esconde o campo de corpo da requisição baseado no método
    if (method === "POST" || method === "PUT") {
      bodyContainer.style.display = "block";
    } else {
      bodyContainer.style.display = "none";
    }
  });

  // Mostra/esconde o campo de corpo baseado no método selecionado
  methodSelect.addEventListener("change", (e) => {
    const method = e.target.value;
    if (method === "POST" || method === "PUT") {
      bodyContainer.style.display = "block";
    } else {
      bodyContainer.style.display = "none";
    }
  });

  // Função para fazer a requisição
  sendButton.addEventListener("click", async () => {
    const method = methodSelect.value;
    const endpoint = pathInput.value.trim();
    const bodyText = bodyTextarea.value.trim();

    if (!endpoint) {
      alert("Por favor, insira um endpoint válido.");
      return;
    }

    // Obtém a API key das configurações usando o módulo config
    const apiKey = getRdApiKey();

    try {
      sendButton.disabled = true;
      sendButton.textContent = "Enviando...";
      responseOutput.textContent = "Fazendo requisição...";

      let result;
      let body = null;

      // Prepara o corpo da requisição se necessário
      if ((method === "POST" || method === "PUT") && bodyText) {
        try {
          // Tenta parsear como JSON primeiro
          const jsonBody = JSON.parse(bodyText);
          // Converte para URLSearchParams se for um objeto simples
          body = new URLSearchParams(jsonBody).toString();
        } catch {
          // Se não for JSON válido, usa como string direta
          body = bodyText;
        }
      }

      // Tenta usar função mapeada primeiro
      const baseEndpoint = endpoint
        .split("?")[0]
        .replace(/\/\{[^}]+\}/g, "/{id}");
      const mappedEndpoint = ENDPOINT_MAPPING[baseEndpoint];

      if (mappedEndpoint && method === mappedEndpoint.method) {
        // Usa função específica do api.js
        const funcName = mappedEndpoint.func;

        if (mappedEndpoint.requiresAuth && !apiKey) {
          throw new Error(
            "Este endpoint requer autenticação. Configure sua API Key nas Configurações."
          );
        }

        // Extrai parâmetros do endpoint
        const params = [];
        if (mappedEndpoint.requiresAuth) {
          params.push(apiKey);
        }

        // Adiciona ID se necessário
        if (endpoint.includes("{id}")) {
          const idMatch = endpoint.match(/\/([^\/]+)$/);
          if (idMatch) {
            params.push(idMatch[1]);
          }
        }

        // Adiciona parâmetros de query para traffic/details
        if (funcName === "getTrafficDetails" && endpoint.includes("?")) {
          const urlParams = new URLSearchParams(endpoint.split("?")[1]);
          params.push(urlParams.get("start"), urlParams.get("end"));
        }

        result = await api[funcName](...params);
      } else {
        // Usa requisição customizada
        if (
          !apiKey &&
          !endpoint.startsWith("/time") &&
          !endpoint.startsWith("/hosts")
        ) {
          throw new Error(
            "Este endpoint requer autenticação. Configure sua API Key nas Configurações."
          );
        }

        result = await makeCustomApiRequest(method, endpoint, apiKey, body);
      }

      // Exibe o resultado
      responseOutput.textContent = JSON.stringify(result, null, 2);
    } catch (error) {
      console.error("Erro na requisição da API:", error);
      responseOutput.textContent = `❌ Erro: ${error.message}`;
    } finally {
      sendButton.disabled = false;
      sendButton.textContent = "Fazer Requisição";
    }
  });

  console.log("✅ API Explorer inicializado");
}
