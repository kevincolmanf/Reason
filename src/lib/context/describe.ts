// Metadatos legibles de cada tipo de workspace, para que el usuario entienda
// dónde está parado y qué puede hacer. Compartido entre el badge de escritorio
// (ContextBadge) y el switcher de mobile (HeaderClient).

export type WorkspaceKind = 'personal' | 'owner' | 'member'

// Subtítulo corto que explica qué es cada workspace.
export function workspaceSubtitle(kind: WorkspaceKind): string {
  switch (kind) {
    case 'personal':
      return 'Tu espacio · pacientes solo tuyos'
    case 'owner':
      return 'Centro · sos el dueño'
    case 'member':
      return 'Centro · integrante del equipo'
  }
}

// Agrupado del selector de workspace, en el orden en que se pidió separarlo:
// tu espacio propio, el centro que vos administrás (si tenés uno) y, aparte,
// los centros donde participás como invitado (pueden ser varios, si trabajás
// en más de un lugar que usa Reason) — antes era una lista plana y costaba
// distinguir "mi centro" de "donde me invitaron". Compartido entre el switcher
// de escritorio (ContextBadge) y el de mobile (HeaderClient).
export const WORKSPACE_GROUPS: { key: string; label: string; kinds: WorkspaceKind[] }[] = [
  { key: 'personal', label: 'Tu espacio', kinds: ['personal'] },
  { key: 'owner', label: 'Tu equipo', kinds: ['owner'] },
  { key: 'member', label: 'Centros donde participás', kinds: ['member'] },
]
