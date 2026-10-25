// Phase 4 workspace API was reverted. Keep a no-op stub so the remaining
// imports and route guards resolve; all /api/workspace/* requests now 404.
export async function handleWorkspaceApi() {
  return null;
}
