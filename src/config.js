const CONFIG_KEYS = {
  RD_API_KEY: "rd_api_key",
  OMDB_API_KEY: "omdb_api_key",
  TORRENT_DATA_PREFIX: "rd_torrent_",
  SERIES_LIBRARY: "rd_series_library",
  MOVIE_LIBRARY: "rd_movie_library",
  // A ser expandido para outras configurações da biblioteca...
};

/**
 * Monta a chave de armazenamento para um torrent específico.
 * @param {string} torrentId O ID do torrent.
 * @returns {string} A chave completa para o localStorage.
 */
function getTorrentStorageKey(torrentId) {
  return `${CONFIG_KEYS.TORRENT_DATA_PREFIX}${torrentId}`;
}

/**
 * Salva os dados completos de um torrent no localStorage.
 * @param {string} torrentId O ID do torrent.
 * @param {object} torrentData O objeto de dados completo do torrent.
 */
export function saveTorrentData(torrentId, torrentData) {
  if (!torrentId || !torrentData) return;
  const key = getTorrentStorageKey(torrentId);
  localStorage.setItem(key, JSON.stringify(torrentData));
}

/**
 * Busca os dados de um torrent do localStorage.
 * @param {string} torrentId O ID do torrent.
 * @returns {object|null} Os dados do torrent ou null se não encontrado.
 */
export function getTorrentData(torrentId) {
  const key = getTorrentStorageKey(torrentId);
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

/**
 * Remove os dados de um torrent do localStorage.
 * @param {string} torrentId O ID do torrent.
 */
export function removeTorrentData(torrentId) {
  const key = getTorrentStorageKey(torrentId);
  localStorage.removeItem(key);
}

/**
 * Busca todos os dados de torrents do localStorage, ordenados por data de adição.
 * @returns {Array<object>} Uma lista de todos os dados de torrents armazenados.
 */
export function getAllTorrentData() {
  const torrents = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(CONFIG_KEYS.TORRENT_DATA_PREFIX)) {
      const data = localStorage.getItem(key);
      if (data) {
        torrents.push(JSON.parse(data));
      }
    }
  }
  // Ordena por data de adição, os mais recentes primeiro
  torrents.sort((a, b) => new Date(b.added) - new Date(a.added));
  return torrents;
}

/**
 * Busca a API Key do Real-Debrid do localStorage.
 * @returns {string|null} A chave da API, ou null se não estiver definida.
 */
export function getRdApiKey() {
  return localStorage.getItem(CONFIG_KEYS.RD_API_KEY);
}

/**
 * Salva a API Key do Real-Debrid no localStorage.
 * @param {string} apiKey A chave da API a ser salva.
 */
export function setRdApiKey(apiKey) {
  localStorage.setItem(CONFIG_KEYS.RD_API_KEY, apiKey);
}

/**
 * Remove a API Key do Real-Debrid do localStorage.
 */
export function removeRdApiKey() {
  localStorage.removeItem(CONFIG_KEYS.RD_API_KEY);
}

/**
 * Busca a API Key do OMDb do localStorage.
 * @returns {string|null} A chave da API, ou null se não estiver definida.
 */
export function getOmdbApiKey() {
  return localStorage.getItem(CONFIG_KEYS.OMDB_API_KEY);
}

/**
 * Salva a API Key do OMDb no localStorage.
 * @param {string} apiKey A chave da API a ser salva.
 */
export function setOmdbApiKey(apiKey) {
  localStorage.setItem(CONFIG_KEYS.OMDB_API_KEY, apiKey);
}

/**
 * Remove a API Key do OMDb do localStorage.
 */
export function removeOmdbApiKey() {
  localStorage.removeItem(CONFIG_KEYS.OMDB_API_KEY);
}

/**
 * Salva a biblioteca de mídia (séries ou filmes) no localStorage.
 * @param {'series'|'movies'} type O tipo de mídia a ser salvo.
 * @param {object} data O objeto da biblioteca a ser salvo.
 */
export function saveMediaLibrary(type, data) {
  const key =
    type === "series" ? CONFIG_KEYS.SERIES_LIBRARY : CONFIG_KEYS.MOVIE_LIBRARY;
  localStorage.setItem(key, JSON.stringify(data));
}

/**
 * Busca a biblioteca de mídia (séries ou filmes) do localStorage.
 * @param {'series'|'movies'} type O tipo de mídia a ser buscado.
 * @returns {object|null} O objeto da biblioteca ou null se não for encontrado.
 */
export function getMediaLibrary(type) {
  const key =
    type === "series" ? CONFIG_KEYS.SERIES_LIBRARY : CONFIG_KEYS.MOVIE_LIBRARY;
  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

// Futuramente, podemos adicionar funções para a biblioteca aqui
// export function getLibrary() { ... }
// export function saveLibrary(library) { ... }
