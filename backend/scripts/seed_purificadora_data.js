// Seed helper for Purificadora Firestore
// Usage:
// Set GOOGLE_APPLICATION_CREDENTIALS to service account JSON path
// Optional: set DRY_RUN=true to only print what would be created

const admin = require('firebase-admin');

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('Set GOOGLE_APPLICATION_CREDENTIALS to path of service account JSON to run seed.');
  process.exit(1);
}

const DRY_RUN = process.env.DRY_RUN === 'true' || false;

admin.initializeApp();
const db = admin.firestore();

async function collectionHasAny(col) {
  const snap = await db.collection(col).limit(1).get();
  return !snap.empty;
}

(async () => {
  console.log('Preparing seed for Purificadora...');

  const seed = {
    categorias: [
      { nombre: 'Garrafones' },
      { nombre: 'Botellas' },
      { nombre: 'Accesorios' }
    ],
    productos: [
      {
        codigo: 'G20-001',
        nombre: 'Garrafón 20L - Agua Purificada',
        precioProveedor: 30,
        precioCliente: 45,
        stockLitros: 20,
        presentacion: 'Garrafón 20L',
        ph: 7.2,
        lote: 'L-20250903',
        fechaEnvasado: new Date().toISOString(),
        categoria: 'Garrafones'
      },
      {
        codigo: 'G10-001',
        nombre: 'Garrafón 10L - Agua Purificada',
        precioProveedor: 18,
        precioCliente: 28,
        stockLitros: 10,
        presentacion: 'Garrafón 10L',
        ph: 7.2,
        lote: 'L-20250903',
        fechaEnvasado: new Date().toISOString(),
        categoria: 'Garrafones'
      },
      {
        codigo: 'B05-001',
        nombre: 'Botella 500ml - Agua Purificada',
        precioProveedor: 4,
        precioCliente: 8,
        stockLitros: 0.5,
        presentacion: 'Botella 500ml',
        ph: 7.2,
        lote: 'L-20250903',
        fechaEnvasado: new Date().toISOString(),
        categoria: 'Botellas'
      }
    ],
    caja: [
      {
        apertura: new Date().toISOString(),
        ventas: [],
        totalEfectivo: 0,
        totalTarjeta: 0,
        total: 0,
        usuario: 'admin'
      }
    ]
  };

  // Check existing
  for (const col of ['categorias', 'productos', 'caja']) {
    const exists = await collectionHasAny(col);
    if (exists) {
      console.log(`Collection '${col}' already has documents. Skipping seed for this collection.`);
    } else {
      if (DRY_RUN) {
        console.log(`DRY_RUN: Would create ${seed[col].length} documents in '${col}':`);
        console.log(JSON.stringify(seed[col], null, 2));
      } else {
        console.log(`Seeding ${seed[col].length} documents into '${col}'...`);
        for (const doc of seed[col]) {
          await db.collection(col).add(doc);
        }
        console.log(`Seeded '${col}'.`);
      }
    }
  }

  console.log('Seed complete (or dry-run).');
})();
