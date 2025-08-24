// Modelos de datos para la tienda

export const productoModel = {
  codigo: '', // Código de barras
  nombre: '',
  precioProveedor: 0,
  precioCliente: 0,
  stock: 0,
};

export const ventaModel = {
  productos: [
    {
      codigo: '',
      nombre: '',
      cantidad: 0,
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
  ventas: [], // array de ventas
  total: 0,
  usuario: '',
};
