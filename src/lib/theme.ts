export const THEME_STORAGE_KEY = "ping.theme";

/**
 * Inline <head> script: applies the stored theme before first paint so there
 * is no light→dark flash. Lives outside the "use client" hook module because
 * the server layout needs the string itself, not a client reference.
 */
export const themeInitScript = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d)}catch(e){}})()`;
