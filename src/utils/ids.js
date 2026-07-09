// Shared id generator for anything the user creates at runtime (custom tasks, started projects,
// milestones) — timestamp + random suffix is enough to avoid collisions in a single-user,
// client-only prototype with no backend to coordinate ids across.
export function makeTaskId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
