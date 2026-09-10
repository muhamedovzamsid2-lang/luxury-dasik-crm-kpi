// Load before application modules so Node's SQLite ExperimentalWarning is filtered
// even when a dependency imports node:sqlite during ES module initialization.
process.on('warning', warning => {
  const message = String(warning?.message || '');
  if (warning?.name === 'ExperimentalWarning' && message.includes('SQLite is an experimental feature')) return;
  process.stderr.write(`${warning?.stack || warning}\n`);
});
