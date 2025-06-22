# Documentação da API OMDb

## Endpoints

**Requisições de Dados:**
`http://www.omdbapi.com/?apikey=[suachave]&`

**Requisições de Pôster:**
`http://img.omdbapi.com/?apikey=[suachave]&`

## Parâmetros

### Por ID ou Título

| Parâmetro | Obrigatório | Opções Válidas         | Valor Padrão | Descrição                                  |
| --------- | ----------- | ---------------------- | ------------ | ------------------------------------------ |
| i         | Opcional\*  |                        | <vazio>      | Um ID do IMDb válido (ex: tt1285016)       |
| t         | Opcional\*  |                        | <vazio>      | Título do filme para pesquisar.            |
| type      | Não         | movie, series, episode | <vazio>      | Tipo de resultado a ser retornado.         |
| y         | Não         |                        | <vazio>      | Ano de lançamento.                         |
| plot      | Não         | short, full            | short        | Retornar enredo curto ou completo.         |
| r         | Não         | json, xml              | json         | O tipo de dados a ser retornado.           |
| callback  | Não         |                        | <vazio>      | Nome do callback JSONP.                    |
| v         | Não         |                        | 1            | Versão da API (reservado para uso futuro). |

**\*Atenção:** Embora "i" e "t" sejam opcionais, pelo menos um dos dois é obrigatório.

### Por Pesquisa

| Parâmetro  | Obrigatório | Opções Válidas         | Valor Padrão | Descrição                                  |
| ---------- | ----------- | ---------------------- | ------------ | ------------------------------------------ |
| s          | Sim         |                        | <vazio>      | Título do filme para pesquisar.            |
| type       | Não         | movie, series, episode | <vazio>      | Tipo de resultado a ser retornado.         |
| y          | Não         |                        | <vazio>      | Ano de lançamento.                         |
| r          | Não         | json, xml              | json         | O tipo de dados a ser retornado.           |
| page Novo! | Não         | 1-100                  | 1            | Número da página a ser retornada.          |
| callback   | Não         |                        | <vazio>      | Nome do callback JSONP.                    |
| v          | Não         |                        | 1            | Versão da API (reservado para uso futuro). |

---

# Documentação da API Real-Debrid

## Detalhes de Implementação

- Os métodos são agrupados por namespaces (por exemplo, "unrestrict", "user").
- Os verbos HTTP suportados são GET, POST, PUT e DELETE. Se seu cliente não suportar todos os verbos HTTP, você pode sobrescrever o verbo com o cabeçalho HTTP `X-HTTP-Verb`.
- A menos que especificado de outra forma na documentação do método, todas as chamadas de API bem-sucedidas retornam código HTTP 200 com um objeto JSON.
- Erros são retornados com código HTTP 4XX ou 5XX, um objeto JSON com propriedades "error" (uma mensagem de erro) e "error_code" (opcional, um número inteiro).
- Toda string passada para e da API precisa ser codificada em UTF-8. Para máxima compatibilidade, normalize para Unicode Normalization Form C (NFC) antes da codificação UTF-8.
- A API envia cabeçalhos ETag e suporta o cabeçalho `If-None-Match`.
- As datas são formatadas de acordo com o método Javascript `date.toJSON`.
- A menos que especificado de outra forma, todos os métodos da API requerem autenticação.
- A API é limitada a 250 requisições por minuto, todas as requisições recusadas retornarão erro HTTP 429 e contarão no limite (tentativas de força bruta deixarão você bloqueado por tempo indefinido).

## Métodos da API

**URL Base da API Rest:**
https://api.real-debrid.com/rest/1.0/

### Endpoints Básicos

#### GET /disable_access_token

**Descrição:** Desabilitar token de acesso atual  
Desabilita o token de acesso atual, retorna código HTTP 204

**Valor de retorno:** Nenhum

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |

#### GET /time

**Descrição:** Obter horário do servidor  
Obtém o horário do servidor, dados brutos retornados. Esta requisição não requer autenticação.

**Valor de retorno:** `Y-m-d H:i:s`

