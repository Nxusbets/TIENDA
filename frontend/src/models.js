// Modelos de datos para la purificadora

export const productoModel = {
  codigo: '', // Código de barras o SKU
  nombre: '',
  precioProveedor: 0,
  precioCliente: 0,
  stockLitros: 0,     // cantidad en litros (purificadora)
  presentacion: '',   // e.g., garrafon 20L, garrafon 10L, botella
  ph: null,           // medición opcional
  lote: '',
  fechaEnvasado: '',
};

export const ventaModel = {
  productos: [
    {
  codigo: '',
  nombre: '',
  cantidadLitros: 0,
  unidades: 0, // unidades físicas vendidas
  precioUnitario: 0,
  subtotal: 0,
    }
  ],
  total: 0,
  fecha: '',
  usuario: '',
};

export const cajaModel = {
  apertura: '', // fecha/hora
  cierre: '', // fecha/hora
  ventas: [], // array de ventas (ids)
  totalEfectivo: 0,
  totalTarjeta: 0,
  total: 0,
  usuario: '',
};

// Nuevo: modelo de Pipa (entrega grande de litros)
export const pipaModel = {
  proveedor: '',
  litrosTotales: 0,
  fecha: '',
  usuario: '',
  // distribución: [{ productoId, productoNombre, litrosAsignados }]
  distribucion: [],
  notas: ''
};
