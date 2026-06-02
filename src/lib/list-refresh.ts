// Cross-route cache invalidation hint. Next's client Router Cache keeps a
// stale RSC payload for /scripts and /collections after the user navigates
// away. When we mutate something elsewhere (create/edit/delete from another
// route or a list item), we leave a flag here so the list page knows to
// router.refresh() the next time it mounts.

export const SCRIPTS_DIRTY_KEY = "koubo:scripts-dirty";
export const COLLECTIONS_DIRTY_KEY = "koubo:collections-dirty";

export function markScriptsDirty() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(SCRIPTS_DIRTY_KEY, "1");
}

export function markCollectionsDirty() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COLLECTIONS_DIRTY_KEY, "1");
}
