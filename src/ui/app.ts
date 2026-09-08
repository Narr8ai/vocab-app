import "../styles.css";

/**
 * Typed entry point for the application. The prototype markup and inline
 * controller remain in index.html during the migration; later tasks move
 * individual flows behind these module boundaries.
 */
export function bootstrap(): void {
  document.documentElement.dataset.appReady = "true";
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrap, { once: true });
} else {
  bootstrap();
}
