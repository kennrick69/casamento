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
  fotos: <><g fill="#fff7e6"><rect x="5" y="3" width="6" height="2"/><rect x="2" y="5" width="12" height="8"/></g><g fill="#2a7ae0"><rect x="6" y="7" width="4" height="4"/></g></>,
};

const FAIRY: Record<Kind, React.ReactNode> = {
  confirmados: <><path d="M15 7 q1 -3 2 0" stroke="#5a8a3a" strokeWidth="2" fill="none"/><ellipse cx="16" cy="19" rx="12" ry="9" fill="#e8822a" stroke="#b85c12" strokeWidth="1"/><g stroke="#b85c12" strokeWidth="1" fill="none"><path d="M16 11 v16"/><path d="M11 12 Q9 19 11 27"/><path d="M21 12 Q23 19 21 27"/></g></>,
  recusados: <g stroke="#c85a7a" strokeWidth="3" strokeLinecap="round"><line x1="9" y1="9" x2="23" y2="23"/><line x1="23" y1="9" x2="9" y2="23"/></g>,
  pendentes: <><circle cx="16" cy="16" r="13" fill="#fff" stroke="#6a8fd8" strokeWidth="2"/><g stroke="#2a3358" strokeWidth="2" strokeLinecap="round"><line x1="16" y1="16" x2="16" y2="7"/><line x1="16" y1="16" x2="19" y2="16"/></g><circle cx="16" cy="16" r="1.6" fill="#b88a2a"/></>,
  fotos: <><rect x="4" y="9" width="24" height="16" rx="3" fill="#9fc0ec" stroke="#6a8fd8" strokeWidth="1.5"/><rect x="11" y="6" width="10" height="4" rx="1.5" fill="#cfe0f7" stroke="#6a8fd8" strokeWidth="1"/><circle cx="16" cy="17" r="5" fill="#fff" stroke="#6a8fd8" strokeWidth="1.5"/><circle cx="16" cy="17" r="2" fill="#e8c35a"/></>,
};