#### GET /time/iso

**Descrição:** Obter horário do servidor em ISO  
Obtém o horário do servidor em ISO, dados brutos retornados. Esta requisição não requer autenticação.

**Valor de retorno:** `Y-m-dTH:i:sO`

### /user

#### GET /user

**Descrição:** Obter informações do usuário atual  
Retorna algumas informações sobre o usuário atual.

**Valor de retorno:**

```json
{
    "id": int,
    "username": "string",
    "email": "string",
    "points": int, // Pontos de fidelidade
    "locale": "string", // Idioma do usuário
    "avatar": "string", // URL
    "type": "string", // "premium" ou "free"
    "premium": int, // segundos restantes como usuário Premium
    "expiration": "string" // jsonDate
}
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |

### /unrestrict

#### POST /unrestrict/check

**Descrição:** Verificar um link  
Verifica se um arquivo é baixável no hoster em questão. Esta requisição não requer autenticação.

**Parâmetros:**
| Nome | Tipo | Descrição |
|------|------|-----------|
| link \* | string | O link original do hoster |
| password | string | Senha para desbloquear o acesso ao arquivo no lado do hoster |

**Valor de retorno:**

```json
{
    "host": "string", // Domínio principal do host
    "link": "string",
    "filename": "string",
    "filesize": int,
    "supported": int
}
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 503 | Arquivo indisponível |

#### POST /unrestrict/link

**Descrição:** Desrestringir um link  
Desrestringe um link de hoster e obtém um novo link irrestrito

**Parâmetros:**
| Nome | Tipo | Descrição |
|------|------|-----------|
| link \* | string | O link original do hoster |
| password | string | Senha para desbloquear o acesso ao arquivo no lado do hoster |
| remote | int | 0 ou 1, usar tráfego Remoto, servidores dedicados e proteções de compartilhamento de conta removidas |

**Valor de retorno para um link único gerado:**

```json
{
    "id": "string",
    "filename": "string",
    "mimeType": "string", // Tipo Mime do arquivo, adivinhado pela extensão do arquivo
    "filesize": int, // Tamanho do arquivo em bytes, 0 se desconhecido
    "link": "string", // Link original
    "host": "string", // Domínio principal do host
    "chunks": int, // Máximo de Chunks permitidos
    "crc": int, // Desabilitar / habilitar verificação CRC
    "download": "string", // Link gerado
    "streamable": int // O arquivo é streamável no website
}
```

**Valor de retorno para múltiplos links gerados (ex YouTube):**

```json
{
    "id": "string",
    "filename": "string",
    "filesize": int, // Tamanho do arquivo em bytes, 0 se desconhecido
    "link": "string", // Link original
    "host": "string", // Domínio principal do host
    "chunks": int, // Máximo de Chunks permitidos
    "crc": int, // Desabilitar / habilitar verificação CRC
    "download": "string", // Link gerado
    "streamable": int, // O arquivo é streamável no website
    "type": "string", // Tipo do arquivo (em geral, sua qualidade)
    "alternative": [
        {
            "id": "string",
            "filename": "string",
            "download": "string",
            "type": "string"
        },
        {
            "id": "string",
            "filename": "string",
            "download": "string",
            "type": "string"
        }
    ]
}
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |

#### POST /unrestrict/folder

**Descrição:** Desrestringir um link de pasta  
Desrestringe um link de pasta de hoster e obtém links individuais, retorna um array vazio se nenhum link for encontrado.

**Parâmetros:**
| Nome | Tipo | Descrição |
|------|------|-----------|
| link \* | string | O link da pasta do hoster |

**Valor de retorno:**

```json
[
  "string", // URL
  "string",
  "string"
]
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |

#### PUT /unrestrict/containerFile

**Descrição:** Descriptografar arquivo de container  
Descriptografa um arquivo de container (RSDF, CCF, CCF3, DLC)

**Valor de retorno:**

