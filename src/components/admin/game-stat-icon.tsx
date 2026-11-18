// Ícones próprios de cada skin para os contadores do dashboard (porte da prévia
// aprovada). Renderiza as 3 variantes; o CSS (.sk-ico + [data-game-skin])
// mostra só a do skin ativo e esconde todas fora de um .game-skin. Sem emoji.
// Arte própria/genérica, sem marca de terceiros.

type Kind = "confirmados" | "recusados" | "pendentes" | "fotos";

const S = "game-stat-ico sk-ico";

export function GameStatIcon({ kind }: { kind: Kind }) {
  return (
    <>
      <svg className={`${S} sk-metal`} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
        {METAL[kind]}
      </svg>
      <svg className={`${S} sk-pixel`} viewBox="0 0 16 16" shapeRendering="crispEdges" aria-hidden="true">
        {PIXEL[kind]}
      </svg>
      <svg className={`${S} sk-fairy`} viewBox="0 0 32 32" aria-hidden="true">
        {FAIRY[kind]}
      </svg>
    </>
  );
}

const METAL: Record<Kind, React.ReactNode> = {
  confirmados: <g fill="#4fae3a"><rect x="12" y="3" width="2" height="2"/><rect x="10" y="5" width="2" height="2"/><rect x="8" y="7" width="2" height="2"/><rect x="6" y="9" width="2" height="2"/><rect x="2" y="7" width="2" height="2"/><rect x="4" y="9" width="2" height="2"/><rect x="4" y="11" width="4" height="2"/></g>,
  recusados: <g fill="#c81e1e"><rect x="3" y="3" width="2" height="2"/><rect x="11" y="3" width="2" height="2"/><rect x="5" y="5" width="2" height="2"/><rect x="9" y="5" width="2" height="2"/><rect x="7" y="7" width="2" height="2"/><rect x="5" y="9" width="2" height="2"/><rect x="9" y="9" width="2" height="2"/><rect x="3" y="11" width="2" height="2"/><rect x="11" y="11" width="2" height="2"/></g>,
  pendentes: <g fill="#ffbf2e"><rect x="3" y="2" width="10" height="2"/><rect x="3" y="12" width="10" height="2"/><rect x="4" y="4" width="8" height="1"/><rect x="5" y="5" width="6" height="1"/><rect x="6" y="6" width="4" height="1"/><rect x="7" y="7" width="2" height="2"/><rect x="6" y="9" width="4" height="1"/><rect x="5" y="10" width="6" height="1"/><rect x="4" y="11" width="8" height="1"/></g>,
  fotos: <g fill="#9a9a9a"><rect x="5" y="3" width="6" height="2"/><rect x="2" y="5" width="12" height="8"/><rect x="6" y="7" width="4" height="4"/></g>,
};

const PIXEL: Record<Kind, React.ReactNode> = {
  confirmados: <g fill="#e52521"><rect x="3" y="3" width="4" height="2"/><rect x="9" y="3" width="4" height="2"/><rect x="2" y="5" width="12" height="3"/><rect x="3" y="8" width="10" height="2"/><rect x="4" y="10" width="8" height="1"/><rect x="5" y="11" width="6" height="1"/><rect x="6" y="12" width="4" height="1"/><rect x="7" y="13" width="2" height="1"/></g>,
  recusados: <g fill="#e52521"><rect x="3" y="3" width="2" height="2"/><rect x="11" y="3" width="2" height="2"/><rect x="5" y="5" width="2" height="2"/><rect x="9" y="5" width="2" height="2"/><rect x="7" y="7" width="2" height="2"/><rect x="5" y="9" width="2" height="2"/><rect x="9" y="9" width="2" height="2"/><rect x="3" y="11" width="2" height="2"/><rect x="11" y="11" width="2" height="2"/></g>,
  pendentes: <><g fill="#c0601c"><rect x="1" y="2" width="14" height="12"/></g><g fill="#7a3a0c"><rect x="1" y="2" width="14" height="1"/><rect x="1" y="7" width="14" height="1"/><rect x="1" y="12" width="14" height="1"/><rect x="5" y="3" width="1" height="4"/><rect x="10" y="3" width="1" height="4"/><rect x="3" y="8" width="1" height="4"/><rect x="8" y="8" width="1" height="4"/><rect x="12" y="8" width="1" height="4"/></g></>,
  fotos: <><g fill="#c0601c"><rect x="5" y="3" width="6" height="2"/><rect x="2" y="5" width="12" height="8"/></g><g fill="#fff7e6"><rect x="6" y="7" width="4" height="4"/></g><g fill="#2a7ae0"><rect x="7" y="8" width="2" height="2"/></g></>,
};

const FAIRY: Record<Kind, React.ReactNode> = {
  confirmados: <><polygon points="4,24 7,11 13,17 16,7 19,17 25,11 28,24" fill="#e8c35a" stroke="#b88a2a" strokeWidth="1"/><rect x="4" y="24" width="24" height="4" rx="1" fill="#d9ad3c" stroke="#b88a2a" strokeWidth="1"/><circle cx="7" cy="11" r="1.6" fill="#8fb6ec"/><circle cx="16" cy="7" r="1.8" fill="#6a8fd8"/><circle cx="25" cy="11" r="1.6" fill="#8fb6ec"/></>,
  recusados: <g stroke="#c85a7a" strokeWidth="3" strokeLinecap="round"><line x1="9" y1="9" x2="23" y2="23"/><line x1="23" y1="9" x2="9" y2="23"/></g>,
  pendentes: <><circle cx="16" cy="16" r="13" fill="#fff" stroke="#6a8fd8" strokeWidth="2"/><g stroke="#2a3358" strokeWidth="2" strokeLinecap="round"><line x1="16" y1="16" x2="16" y2="7"/><line x1="16" y1="16" x2="19" y2="16"/></g><circle cx="16" cy="16" r="1.6" fill="#b88a2a"/></>,
  fotos: <><path d="M4 21 Q4 13 13 13 L22 13 Q27 13 27 18 L27 21 Z" fill="#a9c9f0" stroke="#6a8fd8" strokeWidth="1.5" strokeLinejoin="round"/><rect x="23" y="21" width="3" height="5" fill="#9fc0ec" stroke="#6a8fd8" strokeWidth="1"/><rect x="3" y="21" width="24" height="2.6" rx="1" fill="#cfe0f7" stroke="#6a8fd8" strokeWidth="0.8"/><circle cx="12" cy="11" r="1.6" fill="#e8c35a"/></>,
};
