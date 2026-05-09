# Guia do Casal — Como usar a plataforma

## 1. Criar sua conta

1. Acesse `/` e clique em **Criar conta**
2. Preencha nome, email e senha (mínimo 8 caracteres)
3. Confirme o email recebido (verifique spam)
4. Complete o onboarding: perfil → evento → tema → locais → convidados

---

## 2. Configurar o evento

### Dados básicos
Em `/admin/eventos/[id]/configuracoes`:
- **Nomes do casal**: aparece no topo de todas as páginas dos convidados
- **Data da cerimônia**: controla o countdown e muda a barra de navegação no dia D
- **Slug**: parte da URL pública (ex: `/ricardoeana`)
- **Tema visual**: 5 opções (clássico, rústico, minimal, boho, praiano)
- **Idiomas**: PT-BR ativo por padrão; EN opcional

### Locais
Em `/admin/eventos/[id]/locais`:
- Adicione cerimônia, recepção, após-festa
- Endereço gera link para Google Maps automaticamente
- **isPublic**: desmarcado = visível só para você (futuro: por grupo de convidado)

### Roteiro
Em `/admin/eventos/[id]/roteiro`:
- Adicione itens com hora, título e descrição
- Eles aparecem na aba "Roteiro" para os convidados no dia D

---

## 3. Gerenciar convidados

### Adicionar manualmente
Em `/admin/eventos/[id]/convidados` → **Novo convidado**

### Importar planilha
Em `/admin/eventos/[id]/convidados/importar`:
1. Baixe o **template CSV** para ver o formato esperado
2. Faça upload do arquivo (.csv ou .xlsx)
3. Mapeie as colunas: Nome, Email, Telefone, +1, Restrição alimentar
4. Revise preview (primeiras 10 linhas)
5. Escolha o que fazer com duplicatas (pular ou atualizar)
6. Clique **Importar** — relatório mostra X importados, Y erros

### Enviar save-the-date
Em `/admin/eventos/[id]/save-the-date`:
1. Escolha template (clássico, rústico, minimal)
2. Selecione convidados (ou todos)
3. Clique **Gerar PDFs** — baixa um ZIP com 1 PDF por convidado
4. Cada PDF tem um QR code único para o RSVP daquele convidado

### Enviar convite por WhatsApp
Na lista de convidados, clique no ícone do WhatsApp ao lado de cada convidado.
Abre uma mensagem pré-preenchida com o link personalizado.

---

## 4. Acompanhar RSVPs

Em `/admin/eventos/[id]` (dashboard):
- **Total confirmados / recusados / pendentes**
- **+1s confirmados**
- **Restrições alimentares**: contador por tipo
- Clique em qualquer convidado para ver detalhes ou editar

---

## 5. Presentes

Em `/admin/eventos/[id]/presentes`:
- Adicione itens (nome, descrição, link, valor sugerido)
- Convidados podem reservar presentes diretamente pelo app
- 3 modos de doação: confiança, PIX com comprovante, gateway (stub)

---

## 6. Playlist

Em `/admin/eventos/[id]/playlist`:
- Convidados sugerem músicas via busca no Spotify
- Você aprova ou rejeita cada sugestão
- Playlist aprovada fica visível para todos

---

## 7. Mural de fotos e chat

- **Mural**: convidados enviam fotos → você modera em `/admin/eventos/[id]/mural`
- **Chat**: mensagens em tempo real no dia do evento; moderação em `/admin/eventos/[id]/chat`

---

## 8. Gincana

Em `/admin/eventos/[id]/gincana`:
- Crie missões (tirar foto, ir ao local X, falar com o avô)
- Convidados ganham pontos ao completar
- Ranking visível no app dos convidados
- Configure prêmio e se ele é visível antes do evento

---

## 9. Backup e dados

Em `/admin/saude/backups`:
- Backups automáticos diários (Railway 60 dias + B2 90 dias se configurado)
- Log de execuções com status de cada run

Para exportar seus próprios dados (LGPD):
- `/admin/conta` → seção **Dados e privacidade** → **Exportar todos os meus dados (ZIP)**

---

## 10. Co-organizadores

Em `/admin/eventos/[id]/co-organizadores`:
- Convide alguém como EDITOR ou OWNER
- EDITOR: edita tudo, sem acesso a configurações críticas
- OWNER: acesso total, pode convidar outros

---

## 11. Editor visual de convite

Em `/admin/eventos/[id]/personalizar`:
- Ajuste as cores do tema (primária, secundária, fundo, destaques)
- Escolha tipografia (clássica, moderna, romântica)
- Ative/desative seções (história, padrinhos, livro de mensagens)
- Mude o layout do hero (centralizado ou dividido)
- Clique **Publicar** para salvar e visualizar no iframe ao lado

---

## 12. Plano de mesas

Em `/admin/eventos/[id]/mesas`:
- Crie mesas com nome e capacidade
- Arraste convidados da sidebar para a mesa desejada
- Cada convidado pode estar em apenas uma mesa
- Clique **Exportar PDF** para imprimir o plano completo
- Convidados veem sua mesa na tela de confirmação do RSVP

---

## 13. Ao Vivo (dia do evento)

Em `/admin/eventos/[id]/ao-vivo`:
- Poste atualizações em tempo real para os convidados (cerimônia, brinde, música, etc.)
- Use os botões rápidos ou escreva mensagem personalizada
- Os convidados veem em `/[slug]/ao-vivo` com indicador vermelho animado

---

## 14. Agradecimentos

Em `/admin/eventos/[id]/agradecimentos`:
- Lista todos os convidados confirmados com o presente registrado
- Gera mensagem de agradecimento automática por convidado
- Edite o presente e o texto, salve rascunho ou marque como enviado
- Barra de progresso mostra quantos agradecimentos já foram enviados

---

## 15. Digest de email

Em `/admin/eventos/[id]/notificacoes` → **Resumo por email**:
- Escolha a frequência: Desativado / Diário / Semanal (segundas-feiras)
- Cada digest inclui: novas confirmações, fotos pendentes, mensagens sinalizadas, dias restantes

---

## 16. Modo TV

Acesse `/[slug]/tv` em um computador conectado a um projetor ou TV.
- Slideshow fullscreen com fotos do mural, mensagens do chat e cronograma
- Avança automaticamente a cada 8 segundos
- Navegar com as setas do teclado ou clicando nas bordas da tela
- Atualizações ao vivo do painel Admin aparecem como banner

---

## Perguntas frequentes

**Os convidados precisam criar conta?**
Não. O link de RSVP é único por convidado (contém um token). Eles acessam sem login.

**Posso ter mais de um evento?**
Sim. Cada evento tem seu próprio slug e painel.

**E se o convidado quiser atualizar o RSVP?**
O mesmo link do WhatsApp/QR funciona. A confirmação anterior é substituída.

**O que acontece com os dados após o evento?**
Ficam disponíveis por 1 ano após a data da cerimônia. Você receberá aviso 30 dias antes do arquivamento.