```json
[
  "string", // URL
  "string",
  "string"
]
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 400 | Requisição Inválida (veja mensagem de erro) |
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada, não premium) |
| 503 | Serviço indisponível (veja mensagem de erro) |

#### POST /unrestrict/containerLink

**Descrição:** Descriptografar arquivo de container a partir de link  
Descriptografa um arquivo de container a partir de um link.

**Parâmetros:**
| Nome | Tipo | Descrição |
|------|------|-----------|
| link \* | string | Link HTTP do arquivo de container |

**Valor de retorno:**

```json
[
  "string", // URL
  "string",
  "string"
]
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 400 | Requisição Inválida (veja mensagem de erro) |
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada, não premium) |
| 503 | Serviço indisponível (veja mensagem de erro) |

### /traffic

#### GET /traffic

**Descrição:** Informações de tráfego para hosters limitados  
Obtém informações de tráfego para hosters limitados (limites, uso atual, pacotes extras)

**Valor de retorno:**

```json
{
    "string": { // Domínio principal do host
        "left": int, // Bytes / links disponíveis para usar
        "bytes": int, // Bytes baixados
        "links": int, // Links destritos
        "limit": int,
        "type": "string", // "links", "gigabytes", "bytes"
        "extra": int, // Tráfego / links adicionais que o usuário pode ter comprado
        "reset": "string" // "daily", "weekly" ou "monthly"
    },
    "string": {
        "left": int,
        "bytes": int,
        "links": int,
        "limit": int,
        "type": "string",
        "extra": int,
        "reset": "string"
    }
}
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |

#### GET /traffic/details

**Descrição:** Detalhes de tráfego em hosters usados  
Obtém detalhes de tráfego em cada hoster usado durante um período definido

**Parâmetros:**
| Nome | Tipo | Descrição |
|------|------|-----------|
| start | date (YYYY-MM-DD) | Período inicial, padrão: uma semana atrás |
| end | date (YYYY-MM-DD) | Período final, padrão: hoje |

**Aviso:** O período não pode exceder 31 dias.

**Valor de retorno:**

```json
{
    "YYYY-MM-DD": {
        "host": { // Por domínio principal do Host
            "string": int, // bytes baixados no host em questão
            "string": int,
            "string": int,
            "string": int,
            "string": int,
            "string": int
        },
        "bytes": int // Total baixado (em bytes) neste dia
    },
    "YYYY-MM-DD": {
        "host": {
            "string": int,
            "string": int,
            "string": int,
            "string": int,
            "string": int,
        },
        "bytes": int
    }
}
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |

### /streaming

#### GET /streaming/transcode/{id}

**Descrição:** Obter links de transcodificação para arquivo especificado  
Obtém links de transcodificação para arquivo especificado, {id} de /downloads ou /unrestrict/link

**Valor de retorno:**

