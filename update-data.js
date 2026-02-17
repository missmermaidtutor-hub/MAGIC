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

  console.log('\nDone! JSON files updated.');
}

run();
