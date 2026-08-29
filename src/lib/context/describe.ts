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