```json
{
  "apple": {
    // Formato M3U8 Live Streaming
    "quality": "string",
    "quality": "string"
  },
  "dash": {
    // Formato MPD Live Streaming
    "quality": "string",
    "quality": "string"
  },
  "liveMP4": {
    // Live MP4
    "quality": "string",
    "quality": "string"
  },
  "h264WebM": {
    // Live H264 WebM
    "quality": "string",
    "quality": "string"
  }
}
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |

#### GET /streaming/mediaInfos/{id}

**Descrição:** Obter informações de mídia para arquivo especificado  
Obtém informações detalhadas de mídia para arquivo especificado, {id} de /downloads ou /unrestrict/link

**Valor de retorno:**

```json
{
    "filename": "string", // Nome do arquivo limpo
    "hoster": "string", // Arquivo hospedado em
    "link": "string", // Link do conteúdo original
    "type": "string", // "movie" / "show" / "audio"
    "season": "string", // se encontrado, senão null
    "episode": "string", // se encontrado, senão null
    "year": "string", // se encontrado, senão null
    "duration": float, // duração da mídia em segundos
    "bitrate": int, // bitrate do arquivo de mídia
    "size": int, // tamanho original do arquivo em bytes
    "details": {
        "video": {
            "und1": { // se disponível, idioma em iso_639 seguido por um número ID
                "stream": "string",
                "lang": "string", // Idioma em texto simples (ex "English", "French")
                "lang_iso": "string", // Idioma em iso_639 (ex fre, eng)
                "codec": "string", // Codec do vídeo (ex "h264", "divx")
                "colorspace": "string", // Espaço de cor do vídeo (ex "yuv420p")
                "width": int, // Largura do vídeo (ex 1980)
                "height": int // Altura do vídeo (ex 1080)
            }
        },
        "audio": {
            "und1": { // se disponível, idioma em iso_639 seguido por um número ID
                "stream": "string",
                "lang": "string", // Idioma em texto simples (ex "English", "French")
                "lang_iso": "string", // Idioma em iso_639 (ex fre, eng)
                "codec": "string", // Codec do áudio (ex "aac", "mp3")
                "sampling": int, // Taxa de amostragem do áudio
                "channels": float // Número de canais (ex 2, 5.1, 7.1)
            }
        },
        "subtitles": [
            "und1": { // se disponível, idioma em iso_639 seguido por um número ID
                "stream": "string",
                "lang": "string", // Idioma em texto simples (ex English, French)
                "lang_iso": "string", // Idioma em iso_639 (ex fre, eng)
                "type": "string" // Formato das legendas (ex "ASS" / "SRT")
            }
        ]
    },
    "poster_path": "string", // URL da imagem do poster se encontrada / disponível
    "audio_image": "string", // URL da imagem da música em HD se encontrada / disponível
    "backdrop_path": "string" // URL da imagem de fundo se encontrada / disponível
}
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |
| 503 | Serviço indisponível (problema ao encontrar metadados da mídia) |

### /downloads

#### GET /downloads

**Descrição:** Obter lista de downloads do usuário  
Obtém a lista de downloads do usuário

**Parâmetros:**
| Nome | Tipo | Descrição |
|------|------|-----------|
| offset | int | Deslocamento inicial (deve estar entre 0 e cabeçalho HTTP X-Total-Count) |
| page | int | Sistema de paginação |
| limit | int | Entradas retornadas por página / requisição (deve estar entre 0 e 5000, padrão: 100) |

**Aviso:** Você não pode usar offset e page ao mesmo tempo, page tem prioridade caso isso aconteça.

**Valor de retorno:**

```json
[
    {
        "id": "string",
        "filename": "string",
        "mimeType": "string", // Tipo Mime do arquivo, adivinhado pela extensão do arquivo
        "filesize": int, // bytes, 0 se desconhecido
        "link": "string", // Link original
        "host": "string", // Domínio principal do host
        "chunks": int, // Máximo de Chunks permitidos
        "download": "string", // Link gerado
        "generated": "string" // jsonDate
    },
    {
        "id": "string",
        "filename": "string",
        "mimeType": "string",
        "filesize": int,
        "link": "string",
        "host": "string",
        "chunks": int,
        "download": "string",
        "generated": "string",
        "type": "string" // Tipo do arquivo (em geral, sua qualidade)
    }
]
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |

#### DELETE /downloads/delete/{id}

**Descrição:** Deletar um link da lista de downloads  
Deleta um link da lista de downloads, retorna código HTTP 204

**Valor de retorno:** Nenhum

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |
| 404 | Recurso desconhecido |

### /torrents

#### GET /torrents

**Descrição:** Obter lista de torrents do usuário  
Obtém a lista de torrents do usuário

**Parâmetros:**
| Nome | Tipo | Descrição |
|------|------|-----------|
| offset | int | Deslocamento inicial (deve estar entre 0 e cabeçalho HTTP X-Total-Count) |
| page | int | Sistema de paginação |
| limit | int | Entradas retornadas por página / requisição (deve estar entre 0 e 5000, padrão: 100) |
| filter | string | "active", lista apenas torrents ativos |

**Aviso:** Você não pode usar offset e page ao mesmo tempo, page tem prioridade caso isso aconteça.

**Valor de retorno:**

```json
[
    {
        "id": "string",
        "filename": "string",
        "hash": "string", // Hash SHA1 do torrent
        "bytes": int, // Tamanho apenas dos arquivos selecionados
        "host": "string", // Domínio principal do host
        "split": int, // Tamanho de divisão dos links
        "progress": int, // Valores possíveis: 0 a 100
        "status": "downloaded", // Status atual do torrent: magnet_error, magnet_conversion, waiting_files_selection, queued, downloading, downloaded, error, virus, compressing, uploading, dead
        "added": "string", // jsonDate
        "links": [
            "string" // URL do Host
        ],
        "ended": "string", // !! Presente apenas quando finalizado, jsonDate
        "speed": int, // !! Presente apenas nos status "downloading", "compressing", "uploading"
        "seeders": int // !! Presente apenas nos status "downloading", "magnet_conversion"
    },
    {
        "id": "string",
        "filename": "string",
        "hash": "string",
        "bytes": int,
        "host": "string",
        "split": int,
        "progress": int,
        "status": "downloaded",
        "added": "string",
        "links": [
            "string",
            "string"
        ],
        "ended": "string"
    }
]
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |

