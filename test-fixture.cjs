// A small workbook built in memory, so the tests do not depend on the published Excel data.
const XLSX = require('./vendor/xlsx.mini.min.js');

const parks = [
  ['Lekplats', 'Gångbro', 'Spång', 'Skulptur', 'Lekhus'],
  ['Ekparken', 'X', '', 'X', 'X'],
  ['Björkparken', '', 'x', '', 'X'],
  ['Lindparken', 'X', 'X', '', '']
];
const elements = [
  ['Gångbro', 'Spång', 'Skulptur', 'Lekhus'],
  ['Inga vassa kanter', 'Plankor hela', 'Stabil sockel', 'Inga vassa kanter'],
  ['Räcken fasta', 'Inga lösa spikar', 'Ingen klätterrisk', 'Taket helt'],
  ['Bultar åtdragna', 'Fäste i mark', 'Ytan hel', 'Golvet helt'],
  ['Underlaget helt', 'Underlaget helt', '', 'Inga klämrisker'],
  ['Inga klämrisker', 'Inga klämrisker', '', 'Underlaget helt'],
  ['Inga rötskador', '', '', '']
];

function fixtureWorkbookBytes() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(parks), 'Lekplatsmatris');
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(elements), 'Element');
  return XLSX.write(workbook, {type: 'buffer', bookType: 'xlsx'});
}

module.exports = {fixtureWorkbookBytes};
