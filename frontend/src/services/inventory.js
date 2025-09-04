import { getDb } from '../firebase';
import { doc, runTransaction } from 'firebase/firestore';

const GARAFON_LITROS = 20;

export function parseLitrosFromPresentacion(presentacion) {
  if (presentacion == null) return NaN;
  if (typeof presentacion === 'number') return Number(presentacion);
  const txt = String(presentacion).trim().toLowerCase();
  const m = txt.match(/([\d.,]+)\s*(ml|millilitros|l|lt|litro|litros|garrafon|garrafones)?/i);
  if (!m) return NaN;
  const rawNum = m[1].replace(/\./g, '').replace(',', '.');
  const num = parseFloat(rawNum);
  if (Number.isNaN(num)) return NaN;
  const unit = (m[2] || '').toLowerCase();
  if (unit.includes('ml') || unit.includes('millilitro')) return num / 1000;
  if (unit.includes('garrafon')) return num * GARAFON_LITROS;
  if (unit.includes('l') || unit.includes('lt') || unit.includes('litro')) return num;
  if (num >= 1000) return num / 1000;
  return num;
}

export function computeLitrosForSale(unidades, presentacion) {
  const litrosPorUnidad = parseLitrosFromPresentacion(presentacion);
  const litrosTotales = Number.isFinite(litrosPorUnidad) ? unidades * litrosPorUnidad : 0;
  return { litrosPorUnidad, litrosTotales };
}

// Añade litros de pipa al almacen central (doc: almacen/agua)
export async function addPipaLitros(litrosToAdd) {
  const db = getDb();
  const almacenRef = doc(db, 'almacen', 'agua'); // colección 'almacen' doc 'agua'
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(almacenRef);
    const current = snap.exists() ? Number(snap.data().litrosDisponibles || 0) : 0;
    const nuevo = current + Number(litrosToAdd || 0);
    tx.set(almacenRef, { litrosDisponibles: nuevo }, { merge: true });
    return { litrosDisponibles: nuevo };
  });
}

// Actualiza producto y resta litros del almacen en una sola transacción
export async function updateProductInventory(productId, unidadesVendidas, litrosPorUnidad) {
  const db = getDb();
  const productRef = doc(db, 'productos', productId);
  const almacenRef = doc(db, 'almacen', 'agua');

  return runTransaction(db, async (tx) => {
    // --- READS (hacer todas las lecturas primero) ---
    const [pSnap, aSnap] = await Promise.all([tx.get(productRef), tx.get(almacenRef)]);
    if (!pSnap.exists()) throw new Error('Producto no encontrado');
    const pData = pSnap.data() || {};
    const currentStock = Number(pData.stock) || 0;
    const currentStockLitrosProd = Number(pData.stockLitros);
    const currentAlmacen = aSnap.exists() ? Number(aSnap.data().litrosDisponibles || 0) : 0;

    const ventaUnidades = Number(unidadesVendidas) || 0;
    const litrosARestar = Number.isFinite(Number(litrosPorUnidad)) ? ventaUnidades * Number(litrosPorUnidad) : 0;

    // calcular nuevos valores
    const newStock = Math.max(0, currentStock - ventaUnidades);
    let newStockLitrosProd = Number.isFinite(currentStockLitrosProd) ? Math.max(0, currentStockLitrosProd - litrosARestar) : undefined;
    const nuevoAlmacen = Math.max(0, currentAlmacen - litrosARestar);

    const updateProducto = { stock: newStock };
    if (newStockLitrosProd !== undefined) updateProducto.stockLitros = newStockLitrosProd;

    // --- WRITES (después de todas las lecturas) ---
    tx.update(productRef, updateProducto);
    tx.set(almacenRef, { litrosDisponibles: nuevoAlmacen }, { merge: true });

    return { producto: updateProducto, almacen: { litrosDisponibles: nuevoAlmacen } };
  });
}