#### GET /torrents/info/{id}

**Descrição:** Obter informações sobre torrent  
Obtém todas as informações sobre o torrent solicitado

**Valor de retorno:**

```json
[
    {
        "id": "string",
        "filename": "string",
        "original_filename": "string", // Nome original do torrent
        "hash": "string", // Hash SHA1 do torrent
        "bytes": int, // Tamanho apenas dos arquivos selecionados
        "original_bytes": int, // Tamanho total do torrent
        "host": "string", // Domínio principal do host
        "split": int, // Tamanho de divisão dos links
        "progress": int, // Valores possíveis: 0 a 100
        "status": "downloaded", // Status atual do torrent: magnet_error, magnet_conversion, waiting_files_selection, queued, downloading, downloaded, error, virus, compressing, uploading, dead
        "added": "string", // jsonDate
        "files": [
            {
                "id": int,
                "path": "string", // Caminho para o arquivo dentro do torrent, começando com "/"
                "bytes": int,
                "selected": int // 0 ou 1
            },
            {
                "id": int,
                "path": "string", // Caminho para o arquivo dentro do torrent, começando com "/"
                "bytes": int,
                "selected": int // 0 ou 1
            }
        ],
        "links": [
            "string" // URL do Host
        ],
        "ended": "string", // !! Presente apenas quando finalizado, jsonDate
        "speed": int, // !! Presente apenas nos status "downloading", "compressing", "uploading"
        "seeders": int // !! Presente apenas nos status "downloading", "magnet_conversion"
    }
]
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |

#### GET /torrents/activeCount

**Descrição:** Obter número de torrents ativos atualmente  
Obtém o número de torrents ativos atualmente e o limite máximo atual

**Valor de retorno:**

```json
{
    "nb": int, // Número de torrents ativos atualmente
    "limit": int // Número máximo de torrents ativos que você pode ter
}
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |

#### GET /torrents/availableHosts

**Descrição:** Obter hosts disponíveis  
Obtém hosts disponíveis para fazer upload do torrent.

**Valor de retorno:**

```json
[
    {
        "host": "string", // Domínio principal do host
        "max_file_size": int // Tamanho máximo de divisão possível
    },
    {
        "host": "string", // Domínio principal do host
        "max_file_size": int // Tamanho máximo de divisão possível
    }
]
```

**Possíveis códigos de erro HTTP:**
| Código de Status HTTP | Motivo |
|----------------------|--------|
| 401 | Token inválido (expirado, inválido) |
| 403 | Permissão negada (conta bloqueada) |

#### PUT /torrents/addTorrent

**Descrição:** Adicionar arquivo torrent  
Adiciona um arquivo torrent para download, retorna código HTTP 201.

**Parâmetros:**
| Nome | Tipo | Descrição |
|------|------|-----------|
| host | string | Domínio do hoster (obtido de /torrents/availableHosts) |

**Valor de retorno:**

```json
{
  "id": "string",
  "uri": "string" // URL do recurso criado
}
```
