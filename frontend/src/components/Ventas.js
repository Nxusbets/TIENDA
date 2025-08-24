import React, { useState } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Typography, Box, Modal } from '@mui/material';



function Ventas({ usuario }) {
  const isAdmin = usuario === 'jericho888873@gmail.com';
  const [codigo, setCodigo] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [total, setTotal] = useState(0);
  const [fechaHora, setFechaHora] = useState(new Date());
  const [confirmacion, setConfirmacion] = useState('');
  const [metodoPago, setMetodoPago] = useState('Efectivo');
  const [historial, setHistorial] = useState([]);
  const [resultadosBusqueda, setResultadosBusqueda] = useState([]);
  const [openModal, setOpenModal] = useState(false);

  React.useEffect(() => {
    const timer = setInterval(() => setFechaHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Buscar producto real por código en Firestore
  const handleScan = async () => {
    if (!codigo) return;
    const q = query(collection(db, 'productos'), where('codigo', '==', codigo));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const producto = { ...doc.data(), cantidad: 1 };
      setCarrito([...carrito, producto]);
      setTotal(total + producto.precioCliente);
    } else {
      setConfirmacion('Producto no encontrado');
      setTimeout(() => setConfirmacion(''), 2000);
    }
    setCodigo('');
  };

  // Buscar producto real por nombre en Firestore y mostrar modal
  const handleBuscar = async () => {
    if (!busqueda.trim()) return;
    const textoBusqueda = busqueda.trim().toLowerCase();
    // Obtiene todos los productos y filtra por nombre que contenga el texto de búsqueda
    const snapshot = await getDocs(collection(db, 'productos'));
    const productos = snapshot.docs.map(doc => doc.data());
    const resultados = productos.filter(p =>
      p.nombre && p.nombre.toLowerCase().includes(textoBusqueda)
    );
    if (resultados.length > 0) {
      setResultadosBusqueda(resultados);
      setOpenModal(true);
    } else {
      setConfirmacion('Producto no encontrado');
      setTimeout(() => setConfirmacion(''), 2000);
    }
    setBusqueda('');
  };

  // Seleccionar producto desde el modal
  const handleSeleccionarProducto = producto => {
    setCarrito([...carrito, { ...producto, cantidad: 1 }]);
    setTotal(total + producto.precioCliente);
    setOpenModal(false);
    setResultadosBusqueda([]);
  };

  const handleEliminar = idx => {
    const nuevoCarrito = carrito.filter((_, i) => i !== idx);
    const nuevoTotal = nuevoCarrito.reduce((acc, p) => acc + p.precioCliente * p.cantidad, 0);
    setCarrito(nuevoCarrito);
    setTotal(nuevoTotal);
  };

  const handleCancelar = () => {
    setCarrito([]);
    setTotal(0);
    setConfirmacion('Venta cancelada');
    setTimeout(() => setConfirmacion(''), 2000);
  };

  const handleVenta = async () => {
    if (!isAdmin) {
      alert('Solo el administrador puede registrar ventas.');
      return;
    }
    // Verifica si la caja está aperturada
    if (!localStorage.getItem('aperturaCajaFecha')) {
      setConfirmacion('Debes aperturar la caja antes de registrar ventas.');
      setTimeout(() => setConfirmacion(''), 2500);
      return;
    }
    // Descontar stock de cada producto vendido
    for (const producto of carrito) {
      const q = query(collection(db, 'productos'), where('codigo', '==', producto.codigo));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const prodDoc = snapshot.docs[0];
        const nuevoStock = (prodDoc.data().stock || 0) - (producto.cantidad || 1);
        await updateDoc(doc(db, 'productos', prodDoc.id), { stock: nuevoStock });
      }
    }
    await addDoc(collection(db, 'ventas'), {
      productos: carrito,
      total,
      fecha: fechaHora.toISOString(),
      usuario: usuario || 'Invitado',
      metodoPago,
    });
    setHistorial([{ fecha: fechaHora.toLocaleString(), total, usuario: usuario || 'Invitado', productos: carrito, metodoPago }, ...historial]);
    setCarrito([]);
    setTotal(0);
    setConfirmacion('Venta registrada');
    setTimeout(() => setConfirmacion(''), 2000);
  };

  // Resumen de venta
  const subtotal = carrito.reduce((acc, p) => acc + p.precioCliente * p.cantidad, 0);
  const descuento = 0; // Puedes agregar lógica de descuentos
  const totalFinal = subtotal - descuento;

  return (
    <Box sx={{
      width: '100%',
      maxWidth: 900,
      mx: 'auto',
      bgcolor: '#121212',
      p: 4,
      borderRadius: 2,
      boxShadow: '0 4px 24px rgba(0,0,0,0.18)'
    }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', color: '#fff' }}>
        Ventas
      </Typography>
      <Typography sx={{ mb: 1, color: '#fff' }}>
        Fecha y hora: {fechaHora.toLocaleString()}
      </Typography>
      <Typography sx={{ mb: 3, color: '#fff' }}>
        Atendiendo: <b>{usuario || 'Invitado'}</b>
      </Typography>
      {/* Controles de escaneo y búsqueda */}
      <Box sx={{
        display: 'flex',
        gap: 2,
        mb: 4,
        flexWrap: 'wrap',
        alignItems: 'center',
        background: 'rgba(255,255,255,0.05)',
        p: 2,
        borderRadius: 2
      }}>
        <TextField
          label="Escanear código"
          variant="filled"
          sx={{ bgcolor: 'white', borderRadius: 2, minWidth: 180 }}
          value={codigo}
          onChange={e => setCodigo(e.target.value)}
        />
        <Button variant="contained" color="error" sx={{ fontWeight: 'bold', minWidth: 120, height: 56 }} onClick={handleScan}>
          ESCANEAR
        </Button>
        <TextField
          label="Buscar producto"
          variant="filled"
          sx={{ bgcolor: 'white', borderRadius: 2, minWidth: 180 }}
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
        <Button variant="contained" color="error" sx={{ fontWeight: 'bold', minWidth: 120, height: 56 }} onClick={handleBuscar}>
          BUSCAR
        </Button>
        <TextField
          select
          label="Método de pago"
          variant="filled"
          sx={{ bgcolor: 'white', borderRadius: 2, minWidth: 140 }}
          value={metodoPago}
          onChange={e => setMetodoPago(e.target.value)}
          SelectProps={{ native: true }}
        >
          <option value="Efectivo">Efectivo</option>
          <option value="Tarjeta">Tarjeta</option>
        </TextField>
      </Box>
      {/* Tabla de productos */}
      <Box sx={{ mb: 4, background: 'rgba(255,255,255,0.04)', p: 2, borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>Código</TableCell>
              <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>Nombre</TableCell>
              <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>Precio</TableCell>
              <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>Cantidad</TableCell>
              <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>Stock</TableCell>
              <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>Eliminar</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {carrito.map((p, i) => (
              <TableRow key={i}>
                <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>{p.codigo}</TableCell>
                <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>{p.nombre}</TableCell>
                <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>{p.precioCliente}</TableCell>
                <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>{p.cantidad}</TableCell>
                <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>{p.stock}</TableCell>
                <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>
                  <Button color="error" onClick={() => handleEliminar(i)}>Eliminar</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {/* Totales y botones */}
      <Box sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 6,
        mb: 4,
        flexWrap: 'wrap'
      }}>
        <Box sx={{ minWidth: 220 }}>
          <Typography sx={{ color: 'white', mb: 1 }}>Subtotal: ${subtotal.toFixed(2)}</Typography>
          <Typography sx={{ color: 'white', mb: 1 }}>Descuento: ${descuento.toFixed(2)}</Typography>
          <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'white', mb: 1 }}>Total: ${totalFinal.toFixed(2)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isAdmin && <Button variant="contained" color="success" sx={{ fontWeight: 'bold', px: 3, py: 1 }} onClick={handleVenta}>
            REGISTRAR VENTA
          </Button>}
          <Button variant="contained" color="warning" sx={{ fontWeight: 'bold', px: 3, py: 1 }} onClick={handleCancelar}>
            CANCELAR VENTA
          </Button>
        </Box>
      </Box>
      {confirmacion && <Typography sx={{ color: 'white', fontWeight: 'bold', mb: 3 }}>{confirmacion}</Typography>}
      {/* Historial de ventas */}
      <Box sx={{
        mt: 6,
        background: 'rgba(255,255,255,0.04)',
        p: 2,
        borderRadius: 2
      }}>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: 'white' }}>
          Historial de ventas recientes
        </Typography>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>Fecha</TableCell>
              <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>Total</TableCell>
              <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>Usuario</TableCell>
              <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>Productos</TableCell>
              <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>Método de Pago</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {historial.map((v, i) => (
              <TableRow key={i}>
                <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>{v.fecha}</TableCell>
                <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>{v.total}</TableCell>
                <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>{v.usuario}</TableCell>
                <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>{v.productos.map(p => p.nombre).join(', ')}</TableCell>
                <TableCell sx={{ color: 'white', bgcolor: '#b71c1c' }}>{v.metodoPago}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Box>
      {/* Modal de resultados de búsqueda */}
      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          bgcolor: '#fff',
          color: '#b71c1c',
          p: 4,
          borderRadius: 3,
          boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
          minWidth: 350,
        }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
            Selecciona un producto
          </Typography>
          {resultadosBusqueda.length === 0 ? (
            <Typography>No se encontraron productos.</Typography>
          ) : (
            resultadosBusqueda.map((p, i) => (
              <Box key={i} sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, cursor: 'pointer', ':hover': { bgcolor: '#ffeaea' } }}
                onClick={() => handleSeleccionarProducto(p)}
              >
                <Typography><b>{p.nombre}</b> - Código: {p.codigo}</Typography>
                <Typography>Precio: ${p.precioCliente} | Stock: {p.stock} | Categoría: {p.categoria}</Typography>
              </Box>
            ))
          )}
          <Button variant="outlined" color="error" fullWidth sx={{ mt: 2 }} onClick={() => setOpenModal(false)}>
            Cancelar
          </Button>
        </Box>
      </Modal>
    </Box>
  );
}

export default Ventas;
