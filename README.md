# Franca's Rhythm Trip

> [!WARNING]
> Projeto em desenvolvimento. A estrutura principal do jogo já existe, mas conteúdo, apresentação visual e alguns fluxos ainda precisam de trabalho antes de uma publicação pública.

Versão do projeto: 0.2 (em desenvolvimento)

Desenvolvido por Felipe

---
## 🛠️ Status do Projeto

| Funcionalidade | Status |
| :--- | :---: |
| **Aplicação React/Vite e navegação entre telas** | 🟢 Implementado |
| **Motor de gameplay: charts, notas, julgamento, score e vida** | 🟢 Implementado; precisa de validação e balanceamento |
| **Áudio compartilhado via AudioContext e desbloqueio por interação** | 🟢 Implementado; integração dos volumes precisa ser consolidada |
| **Modo história com tutorial e 3 semanas** | 🟡 Estrutura implementada; conteúdo e desbloqueios incompletos |
| **Freeplay, 3 dificuldades e recorde por música** | 🟡 Implementado; metadados e apresentação ainda incompletos |
| **Backgrounds e ícones para parte do conteúdo** | 🟡 Parcial |
| **Sprites de personagens conectados à gameplay** | 🔴 Pendente; o canvas atual mostra placeholders de texto |
| **Padronização visual das telas** | 🔴 Pendente |
| **Configurações salvas: volume, offset, controles e scroll** | 🟡 Persistidas localmente; controles são presets, não remapeamento livre |
| **Pausa, derrota e saída da música** | 🟡 Fluxo básico implementado; falta definir o comportamento final |
| **Reset separado de configurações e progresso** | 🔴 Pendente |
| **Tela de resultados e resumo de desempenho** | 🔴 Pendente |
| **Suporte responsivo e versão mobile** | 🔴 Pendente |
| **Opções de idioma e créditos** | 🔴 Pendente |
| **Documentação funcional e processo de publicação** | 🔴 Pendente |
| **Multijogador local/online** | ⚪ Fora do escopo inicial sugerido |

## Melhorias

- Consolidar configurações, progresso e sessão em estados/contextos bem definidos, mantendo compatibilidade com os dados locais existentes (`rhythm_*`, `isDownscroll`, `fnf_highscores` e `hs_week_*`).
- Finalizar a integração do AudioEngine com volumes globais e por categoria; confirmar volume de menu, efeitos, música de gameplay e offset.
- Completar charts únicos para cada faixa. Hoje algumas músicas reutilizam o chart de outra faixa, e o tutorial usa `menu-theme.mp3` como áudio de teste.
- Definir e implementar o fluxo completo da partida: countdown, pausa, retomar, derrota, saída, conclusão, resultados e transição entre faixas da semana.
- Ligar spritesheet e animações reais dos personagens à cena de gameplay e substituir os placeholders de `CharacterCanvas`.
- Fechar os layouts de StartScreen, MainMenu, StoryMode, Settings e Freeplay com uma linguagem visual consistente e navegação por teclado e mouse.
- Implementar remapeamento individual das quatro teclas, sliders de volume, ajuste de offset e ações separadas para resetar configurações e progresso.
- Tornar desbloqueios e recordes confiáveis e persistentes. Atualmente o desbloqueio de faixa secreta fica apenas em estado de sessão e é ativado ao terminar qualquer semana.
- Rever carregamento e tamanho dos assets de áudio e charts; a faixa secreta tem arquivo de chart grande e as músicas são decodificadas em memória para gameplay.
- Planejar acessibilidade básica, responsividade, instruções de controles, créditos/licenças dos assets e preparação para publicação.

## Sugestões

### Como o jogo funciona hoje

- **StartScreen:** tela de título com música, transição por tecla ou clique.
- **MainMenu:** navegação entre Story, Freeplay e Settings.
- **StoryMode:** seleção de tutorial/semanas, dificuldade e exibição de recorde semanal; ao concluir uma faixa, a próxima começa automaticamente.
- **Freeplay:** lista de faixas, seletor Easy/Normal/Hard e recorde local por faixa/dificuldade. A faixa secreta pode ser alternada pelo atalho `7` enquanto o menu está aberto.
- **Gameplay:** canvas em resolução fixa 1280×720, quatro lanes para jogador e oponente, notas tap/hold, julgamentos, score, precisão e barra de vida. `Escape` pausa e, na tela pausada, `Enter` retoma e `Escape` sai.
- **Persistência:** configurações e recordes usam `localStorage`; não há conta ou sincronização entre dispositivos.

### Pontos funcionais para decidir antes dos wireframes

1. **Estrutura de progressão:** semanas lineares ou todas disponíveis? O tutorial é obrigatório? O que desbloqueia a faixa secreta: terminar uma semana, alcançar uma nota ou outro critério? A dificuldade deve ser lembrada por modo ou globalmente?
2. **Derrota e saída:** ao zerar a vida, mostrar resultados, permitir retry ou retornar ao menu? Sair no meio deve salvar score parcial? Em Story, sair interrompe a semana inteira?
3. **Resultados:** quais dados aparecem ao fim da música (score, precisão, misses, rank, recorde novo, retry/próxima faixa)? Em Story, exibir resultado entre músicas ou tocar a próxima imediatamente?
4. **Seleção de música:** quais dados cada item precisa exibir além de nome/ícone (duração, personagem, dificuldade disponível, melhor rank/score)? Deve haver prévia de áudio?
5. **Controles e entrada:** remapeamento de quatro lanes, suporte a teclado/mouse/toque e indicação de teclas na HUD. Para mobile, definir se o jogo terá botões na tela e orientação obrigatória.
6. **Configurações e dados:** confirmar escopo de Reset Settings e Reset Progress, confirmação antes de apagar, persistência da dificuldade e se records contam em caso de derrota/saída.
7. **Gameplay e desempenho:** confirmar HUD, posição de lanes e personagens, direção de scroll padrão, resolução/aspect ratio alvo e requisitos mínimos do notebook/navegador.
8. **Conteúdo e lançamento:** quantidade de semanas/faixas no lançamento, classificação/aviso de conteúdo, créditos e autorização de uso das músicas, imagens e fontes.

### Materiais úteis para a próxima etapa

- Wireframes de cada tela e dos estados de pausa, derrota e resultados.
- Spritesheets dos personagens (com orientação sobre grade, tamanho de frame, pivô e nomes das animações) e backgrounds finais.
- Ícones/logos, paleta e referências visuais por modo/tela.
- Para cada faixa: áudio final, chart de jogador e oponente, BPM/offset, título, duração, personagem/ícone, background e nível de dificuldade.
- Decisões para os pontos funcionais acima, especialmente progressão, retry, desbloqueios e mobile.

### Sugestões de contribuição

Envie sugestões de melhorias, fases ou design pelo contato: francadev26@gmail.com

---

## Desenvolvimento local

Requisitos: Node.js e npm.

```bash
npm install
npm run dev
```

Comandos disponíveis: `npm run build`, `npm run preview` e `npm run lint`.
