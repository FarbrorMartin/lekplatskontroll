import fs from 'node:fs/promises';
import {Workbook, SpreadsheetFile, FileBlob} from '@oai/artifact-tool';

const outputDir = 'outputs/xlsx-template';
await fs.mkdir(outputDir, {recursive: true});
const workbook = Workbook.create();
const previous = await SpreadsheetFile.importXlsx(await FileBlob.load('data/lekplatskontroll.xlsx'));
const parks = previous.worksheets.getItem('Lekplatsmatris').getUsedRange().values;
const oldChecks = previous.worksheets.getItemAt(1);
const sourceRows = oldChecks.getUsedRange().values;
let checks;
if (oldChecks.name === 'Element') {
  checks = sourceRows;
} else {
  const names = sourceRows[0].slice(2);
  const lists = names.map((_, i) => sourceRows.slice(1).filter(row => String(row[i + 2] || '').toUpperCase() === 'X').map(row => row[1]));
  checks = [names, ...Array.from({length: Math.max(...lists.map(list => list.length))}, (_, i) => lists.map(list => list[i] || ''))];
}

const fixedCols = parks[0].indexOf('Gångbro');
for (const [name, rows, labelCols] of [['Lekplatsmatris', parks, fixedCols], ['Element', checks, 0]]) {
  const sheet = workbook.worksheets.add(name);
  const lastCol = String.fromCharCode(64 + rows[0].length);
  const firstMatrixCol = String.fromCharCode(65 + labelCols);
  const lastRow = rows.length;
  const all = sheet.getRange(`A1:${lastCol}${lastRow}`);
  all.values = rows;
  all.format.font = {name: 'Arial', size: 11, color: '#1E293B'};
  all.format.verticalAlignment = 'center';
  all.format.rowHeight = 32;
  all.format.columnWidth = 18;
  const header = sheet.getRange(`A1:${lastCol}1`);
  header.format.fill = '#1B4332';
  header.format.font = {name: 'Arial', size: 11, bold: true, color: '#FFFFFF'};
  header.format.horizontalAlignment = 'center';
  header.format.rowHeight = 40;
  header.format.wrapText = true;
  if (name === 'Lekplatsmatris') {
    sheet.getRange(`A2:A${lastRow}`).format.font.color = '#64748B';
    sheet.getRange(`A1:A${lastRow}`).format.columnWidth = 16;
    sheet.getRange(`B1:B${lastRow}`).format.columnWidth = 30;
    sheet.getRange(`B2:B${lastRow}`).format.wrapText = true;
    sheet.getRange(`C1:D${lastRow}`).format.columnWidth = 23;
    const matrix = sheet.getRange(`${firstMatrixCol}2:${lastCol}${lastRow}`);
    matrix.format.fill = '#FFF7DB';
    matrix.format.horizontalAlignment = 'center';
    matrix.dataValidation = {rule: {type: 'list', values: ['X']}};
    matrix.conditionalFormats.add('cellIs', {operator: 'equal', formula: '"X"', format: {fill: '#D8F3DC', font: {bold: true, color: '#1B4332'}}});
    sheet.freezePanes.freezeColumns(labelCols);
  } else {
    all.format.columnWidth = 42;
    const body = sheet.getRange(`A2:${lastCol}${lastRow}`);
    body.format.wrapText = true;
    body.format.rowHeight = 46;
    body.format.fill = '#FFF7DB';
  }
  sheet.freezePanes.freezeRows(1);
  sheet.showGridLines = false;
}

workbook.recalculate();
for (const name of ['Lekplatsmatris', 'Element']) {
  const inspection = await workbook.inspect({kind: 'table', range: `${name}!A1:H8`, include: 'values', tableMaxRows: 8, tableMaxCols: 8, maxChars: 2200});
  console.log(inspection.ndjson);
  const preview = await workbook.render({sheetName: name, autoCrop: 'all', scale: 1, format: 'png'});
  await fs.writeFile(`${outputDir}/${name}.png`, new Uint8Array(await preview.arrayBuffer()));
}
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(`${outputDir}/lekplatskontroll.xlsx`);
await fs.copyFile(`${outputDir}/lekplatskontroll.xlsx`, 'data/lekplatskontroll.xlsx');
console.log('Saved data/lekplatskontroll.xlsx');
