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
