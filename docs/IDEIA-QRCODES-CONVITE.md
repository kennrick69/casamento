# Ideia do JOs — QR codes impressos no convite (S4) — RASCUNHO p/ aprovação

Status: APROVADA em conceito (decisões do JOs em §5, 21/11). Implementar DEPOIS da
rodada 4, num branch próprio.
Branch próprio quando aprovado (`feat/s4-qrcodes`); nada na main sem OK.

## 1. O que o JOs quer
- No painel do organizador, o casal define o NÚMERO DE CONVIDADOS (ex.: 40).
- O sistema gera uma FOLHA PARA IMPRIMIR com 40 QR codes, um por convidado, todos
  diferentes. Cada QR dá acesso ÚNICO pra entrar no evento e criar o avatar.
- Os QR codes vão no envelope junto com o convite impresso (se o casal quiser).
- Na tela de entrada do jogo, o convidado escolhe:
  (a) digitar o CÓDIGO que veio no convite digital, ou
  (b) ESCANEAR o QR code que recebeu no envelope.

## 2. Proposta técnica (pra discutir)
- **Modelo:** `InviteCode { id, eventId, code (8 chars base32, sem 0/O/1/I),
  createdAt, claimedAt?, guestId?, batch }`. Código aleatório e impossível de
  adivinhar; rate-limit no resgate.
- **QR aponta pra URL curta:** `joseeleticia.com/<slug>/c/<CODIGO>`. Com a câmera
  normal do celular já abre direto (é o caminho de 95% das pessoas). O código
  também vai IMPRESSO em texto embaixo do QR pra quem preferir digitar.
- **Resgate:** 1º uso do código → cria/vincula o convidado → criador de
  personagem → jogo. O código fica preso a essa pessoa (passkey do S2 pra voltar
  depois em outro aparelho). 2º uso de um código já resgatado → "Este convite já
  foi usado por <Nome>. É você? Entre com sua passkey".
- **Folha de impressão (painel):** página "Convites impressos" → define N → gera
  PDF A4 em grade (ex.: 8 cartões por folha) com linha de corte, cada cartão com
  QR + código + frase curta ("Aponte a câmera e entre no nosso convite-jogo") no
  visual do site/jogo. Dá pra gerar mais depois (novo lote) e invalidar código
  perdido.
- **Tela de entrada do jogo (abertura, item 58):** dois botões:
  "Tenho um código" (campo de 8 letras) e "Escanear QR code" (câmera na própria
  página — BarcodeDetector nativo + fallback jsQR; no PC sem câmera, só o campo).
- **Painel:** lista dos códigos: livre / usado por quem / quando; reimprimir um;
  invalidar.

## 3. Como conversa com o que já existe
- Hoje: convidado da lista tem link pessoal `?k=token` (convite digital) e o RSVP
  real acontece na caixa de correio da Vila; visitante entra sem lista.
- O "código do convite digital" do item (a) pode ser o próprio token do convidado
  em formato curto (mesmo esquema de 8 letras) — assim digital e impresso usam a
  mesma porta de entrada.

## 4. Decisões abertas (perguntar ao JOs)
1. **Códigos em branco ou com nome?** (a) N códigos em branco: quem resgatar
   informa o nome e entra na lista; (b) um código por convidado JÁ cadastrado na
   lista, impresso com o nome dele no cartão; (c) os dois.
2. **Quem resgata um código em branco vira convidado "de verdade"** (conta na
   lista, confirma presença real na caixa de correio, ganha mesa)? Ou só joga?
3. **Família/acompanhantes:** 1 QR por PESSOA (cada um cria seu avatar, inclusive
   crianças) ou 1 QR por CONVITE/família (quem resgata cadastra os acompanhantes)?

## 5. Decisões do JOs (21/11)
1. **Códigos EM BRANCO.** Escaneou/digitou → cria o avatar e informa o próprio
   NOME. (Assumido, confirmar com o JOs ao mostrar: quem resgata vira convidado da
   lista — confirma presença real na caixa de correio e pode ganhar mesa.)
2. **Família no mesmo QR:** no resgate, opção "Cadastrar quem vem com você"
   (marido/esposa, filhos…) usando o mesmo código — reaproveitar os
   ACOMPANHANTES do S2 (`GuestCompanion`; `GameCharacter.companionId` já existe):
   cada acompanhante cria o seu avatar (criança com `isChild`).
3. **A família ANDA JUNTO no jogo:** os avatares dos acompanhantes seguem o
   jogador (estilo "seguidores" de Pokémon: fila atrás dele, pisando nas mesmas
   casas, mesma colisão pela sola) no mapa-múndi e nas 3 fases. No Grande Dia, a
   família é guiada junto até a mesa.
4. Número de acompanhantes por código: definido no painel ao gerar o lote (ex.:
   até 4 por convite) — PERGUNTAR o padrão ao JOs na hora de implementar.
