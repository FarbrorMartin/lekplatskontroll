// Runs every test suite. Prints one line on success and the failing output otherwise.
const {spawnSync} = require('node:child_process');

const suites = ['test-workbook.cjs', 'test-app.cjs', 'test-sw.cjs'];
const failed = suites.filter(suite => {
  const result = spawnSync(process.execPath, [suite], {cwd: __dirname, encoding: 'utf8'});
  if (result.status === 0) return false;
  console.error(`FAILED ${suite}\n${result.stdout}${result.stderr}`);
  return true;
});
if (failed.length) process.exitCode = 1;
else console.log(`All ${suites.length} test suites passed.`);
