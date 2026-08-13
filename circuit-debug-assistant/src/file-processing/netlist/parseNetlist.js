// file-processing/netlist/parseNetlist.js
// Two supported EasyEDA/Protel export formats. Logic is unchanged from the
// original prototype — only moved out of global scope and split so it no
// longer also computes componentNets (that's pcb-core's job now, see
// pcb-core/model.js buildProject()).

/** Detects format and parses. Returns {components, nets} — NOT componentNets. */
export function parseNetlist(text) {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip UTF-8 BOM if present

  if (/\$PACKAGES/.test(text)) {
    return parseNetlistDollarFormat(text);
  }
  if (/PROTEL NETLIST/i.test(text) || /^\s*\[/.test(text)) {
    return parseNetlistBracketFormat(text);
  }
  // unknown header — try bracket format first since it's the real Protel 2.0
  // standard, fall back to the $ format if that yields nothing
  const bracketResult = parseNetlistBracketFormat(text);
  if (Object.keys(bracketResult.components).length === 0) {
    return parseNetlistDollarFormat(text);
  }
  return bracketResult;
}

// format A: "$PACKAGES ... $NETS ..." with "!" / ";" delimited records
export function parseNetlistDollarFormat(text) {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const merged = [];
  let buffer = '';
  for (const line of lines) {
    if (line === ',') continue;
    buffer = buffer ? buffer + ' ' + line : line;
    if (buffer.endsWith(',')) {
      buffer = buffer.replace(/,\s*$/, '').trim();
      continue;
    }
    merged.push(buffer);
    buffer = '';
  }
  if (buffer) merged.push(buffer);

  const components = {};
  const nets = {};
  let section = null;

  for (const rec of merged) {
    if (rec.startsWith('$')) {
      section = rec.replace('$', '');
      continue;
    }
    if (section === 'PACKAGES') {
      const bangParts = rec.split('!');
      if (bangParts.length < 3) continue;
      const footprint = bangParts[0].trim();
      const rest = bangParts.slice(2).join('!');
      const semiParts = rest.split(';');
      if (semiParts.length < 2) continue;
      let value = semiParts[0].trim().replace(/^'|'$/g, '');
      if (value === '{Value}') value = null;
      const refs = semiParts[1].trim().split(/\s+/).filter(Boolean);
      for (const ref of refs) {
        components[ref] = { footprint, value };
      }
    } else if (section === 'NETS') {
      const semiParts = rec.split(';');
      if (semiParts.length < 2) continue;
      const netName = semiParts[0].trim().replace(/^'|'$/g, '');
      const pins = semiParts[1].trim().split(/\s+/).filter(Boolean);
      nets[netName] = pins;
    }
  }
  return { components, nets };
}

// format B: real "PROTEL NETLIST 2.0" — "[ KEY \n VALUE \n ... ]" component
// blocks and "( netname \n REF-PIN ... )" net blocks
export function parseNetlistBracketFormat(text) {
  const components = {};
  const nets = {};

  const compBlocks = text.match(/\[[\s\S]*?\]/g) || [];
  compBlocks.forEach((block) => {
    const lines = block.split('\n').map((l) => l.trim());
    let ref = null, footprint = null, value = null, partType = null;
    for (let i = 0; i < lines.length; i++) {
      const key = lines[i];
      if (!key || key === '[' || key === ']' || key === '*') continue;
      const val = lines[i + 1] !== undefined ? lines[i + 1] : '';
      if (key === 'DESIGNATOR' && !ref) ref = val;
      else if (key === 'FOOTPRINT' && !footprint) footprint = val;
      else if (key === 'PARTTYPE' && !partType) partType = val;
      else if (key === 'Value') value = val;
      i++; // this line's value has been consumed
    }
    if (ref) {
      components[ref] = { footprint: footprint || partType || '', value: value || null };
    }
  });

  const netBlocks = text.match(/\([\s\S]*?\)/g) || [];
  netBlocks.forEach((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter((l) => l.length > 0 && l !== '(' && l !== ')');
    if (lines.length === 0) return;
    const netName = lines[0];
    const pins = [];
    for (let i = 1; i < lines.length; i++) {
      const firstToken = lines[i].split(/\s+/)[0];
      const m = firstToken.match(/^(.+)-(\d+)$/);
      if (m) pins.push(m[1] + '.' + m[2]);
    }
    nets[netName] = pins;
  });

  return { components, nets };
}
