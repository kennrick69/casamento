# Seed de Desenvolvimento

## Como rodar

```bash
pnpm db:seed
```

Requer `.env.local` com `DATABASE_URL` válido (Railway ou local).

---

## Evento Demo — José e Letícia

| Campo | Valor |
|-------|-------|
| Slug | `demo` |
| URL pública | `http://localhost:3000/demo` |
| Sala 3D pública | `http://localhost:3000/demo/sala-3d` |
| Data do casamento | 29/05/2027 |

### Credenciais do organizador

| Campo | Valor |
|-------|-------|
| Email | `demo@joseeleticia.com` |
| Senha | `demo123` |
| Admin | `http://localhost:3000/admin` |
| Sala 3D admin | `http://localhost:3000/admin/eventos/<id>/sala-3d` |

### Convidados

- **20 CONFIRMED**: Maria Silva, João Santos, Ana Oliveira, Pedro Costa... (ver seed.ts)
- **10 PENDING**: Camila Vieira, Marcos Ramos, Vanessa Cruz... (ver seed.ts)

### Layout do Venue3D

Floor: 20×15 tiles. 13 objetos:

| # | Tipo | Posição |
|---|------|---------|
| 1 | Mesa dos Noivos (TABLE_U) | (0, −5.5) centro-norte |
| 2 | Pista de Dança (DANCE_FLOOR) | (0, 0.5) centro |
| 3 | Palco (STAGE) | (0, −2.5) norte da pista |
| 4 | DJ Booth | (−4, −4.5) noroeste |
| 5 | Bar | (7, 5.5) sudeste |
| 6 | Buffet | (−7, 1.0) oeste |
| 7 | Mesa do Bolo (CAKE_TABLE) | (5.5, 5.5) perto do bar |
| 8–13 | Mesas Redondas 1–6 (TABLE_ROUND_8) | ao redor da pista |

---

## Evento Exemplo — Ana e Bruno

Slug: `casamento-exemplo` — criado pelo seed original.  
Sem Venue3D configurado (serve para testar outros recursos).

---

## Re-executar o seed

O seed é idempotente (usa `upsert`). Pode rodar múltiplas vezes sem duplicar dados.
