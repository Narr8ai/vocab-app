import "../styles.css";
import { getList, type ListId, type VocabList } from "../data/vocab";

/**
 * Typed entry point for the application. The prototype markup and inline
 * controller remain in index.html during the migration; later tasks move
 * individual flows behind these module boundaries.
 */
export function bootstrap(): void {
  document.documentElement.dataset.appReady = "true";
}

/** Single typed boundary for screens that read the currently selected list. */
export function getSelectedList(listId: ListId): VocabList {
  return getList(listId);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
