// Validates an Excel file with the same rules as the app. Run before publishing a new workbook.
const fs = require('node:fs');
const vm = require('node:vm');
const XLSX = require('./vendor/xlsx.mini.min.js');

const file = process.argv[2] || 'data/lekplatskontroll.xlsx';
const ctx = vm.createContext({XLSX});
vm.runInContext(fs.readFileSync('parks-data.js', 'utf8'), ctx);
vm.runInContext(fs.readFileSync('workbook-data.js', 'utf8'), ctx);
try {
  const config = ctx.configurationFromWorkbook(XLSX.read(fs.readFileSync(file)));
  const checks = Object.values(config.featureTypes).reduce((sum, type) => sum + type.points.length, 0);
  console.log(`${file} är giltig: ${config.parks.length} lekplatser, ${Object.keys(config.featureTypes).length} element, ${checks} kontroller.`);
} catch (error) {
  console.error(`${file} är ogiltig: ${error.message}`);
  process.exitCode = 1;
}
