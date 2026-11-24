const pending = new Map();

export function loadScript(path) {
  if (!pending.has(path)) {
    pending.set(path, new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = new URL(path, import.meta.url).href;
      script.onload = resolve;
      script.onerror = () => {
        pending.delete(path);
        script.remove();
        reject(new Error('Не удалось загрузить учебный модуль.'));
      };
      document.head.append(script);
    }));
  }
  return pending.get(path);
}
