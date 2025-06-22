# Padrões e Boas Práticas de Programação

Este documento descreve os padrões de codificação e as boas práticas a serem seguidas neste projeto. Aderir a estas diretrizes ajudará a manter o código limpo, legível e de fácil manutenção.

## Filosofia Geral: Clean Code

Inspirado nos princípios do "Clean Code" de Robert C. Martin, nosso objetivo é escrever um código que seja:

- **Legível:** Outros desenvolvedores (e nós mesmos no futuro) devem conseguir entender o código facilmente.
- **Simples:** O código deve fazer uma coisa e fazê-la bem. Evite complexidade desnecessária.
- **Manutenível:** Fácil de depurar, modificar e estender.

## Princípios de Orientação a Objetos (OOP)

Quando aplicável, especialmente em JavaScript, favorecemos uma abordagem orientada a objetos.

- **Encapsulamento:** Agrupar dados (propriedades) e os métodos que operam nesses dados dentro de uma classe. Exponha apenas o que for necessário.
- **Princípio da Responsabilidade Única (SRP):** Cada classe ou módulo deve ter apenas um motivo para mudar. Uma classe deve ter apenas uma responsabilidade.
- **Abstração:** Ocultar a complexidade da implementação e expor apenas a funcionalidade essencial.

## Diretrizes de Codificação

### 1. Nomenclatura

- **Variáveis e Funções:** Use `camelCase`. Os nomes devem ser descritivos e expressar a intenção.

  ```javascript
  // Bom
  let userProfile = getUserProfile(userId);
  const maxLoginAttempts = 3;

  // Ruim
  let data = get(id);
  const x = 3;
  ```

- **Classes:** Use `PascalCase`.
  ```javascript
  class UserSession {
    // ...
  }
  ```
- **Constantes:** Use `UPPER_SNAKE_CASE` para constantes que são "hard-coded" e globais no escopo de um módulo.
  ```javascript
  const API_KEY = "your-secret-key";
  ```
- **Arquivos:** Use `kebab-case` para nomes de arquivos (e.g., `user-profile.js`, `main-styles.css`). A exceção são componentes de frameworks que podem seguir outras convenções.

### 2. Funções

- **Pequenas e Focadas:** Funções devem ser pequenas e ter uma única responsabilidade (Single Responsibility Principle).
- **Poucos Argumentos:** Idealmente, uma função não deve ter mais do que 2 ou 3 argumentos. Se precisar de mais, considere passar um objeto como parâmetro.
- **Sem Efeitos Colaterais (Side Effects):** Uma função deve fazer o que seu nome diz e nada mais. Evite modificar variáveis globais ou parâmetros de entrada inesperadamente.

### 3. JavaScript (ES6+)

- **`let` e `const`:** Prefira `const` sempre que possível. Use `let` apenas para variáveis que precisam ser reatribuídas. Evite `var`.
- **Módulos (Imports/Exports):** Organize o código em módulos. Use `import` e `export` para compartilhar funcionalidades entre os arquivos. Isso evita a poluição do escopo global.
- **Arrow Functions:** Use arrow functions (`=>`) para funções anônimas e callbacks, especialmente quando precisar manter o contexto do `this`.
- **Promises e Async/Await:** Para operações assíncronas, use `async/await` para um código mais limpo e legível em vez de callbacks aninhados (`callback hell`).

### 4. HTML

- **Semântico:** Use tags HTML5 semânticas (`<main>`, `<section>`, `<article>`, `<nav>`, `<header>`, `<footer>`) para melhorar a acessibilidade (a11y) e o SEO.
- **Validação:** Mantenha o HTML válido. Use validadores para verificar seu código.
- **Atributos `alt`:** Sempre forneça um texto descritivo no atributo `alt` das imagens.

### 5. CSS

- **Metodologia BEM (Block, Element, Modifier):** Considere o uso da metodologia BEM para nomear as classes, a fim de manter o CSS modular e escalável.

  ```css
  /* Bloco */
  .card {
    /* ... */
  }

  /* Elemento */
  .card__title {
    /* ... */
  }

  /* Modificador */
  .card--featured {
    /* ... */
  }
  ```

- **Organização:** Estruture o CSS de forma lógica. Agrupe propriedades relacionadas.
- **Unidades Relativas:** Prefira unidades relativas (`rem`, `em`, `%`) para fontes e espaçamentos para melhor escalabilidade e acessibilidade.

### 6. Comentários

- **Comente o "porquê", não o "quê":** O código deve ser autoexplicativo sobre _o que_ ele faz. Use comentários para explicar _por que_ uma determinada abordagem foi tomada, especialmente se for uma solução não óbvia para um problema complexo.
- **Evite código comentado:** Remova código antigo ou não utilizado. O controle de versão (Git) é o lugar para o histórico do código.

### 7. Estrutura do Projeto

A estrutura atual é um bom ponto de partida:

- `index.html`: Ponto de entrada da aplicação.
- `styles.css`: Estilos principais. Para projetos maiores, considere dividir em múltiplos arquivos (e.g., `styles/main.css`, `styles/variables.css`).
- `script.js`: Lógica principal. Para projetos maiores, divida em módulos (e.g., `src/api.js`, `src/ui.js`, `src/main.js`).
- `reference/`: Documentação e material de referência.
- `.env`: Variáveis de ambiente. Nunca comite este arquivo no repositório. Use um `.env.example` se necessário.
