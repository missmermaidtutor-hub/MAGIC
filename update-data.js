/**
 * update-data.js
 *
 * Reads Magic_Database.xlsx and generates JSON data files for the app.
 * Run this whenever you update the Excel file:
 *   node update-data.js
 *
 * Tabs read:
 *   - "Quotes"           → quotes.json          [{quote, author}]
 *   - "Prompt"            → prompts.json         ["string", ...]
 *   - "Ranking Criteria"  → ranking-criteria.json ["string", ...]
 */

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_FILE = path.join(__dirname, 'Magic_Database.xlsx');

function run() {
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error('Error: Magic_Database.xlsx not found in project root.');
    process.exit(1);
  }

  const wb = XLSX.readFile(EXCEL_FILE);

  // --- Quotes ---
  if (wb.SheetNames.includes('Quotes')) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Quotes']);
    const quotes = rows
      .filter(r => r.Quote)
      .map(r => ({ quote: String(r.Quote).trim(), author: r.Author ? String(r.Author).trim() : 'Unknown' }));

    fs.writeFileSync(
      path.join(__dirname, 'quotes.json'),
      JSON.stringify(quotes, null, 2)
    );
    console.log(`quotes.json — ${quotes.length} quotes written`);
  } else {
    console.warn('Warning: "Quotes" sheet not found in Excel file');
  }

  // --- Prompts ---
  if (wb.SheetNames.includes('Prompt')) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Prompt']);
    const prompts = rows
      .filter(r => r.Prompt)
      .map(r => String(r.Prompt).trim());

    fs.writeFileSync(
      path.join(__dirname, 'prompts.json'),
      JSON.stringify(prompts, null, 2)
    );
    console.log(`prompts.json — ${prompts.length} prompts written`);
  } else {
    console.warn('Warning: "Prompt" sheet not found in Excel file');
  }

  // --- Ranking Criteria ---
  if (wb.SheetNames.includes('Ranking Criteria')) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['Ranking Criteria'], { header: 1 });
    // Skip header row, take first column
    const criteria = rows
      .slice(1)
      .filter(r => r[0])
      .map(r => String(r[0]).trim());

    fs.writeFileSync(
      path.join(__dirname, 'ranking-criteria.json'),
      JSON.stringify(criteria, null, 2)
    );
    console.log(`ranking-criteria.json — ${criteria.length} criteria written`);
  } else {
    console.warn('Warning: "Ranking Criteria" sheet not found in Excel file');
  }

  // --- About You / Mediums ---
  if (wb.SheetNames.includes('About You')) {
    const rows = XLSX.utils.sheet_to_json(wb.Sheets['About You'], { header: 1 });
    const mediums = {};

    rows.slice(1).forEach(r => {
      if (!r[0] || !r[1]) return;

      // Normalize category
      let category = String(r[0]).trim();
      if (category.toLowerCase() === '3-d') category = '3-D';
      if (category.startsWith('Musical')) category = 'Musical';

      // Process medium name
      let text = String(r[1]).trim();
      // Strip bullet point
      text = text.replace(/^•\s*/, '');
      // Fix CamelCase ONLY for known art type prefixes (not TaiChi, WordArt)
      const artPrefixes = ['Sketch', 'Sketching', 'Model', 'Models', 'Textile', 'Weaving'];
      for (const prefix of artPrefixes) {
        const re = new RegExp('^(' + prefix + ')([A-Z])');
        text = text.replace(re, '$1: $2');
      }
      // Fix colon without space: "Painting:Acrylic" → "Painting: Acrylic"
      text = text.replace(/:(?!\s)/g, ': ');
      // Normalize multiple spaces
      text = text.replace(/\s+/g, ' ');

      // Split on ": " and remove description segments
      const segments = text.split(': ');
      const cleaned = [];
      for (const seg of segments) {
        const trimmed = seg.trim();
        if (!trimmed) continue;
        // Skip if it looks like a description sentence (gerund + 3+ words)
        if (/^[A-Z][a-z]+ing[\s,]/.test(trimmed) && trimmed.split(/\s+/).length >= 3) continue;
        if (/^[A-Z][a-z]+(e|te|t|d)\s+(a|an|the|of|with|from|into|using|on|in)\s/i.test(trimmed)) continue;
        if (/objects or scenes/i.test(trimmed)) continue;
        // Strip inline description (e.g. "Oil Producing luminous...")
        const inlineMatch = trimmed.match(/^(.+?)\s+[A-Z][a-z]+(?:ing|e|te)\s/);
        if (inlineMatch) {
          cleaned.push(inlineMatch[1].trim());
        } else {
          cleaned.push(trimmed);
        }
      }

      let medium = cleaned.join(': ').replace(/:\s*$/, '').trim();
      // Fix "WordArt" splitting: rejoin "Word: Art" → "WordArt"
      medium = medium.replace(/^Word: Art/, 'WordArt');
      // Capitalize first letter of medium
      if (medium.length > 0) {
        medium = medium.charAt(0).toUpperCase() + medium.slice(1);
      }
      if (!medium) return;

      if (!mediums[category]) mediums[category] = [];
      if (!mediums[category].includes(medium)) {
        mediums[category].push(medium);
      }
    });

    // Order categories and sort mediums within each
    const ordered = {};
    ['2-D', '3-D', 'Computer', 'Musical', 'Physical'].forEach(cat => {
      if (mediums[cat]) ordered[cat] = mediums[cat].sort();
    });

    fs.writeFileSync(
      path.join(__dirname, 'mediums.json'),
      JSON.stringify(ordered, null, 2)
    );
    const totalMediums = Object.values(ordered).reduce((s, a) => s + a.length, 0);
    console.log(`mediums.json — ${Object.keys(ordered).length} categories, ${totalMediums} mediums written`);
  } else {
    console.warn('Warning: "About You" sheet not found in Excel file');
  }

  console.log('\nDone! JSON files updated.');
}

run();
