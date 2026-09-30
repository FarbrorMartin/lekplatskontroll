function playgroundKey(name) {
  return `lekplats:${name.trim().normalize('NFC').toLocaleLowerCase('sv-SE')}`;
}

function buildConfiguration(parks, elements) {
  function unique(values, label) {
    const normalized = values.map(value => value.trim().normalize('NFC').toLocaleLowerCase('sv-SE'));
    if (values.some(value => !value) || new Set(normalized).size !== values.length)
      throw new Error(`${label}: tomma eller dubbla namn.`);
  }
  unique(parks[0], 'Lekplatsrubriker'); unique(elements[0], 'Elementrubriker');
  if (parks[0][0] !== 'Lekplats')
    throw new Error('Den första kolumnen i Lekplatsmatris ska vara Lekplats.');
  const featureColumns = parks[0].map((name, index) => ({name, index})).filter(({index, name}) => index > 0 && !['Adress', 'Område'].includes(name));
  if (!featureColumns.length) throw new Error('Minst ett element behövs.');
  if (featureColumns.length !== elements[0].length || featureColumns.some(({name}) => !elements[0].includes(name)))
    throw new Error('Elementnamnen måste vara samma i Lekplatsmatris och Element.');
  unique(parks.slice(1).map(row => row[0]), 'Lekplatsnamn');
  function marked(value) {
    if (value === '') return false;
    if (value.toUpperCase() === 'X') return true;
    throw new Error(`Använd X eller en tom cell, inte "${value}".`);
  }
  const types = Object.create(null);
  featureColumns.forEach(({name}) => {
    const index = elements[0].indexOf(name);
    const points = elements.slice(1).map(row => row[index]).filter(Boolean);
    if (!points.length) throw new Error(`${name} saknar kontroller.`);
    unique(points, `Kontroller för ${name}`);
    types[name] = {id: name, name, icon: '📋', points,
      pointIds: points.map((_, i) => `${name}:${i + 1}`)};
  });
  const municipalParks = parks.slice(1).map(row => {
    const featureIds = featureColumns.filter(({index}) => marked(row[index])).map(({name}) => name);
    if (!featureIds.length) throw new Error(`${row[0]} saknar element.`);
    const metadata = column => parks[0].includes(column) ? row[parks[0].indexOf(column)] : '';
    return {id: playgroundKey(row[0]), name: row[0], address: metadata('Adress'), district: metadata('Område'), featureIds};
  });
  return {featureTypes: types, parks: municipalParks};
}

function readWorkbookRows(workbook, sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Fliken "${sheetName}" saknas i Excel-filen.`);
  if (!sheet['!ref']) throw new Error(`Fliken "${sheetName}" är tom.`);
  const range = XLSX.utils.decode_range(sheet['!ref']);
  if (range.e.r > 10000 || range.e.c > 250)
    throw new Error(`Fliken "${sheetName}" är för stor. Ta bort oanvända rader och kolumner.`);
  Object.entries(sheet).forEach(([address, cell]) => {
    if (address.startsWith('!')) return;
    if (cell.t === 'e') throw new Error(`${sheetName}!${address} innehåller ett Excel-fel.`);
    if (cell.f && cell.v == null)
      throw new Error(`${sheetName}!${address} saknar ett beräknat värde. Öppna och spara filen i Excel.`);
  });
  const rows = XLSX.utils.sheet_to_json(sheet, {header: 1, raw: true, defval: '', blankrows: false})
    .map(row => row.map(value => String(value ?? '').trim()))
    .filter(row => row.some(value => value !== ''));
  if (rows.length < 2) throw new Error(`Fliken "${sheetName}" behöver rubriker och minst en rad.`);
  let width = Math.max(...rows.map(row => row.length));
  while (width && rows.every(row => !row[width - 1])) width--;
  return rows.map(row => Array.from({length: width}, (_, i) => row[i] || ''));
}

function configurationFromWorkbook(workbook) {
  return buildConfiguration(readWorkbookRows(workbook, 'Lekplatsmatris'),
    readWorkbookRows(workbook, 'Element'));
}

async function loadConfiguration() {
  const response = await fetch('./data/lekplatskontroll.xlsx', {cache: 'no-cache'});
  if (!response.ok) throw new Error(`Kunde inte läsa lekplatskontroll.xlsx (${response.status}).`);
  const workbook = XLSX.read(await response.arrayBuffer(), {type: 'array'});
  const config = configurationFromWorkbook(workbook);
  FEATURE_TYPES = config.featureTypes;
  MUNICIPAL_PARKS = config.parks;
}
