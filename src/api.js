/**
 * Módulo para interagir com a API do Real-Debrid.
 * https://api.real-debrid.com/docs
 */

const API_BASE_URL = "https://api.real-debrid.com/rest/1.0/";

/**
 * Função base para fazer requisições à API.
 * @param {string} endpoint O endpoint da API a ser chamado.
 * @param {string} apiKey A chave da API do usuário.
 * @param {object} options Opções de requisição para o `fetch`.
 * @returns {Promise<any>} O resultado JSON da API.
 * @throws {Error} Lança um erro se a requisição falhar.
 */
async function fetchFromApi(endpoint, apiKey, options = {}) {
  const headers = {
    ...options.headers,
  };

  if (apiKey) {
    headers.Authorization = `Bearer ${apiKey}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 && apiKey) {
      throw new Error("API Key inválida ou expirada.");
    }
    // Tenta extrair a mensagem de erro da API
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.error ||
        `Erro na API: ${response.status} ${response.statusText}`
    );
  }

  // O status 204 (No Content) não tem corpo na resposta
  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Valida a API key buscando os dados do usuário.
 * @param {string} apiKey - A chave da API do Real-Debrid.
 * @returns {Promise<object>} Os dados do usuário.
 */
export async function validateApiKey(apiKey) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  return fetchFromApi("user", apiKey);
}

/**
 * Busca os dados do usuário. Alias para validateApiKey.
 * @param {string} apiKey - A chave da API do Real-Debrid.
 * @returns {Promise<object>} Os dados do usuário.
 */
export async function getUser(apiKey) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  return fetchFromApi("user", apiKey);
}

/**
 * Desabilita o token de acesso atual.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @returns {Promise<null>}
 */
export async function disableAccessToken(apiKey) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  return fetchFromApi("disable_access_token", apiKey, { method: "GET" });
}

/**
 * Obtém o horário do servidor. Não requer autenticação.
 * @returns {Promise<string>} Horário do servidor em formato Y-m-d H:i:s.
 */
export async function getTime() {
  const res = await fetch(`${API_BASE_URL}time`);
  return res.text();
}

/**
 * Obtém o horário do servidor em formato ISO. Não requer autenticação.
 * @returns {Promise<string>} Horário do servidor em formato Y-m-dTH:i:sO.
 */
export async function getTimeIso() {
  const res = await fetch(`${API_BASE_URL}time/iso`);
  return res.text();
}

/**
 * Busca as informações de tráfego do usuário.
 * @param {string} apiKey - A chave da API do Real-Debrid.
 * @returns {Promise<object>} Os dados de tráfego.
 */
export async function getTraffic(apiKey) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  return fetchFromApi("traffic", apiKey);
}

/**
 * Obtém detalhes de tráfego em cada hoster usado durante um período definido.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {string} [start] Período inicial (YYYY-MM-DD).
 * @param {string} [end] Período final (YYYY-MM-DD).
 * @returns {Promise<object>}
 */
export async function getTrafficDetails(apiKey, start, end) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  const params = new URLSearchParams();
  if (start) params.append("start", start);
  if (end) params.append("end", end);
  return fetchFromApi(`traffic/details?${params.toString()}`, apiKey);
}

/**
 * Verifica se um arquivo é baixável no hoster. Não requer autenticação.
 * @param {string} link O link original do hoster.
 * @param {string} [password] Senha para o arquivo.
 * @returns {Promise<object>}
 */
export async function unrestrictCheck(link, password) {
  if (!link) {
    throw new Error("O parâmetro 'link' é obrigatório.");
  }

  const params = new URLSearchParams({ link });
  if (password) params.append("password", password);
  return fetchFromApi("unrestrict/check", null, {
    method: "POST",
    body: params,
  });
}

/**
 * Desrestringe um link de hoster.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {string} link O link original do hoster.
 * @param {string} [password] Senha para o arquivo.
 * @param {number} [remote] 0 ou 1 para usar tráfego remoto.
 * @returns {Promise<object>}
 */
export async function unrestrictLink(apiKey, link, password, remote) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!link) {
    throw new Error("O parâmetro 'link' é obrigatório.");
  }

  const params = new URLSearchParams({ link });
  if (password) params.append("password", password);
  if (remote !== undefined) params.append("remote", remote.toString());
  return fetchFromApi("unrestrict/link", apiKey, {
    method: "POST",
    body: params,
  });
}

/**
 * Desrestringe um link de pasta de hoster.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {string} link O link da pasta do hoster.
 * @returns {Promise<string[]>}
 */
export async function unrestrictFolder(apiKey, link) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!link) {
    throw new Error("O parâmetro 'link' é obrigatório.");
  }

  const params = new URLSearchParams({ link });
  return fetchFromApi("unrestrict/folder", apiKey, {
    method: "POST",
    body: params,
  });
}

/**
 * Descriptografa um arquivo de container (RSDF, CCF, etc.).
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {any} fileData Conteúdo do arquivo de container.
 * @returns {Promise<string[]>}
 */
export async function unrestrictContainerFile(apiKey, fileData) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!fileData) {
    throw new Error("O parâmetro 'fileData' é obrigatório.");
  }

  const formData = new FormData();
  formData.append("file", fileData);

  return fetchFromApi("unrestrict/containerFile", apiKey, {
    method: "PUT",
    body: formData,
  });
}

/**
 * Descriptografa um arquivo de container a partir de um link.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {string} link Link HTTP para o arquivo de container.
 * @returns {Promise<string[]>}
 */
export async function unrestrictContainerLink(apiKey, link) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!link) {
    throw new Error("O parâmetro 'link' é obrigatório.");
  }

  const params = new URLSearchParams({ link });
  return fetchFromApi("unrestrict/containerLink", apiKey, {
    method: "POST",
    body: params,
  });
}

/**
 * Obtém a lista de downloads do usuário.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {number} [offset] Deslocamento inicial.
 * @param {number} [page] Paginação.
 * @param {number} [limit] Entradas por página (padrão 100).
 * @returns {Promise<Array<object>>}
 */
export async function getDownloads(apiKey, offset, page, limit) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  const params = new URLSearchParams();
  if (offset !== undefined) params.append("offset", offset.toString());
  if (page !== undefined) params.append("page", page.toString());
  if (limit !== undefined) params.append("limit", limit.toString());
  return fetchFromApi(`downloads?${params.toString()}`, apiKey);
}

/**
 * Deleta um link da lista de downloads.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {string} id ID do download a ser deletado.
 * @returns {Promise<null>}
 */
export async function deleteDownload(apiKey, id) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!id) {
    throw new Error("O parâmetro 'id' é obrigatório.");
  }

  return fetchFromApi(`downloads/delete/${id}`, apiKey, { method: "DELETE" });
}

/**
 * Obtém a lista de torrents do usuário.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {number} [offset] Deslocamento inicial.
 * @param {number} [page] Paginação.
 * @param {number} [limit] Entradas por página (padrão 100).
 * @param {string} [filter] "active" para listar apenas torrents ativos.
 * @returns {Promise<Array<object>>}
 */
export async function getTorrents(apiKey, offset, page, limit, filter) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  const params = new URLSearchParams();
  if (offset !== undefined) params.append("offset", offset.toString());
  if (page !== undefined) params.append("page", page.toString());
  if (limit !== undefined) params.append("limit", limit.toString());
  if (filter) params.append("filter", filter);
  return fetchFromApi(`torrents?${params.toString()}`, apiKey);
}

/**
 * Obtém informações sobre um torrent.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {string} id ID do torrent.
 * @returns {Promise<object>}
 */
export async function getTorrentInfo(apiKey, id) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!id) {
    throw new Error("O parâmetro 'id' é obrigatório.");
  }

  return fetchFromApi(`torrents/info/${id}`, apiKey);
}

/**
 * Obtém o número de torrents ativos atualmente.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @returns {Promise<object>}
 */
export async function getActiveTorrentsCount(apiKey) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  return fetchFromApi("torrents/activeCount", apiKey);
}

/**
 * Obtém hosts disponíveis para fazer upload de torrent.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @returns {Promise<Array<object>>}
 */
export async function getAvailableTorrentHosts(apiKey) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  return fetchFromApi("torrents/availableHosts", apiKey);
}

/**
 * Adiciona um arquivo torrent para download.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {any} fileData Conteúdo do arquivo .torrent.
 * @param {string} [host] Domínio do hoster.
 * @returns {Promise<object>}
 */
export async function addTorrentFile(apiKey, fileData, host) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!fileData) {
    throw new Error("O parâmetro 'fileData' é obrigatório.");
  }

  const formData = new FormData();
  formData.append("file", fileData);
  if (host) {
    formData.append("host", host);
  }

  return fetchFromApi("torrents/addTorrent", apiKey, {
    method: "PUT",
    body: formData,
  });
}

/**
 * Adiciona um link magnet para download.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {string} magnet Link magnet.
 * @param {string} [host] Domínio do hoster.
 * @returns {Promise<object>}
 */
export async function addMagnet(apiKey, magnet, host) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!magnet) {
    throw new Error("O parâmetro 'magnet' é obrigatório.");
  }

  const params = new URLSearchParams({ magnet });
  if (host) params.append("host", host);
  return fetchFromApi("torrents/addMagnet", apiKey, {
    method: "POST",
    body: params,
  });
}

/**
 * Seleciona arquivos de um torrent para iniciar o download.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {string} id ID do torrent.
 * @param {string} files IDs dos arquivos separados por vírgula, ou "all".
 * @returns {Promise<null>}
 */
export async function selectTorrentFiles(apiKey, id, files) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!id) {
    throw new Error("O parâmetro 'id' é obrigatório.");
  }
  if (!files) {
    throw new Error("O parâmetro 'files' é obrigatório.");
  }

  const params = new URLSearchParams({ files });
  return fetchFromApi(`torrents/selectFiles/${id}`, apiKey, {
    method: "POST",
    body: params,
  });
}

/**
 * Deleta um torrent da lista.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {string} id ID do torrent a ser deletado.
 * @returns {Promise<null>}
 */
export async function deleteTorrent(apiKey, id) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!id) {
    throw new Error("O parâmetro 'id' é obrigatório.");
  }

  return fetchFromApi(`torrents/delete/${id}`, apiKey, { method: "DELETE" });
}

/**
 * Obtém hosts suportados. Não requer autenticação.
 * @returns {Promise<object>}
 */
export async function getHosts() {
  return fetchFromApi("hosts", null);
}

/**
 * Obtém status dos hosters. Não requer autenticação.
 * @returns {Promise<object>}
 */
export async function getHostsStatus() {
  return fetchFromApi("hosts/status", null);
}

/**
 * Obtém todas as regex de links suportados. Não requer autenticação.
 * @returns {Promise<string[]>}
 */
export async function getHostsRegex() {
  return fetchFromApi("hosts/regex", null);
}

/**
 * Obtém todas as regex de links de pasta suportados. Não requer autenticação.
 * @returns {Promise<string[]>}
 */
export async function getHostsRegexFolder() {
  return fetchFromApi("hosts/regexFolder", null);
}

/**
 * Obtém todos os domínios de hoster suportados. Não requer autenticação.
 * @returns {Promise<string[]>}
 */
export async function getHostsDomains() {
  return fetchFromApi("hosts/domains", null);
}

/**
 * Obtém links de transcodificação para um arquivo.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {string} id ID do arquivo.
 * @returns {Promise<object>}
 */
export async function getStreamingTranscode(apiKey, id) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!id) {
    throw new Error("O parâmetro 'id' é obrigatório.");
  }

  return fetchFromApi(`streaming/transcode/${id}`, apiKey);
}

/**
 * Obtém informações detalhadas de mídia para um arquivo.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {string} id ID do arquivo.
 * @returns {Promise<object>}
 */
export async function getStreamingMediaInfos(apiKey, id) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!id) {
    throw new Error("O parâmetro 'id' é obrigatório.");
  }

  return fetchFromApi(`streaming/mediaInfos/${id}`, apiKey);
}

/**
 * Obtém as configurações atuais do usuário.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @returns {Promise<object>}
 */
export async function getSettings(apiKey) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  return fetchFromApi("settings", apiKey);
}

/**
 * Atualiza uma configuração do usuário.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {string} settingName Nome da configuração.
 * @param {string} settingValue Valor da configuração.
 * @returns {Promise<null>}
 */
export async function updateSetting(apiKey, settingName, settingValue) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!settingName) {
    throw new Error("O parâmetro 'settingName' é obrigatório.");
  }
  if (!settingValue) {
    throw new Error("O parâmetro 'settingValue' é obrigatório.");
  }

  const params = new URLSearchParams({
    setting_name: settingName,
    setting_value: settingValue,
  });
  return fetchFromApi("settings/update", apiKey, {
    method: "POST",
    body: params,
  });
}

/**
 * Converte pontos de fidelidade.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @returns {Promise<null>}
 */
export async function convertPoints(apiKey) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  return fetchFromApi("settings/convertPoints", apiKey, { method: "POST" });
}

/**
 * Envia email de verificação para alterar a senha.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @returns {Promise<null>}
 */
export async function changePassword(apiKey) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  return fetchFromApi("settings/changePassword", apiKey, { method: "POST" });
}

/**
 * Faz upload de uma nova imagem de avatar.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @param {any} fileData Conteúdo da imagem.
 * @returns {Promise<null>}
 */
export async function uploadAvatar(apiKey, fileData) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }
  if (!fileData) {
    throw new Error("O parâmetro 'fileData' é obrigatório.");
  }

  const formData = new FormData();
  formData.append("file", fileData);

  return fetchFromApi("settings/avatarFile", apiKey, {
    method: "PUT",
    body: formData,
  });
}

/**
 * Reseta a imagem do avatar do usuário para o padrão.
 * @param {string} apiKey A chave da API do Real-Debrid.
 * @returns {Promise<null>}
 */
export async function deleteAvatar(apiKey) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  return fetchFromApi(`settings/avatarDelete`, apiKey, { method: "DELETE" });
}

/**
 * Valida a chave de API do TMDB.
 * @param {string} apiKey - A chave de API do TMDB.
 * @returns {Promise<boolean>} Retorna true se a chave for válida.
 * @throws {Error} Lança um erro se a chave for inválida.
 */
export async function validateTmdbApiKey(apiKey) {
  if (!apiKey) {
    throw new Error("O parâmetro 'apiKey' é obrigatório.");
  }

  const url = `https://api.themoviedb.org/3/configuration?api_key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 401) {
      const errorData = await response.json();
      throw new Error(
        `API Key do TMDB inválida: ${
          errorData.status_message || "Não autorizado"
        }`
      );
    }
    throw new Error(
      `Erro ao validar a API Key do TMDB: ${response.statusText}`
    );
  }

  // A resposta de sucesso (200 OK) indica que a chave é válida.
  return true;
}

/**
 * Busca informações de uma mídia no TMDB usando um ID externo (IMDb).
 * @param {string} tmdbApiKey A chave da API do TMDB.
 * @param {string} imdbId O IMDb ID da mídia (ex: tt0944947).
 * @returns {Promise<object>} O primeiro resultado encontrado para a busca.
 */
export async function getMediaInfoFromTmdb(tmdbApiKey, imdbId) {
  if (!tmdbApiKey) {
    throw new Error("A chave da API do TMDB é obrigatória.");
  }
  if (!imdbId) {
    throw new Error("O IMDb ID é obrigatório.");
  }

  const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${tmdbApiKey}&external_source=imdb_id&language=pt-BR`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Erro ao buscar dados no TMDB: ${response.statusText}`);
  }

  const data = await response.json();

  // A API de 'find' retorna resultados em arrays por tipo de mídia
  const results = [...(data.tv_results || []), ...(data.movie_results || [])];

  if (results.length === 0) {
    throw new Error("Nenhuma mídia encontrada no TMDB com este IMDb ID.");
  }

  return results[0]; // Retorna o primeiro resultado correspondente
}
