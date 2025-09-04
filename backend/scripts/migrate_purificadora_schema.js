// Migration helper: map 'tienda' schema to 'purificadora' domain names
// This is a safe, dry-run script that reads collections and shows proposed changes.
// It requires Firebase Admin SDK credentials set in environment variable GOOGLE_APPLICATION_CREDENTIALS

const admin = require('firebase-admin');
const fs = require('fs');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to path of service account JSON to run migration (dry-run).');
  process.exit(1);
}

admin.initializeApp();
const db = admin.firestore();

async function listCollections() {
  const cols = await db.listCollections();
  return cols.map(c => c.id);
}

function mapCollectionName(name) {
  // simple mapping rules
  const map = {
    productos: 'productos',
    ventas: 'ventas',
    caja: 'caja',
    categorias: 'categorias'
  };
  return map[name] || name;
}

(async () => {
  console.log('Listing collections...');
  const cols = await listCollections();
  console.log('Found collections:', cols);

  const report = [];

  for (const col of cols) {
    const newName = mapCollectionName(col);
    report.push({ original: col, mappedTo: newName });

    // sample doc counts (dry-run only)
    const snapshot = await db.collection(col).limit(5).get();
    report[report.length-1].sampleDocs = snapshot.docs.map(d => ({ id: d.id, data: d.data() }));
  }

  fs.writeFileSync('migration_report.json', JSON.stringify(report, null, 2));
  console.log('Migration report written to migration_report.json');
})();
