// Single controlled SQLite entry point for the platform.
// Keep node:sqlite in this file only so warning handling and future DB changes
// have one place to control.
const listeners = process.listeners('warning');
for (const listener of listeners) process.removeListener('warning', listener);
process.on('warning', warning => {
  const message = String(warning?.message || '');
  if (warning?.name === 'ExperimentalWarning' && message.includes('SQLite is an experimental feature')) return;
  process.stderr.write(`${warning?.stack || warning}\n`);
});

export const { DatabaseSync } = await import('node:sqlite');
