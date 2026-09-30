/* Excel exports: UTF-8, comma or semicolon separated, including quoted cells. */
function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/)[0];
  let quoted = false, commas = 0, semicolons = 0;
  for (let i = 0; i < firstLine.length; i++) {
    if (firstLine[i] === '"') {
      if (quoted && firstLine[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (!quoted) {
      if (firstLine[i] === ',') commas++;
      if (firstLine[i] === ';') semicolons++;
    }
  }
  const separator = semicolons > commas ? ';' : ',';
  const rows = []; let row = [], cell = '', inQuotes = false, closed = false;
  function endCell() { row.push(cell.trim()); cell = ''; closed = false; }
  function endRow() { endCell(); if (row.some(value => value !== '')) rows.push(row); row = []; }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') { inQuotes = false; closed = true; }
      else cell += ch;
    } else if (ch === '"') {
      if (cell || closed) throw new Error('Felaktiga citattecken i CSV-filen.');
      inQuotes = true;
    } else if (ch === separator) endCell();
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      endRow();
    } else {
      if (closed && ch.trim()) throw new Error('Text efter avslutat citattecken.');
      if (!closed) cell += ch;
    }
  }
  if (inQuotes) throw new Error('Ett citattecken saknar avslutning i CSV-filen.');
  endRow();
  if (rows.length < 2) throw new Error('CSV-filen måste innehålla rubriker och minst en rad.');
  const width = rows[0].length;
  rows.forEach((r, i) => { if (r.length !== width) throw new Error(`Rad ${i + 1} har fel antal kolumner.`); });
  return rows;
}

function buildConfiguration(playgroundCsv, checkCsv) {
  const parks = parseCsv(playgroundCsv), checks = parseCsv(checkCsv);
  function unique(values, label) {
    const normalized = values.map(value => value.toLocaleLowerCase('sv-SE'));
    if (values.some(value => !value) || new Set(normalized).size !== values.length)
      throw new Error(`${label}: tomma eller dubbla namn/ID.`);
  }
  unique(parks[0], 'Lekplatsrubriker'); unique(checks[0], 'Kontrollpunktsrubriker');
  if (parks[0][0] !== 'Id' || parks[0][1] !== 'Lekplats' || checks[0][0] !== 'Id' || checks[0][1] !== 'Kontrollpunkt')
    throw new Error('De första kolumnerna ska vara Id;Lekplats respektive Id;Kontrollpunkt.');
  const featureColumns = parks[0].map((name, index) => ({name, index})).filter(({index, name}) => index > 1 && !['Adress', 'Område'].includes(name));
  if (!featureColumns.length) throw new Error('Minst en funktionstyp behövs.');
  const checkNames = checks[0].slice(2);
  if (featureColumns.length !== checkNames.length || featureColumns.some(({name}) => !checkNames.includes(name)))
    throw new Error('Funktionstyperna måste ha samma namn i båda matriserna.');
  unique(parks.slice(1).map(row => row[0]), 'Lekplats-ID');
  parks.slice(1).forEach(row => {
    if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(row[0]) || ['constructor', 'prototype', '__proto__'].includes(row[0]))
      throw new Error('Lekplats-ID ska bestå av bokstäver a–z, siffror, bindestreck eller understreck.');
  });
  unique(parks.slice(1).map(row => row[1]), 'Lekplatsnamn');
  unique(checks.slice(1).map(row => row[0]), 'Kontrollpunkts-ID');
  unique(checks.slice(1).map(row => row[1]), 'Kontrollpunkter');
  function marked(value) {
    if (value === '') return false;
    if (value.toUpperCase() === 'X') return true;
    throw new Error(`Använd X eller en tom cell, inte "${value}".`);
  }
  checks.slice(1).forEach(row => row.slice(2).forEach(marked));
  const types = Object.create(null);
  featureColumns.forEach(({name}) => {
    const index = checks[0].indexOf(name);
    const selected = checks.slice(1).filter(row => marked(row[index]));
    if (!selected.length) throw new Error(`${name} saknar kontrollpunkter.`);
    // The feature name is its stable identity; IDs keep question edits/reordering safe.
    types[name] = {id: name, name, icon: '📋', description: `Checklista för ${name.toLocaleLowerCase('sv-SE')}.`,
      points: selected.map(row => row[1]), pointIds: selected.map(row => row[0])};
  });
  const municipalParks = parks.slice(1).map(row => {
    const featureIds = featureColumns.filter(({index}) => marked(row[index])).map(({name}) => name);
    if (!featureIds.length) throw new Error(`${row[1]} saknar funktionstyper.`);
    if (!row[1]) throw new Error('Lekplatsnamn saknas.');
    const metadata = column => parks[0].includes(column) ? row[parks[0].indexOf(column)] : '';
    return {id: row[0], name: row[1], address: metadata('Adress'), district: metadata('Område'), featureIds};
  });
  return {featureTypes: types, parks: municipalParks};
}

async function loadConfiguration() {
  const responses = await Promise.all(['lekplatser.csv', 'kontrollpunkter.csv'].map(async file => {
    const response = await fetch(`./data/${file}`, {cache: 'no-cache'});
    if (!response.ok) throw new Error(`Kunde inte läsa ${file} (${response.status}).`);
    return response.text();
  }));
  const config = buildConfiguration(...responses);
  FEATURE_TYPES = config.featureTypes;
  MUNICIPAL_PARKS = config.parks;
}
