# Feedback JOs — rodada 4 (21/11, já em PRODUÇÃO)

⚠️ A `main` publica direto em joseeleticia.com. Trabalhar num branch novo
`feat/rodada4`; NADA na main sem o OK do JOs. Mesmas regras: tsc/eslint/vitest
verdes, um commit + screenshot por item (prefixo m58-…), provas em 427x952 e 1280.

Contexto: o JOs abriu o convite dele como convidado (aba anônima,
`joseeleticia.com/joseeleticia`) pra ver a experiência real.

## 58 — A abertura ainda é o placeholder "Em construção" (S1)
**Problema (print do JOs):** quem abre o convite vê `GamifiedPlaceholder`
(`src/components/guest/gamified-placeholder.tsx`, usado em
`src/app/(public)/[slug]/page.tsx`): "O convite em modo jogo está sendo preparado
com muito carinho", selo "EM CONSTRUÇÃO", "Em breve você vai poder explorar…",
botão "Entrar no jogo (beta)". O jogo JÁ ESTÁ PRONTO e no ar — isso passa a
impressão de site inacabado.
**Fazer:** transformar em uma ABERTURA DE JOGO de verdade (é a 1ª coisa que o
convidado vê):
1. Tirar "em construção", "está sendo preparado", "em breve" e o "(beta)".
2. Visual de tela-título de jogo, coerente com o jogo (pixel art / fonte
   `--font-press-start` no título ou no botão, moldura no estilo da caixa de
   diálogo GBA do item 52), usando a arte que já existe (ex.: recorte do
   mapa-múndi ou da vila como fundo). Nomes do casal, data e a contagem regressiva
   continuam (a contagem é ótima — manter).
3. Botão principal grande: "▶ COMEÇAR" / "Entrar no jogo" (sem beta).
   "Confirmar presença" vira secundário e discreto (o RSVP também acontece
   dentro do jogo, na caixa de correio da Vila) — não remover.
4. Texto curto convidando: algo como "Nosso convite é um joguinho: explore a vila,
   descubra nossas memórias e encontre sua mesa." → MOSTRAR o texto ao JOs antes
   de fechar (ele aprova o tom).
5. ⚠️ Conferir o token do convite: o botão de RSVP leva `?k=…`, mas o link do jogo
   (`/${slug}/jogo`) NÃO leva. Se o convidado chegou pelo link pessoal (?k=), o
   jogo tem que reconhecê-lo (não pode cair como visitante anônimo). Corrigir se
   estiver perdendo a identidade.
6. A barra de navegação de baixo (Início/Roteiro/Local/Lista de presentes)
   continua — só conferir que combina com a abertura nova.

## 59 — Tirar o botão "EN" (idioma)
**Problema:** o botão redondo "EN" no topo (`LocaleToggle`,
`src/components/guest/locale-toggle.tsx`, montado em
`src/app/(public)/[slug]/layout.tsx`) é desnecessário — o casamento é só em
português.
**Fazer:** não mostrar o `LocaleToggle` para o convidado (tirar do layout do
convite; se for opção do sistema pra outros eventos, deixar desligado por padrão
e desligado no `joseeleticia`). A barrinha "A ◑" (fonte/contraste) fica.

## 60 — Erro no console: service worker (sw.js)
**Problema (console do print):** `The FetchEvent for "https://joseeleticia.com/"
resulted in a network error response: the promise was rejected` +
`Uncaught (in promise) TypeError: Failed to convert value to 'Response'` (sw.js).
**Causa:** em `public/sw.js`, ramo "HTML pages (stale-while-revalidate)": se o
`fetch` falha e não há cache, o `.catch(() => cached)` devolve `undefined` pro
`respondWith`. Também cacheia respostas de erro/redirect.
**Fazer:** nunca entregar `undefined` ao `respondWith` (sem cache → deixar o erro
de rede original propagar / `Response.error()` ou uma página offline simples);
só cachear `res.ok` e não-redirect; mesma proteção nos ramos de imagem e
estáticos. Subir a versão do cache pra os navegadores pegarem o SW novo.
Provar: console limpo ao abrir `/` e `/joseeleticia` em aba anônima.
