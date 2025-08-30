import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, Typography, Box, Modal, Paper, Fade, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';



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
  const codigoRef = useRef(null);

  // new: theme + media query for responsiveness
  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('md')); // true for md and below

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
      const docSnap = snapshot.docs[0];
      const producto = { ...docSnap.data(), cantidad: 1, id: docSnap.id };
      setCarrito(prev => [...prev, producto]);
      setTotal(prev => prev + Number(producto.precioCliente || 0));
      // mantener foco para siguiente escaneo
      setTimeout(() => codigoRef.current && codigoRef.current.focus(), 50);
    } else {
      setConfirmacion('Producto no encontrado');
      setTimeout(() => setConfirmacion(''), 2000);
      setTimeout(() => codigoRef.current && codigoRef.current.focus(), 50);
    }
    setCodigo('');
  };

  // Buscar producto real por nombre en Firestore y mostrar modal
  const handleBuscar = async () => {
    if (!busqueda.trim()) return;
    const textoBusqueda = busqueda.trim().toLowerCase();
    // Obtiene todos los productos y filtra por nombre que contenga el texto de búsqueda
    const snapshot = await getDocs(collection(db, 'productos'));
    const productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
    setCarrito(prev => [...prev, { ...producto, cantidad: 1 }]);
    setTotal(prev => prev + Number(producto.precioCliente || 0));
    setOpenModal(false);
    setResultadosBusqueda([]);
    // re-enfocar input de escaneo
    setTimeout(() => codigoRef.current && codigoRef.current.focus(), 50);
  };

  const handleEliminar = idx => {
    const nuevoCarrito = carrito.filter((_, i) => i !== idx);
    const nuevoTotal = nuevoCarrito.reduce((acc, p) => acc + (Number(p.precioCliente || 0) * (p.cantidad || 1)), 0);
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
    // registra venta en Firestore
    await addDoc(collection(db, 'ventas'), {
      productos: carrito,
      total,
      fecha: fechaHora.toISOString(),
      usuario: usuario || 'Invitado',
      metodoPago,
    });
    setHistorial(prev => [{ fecha: fechaHora.toLocaleString(), total, usuario: usuario || 'Invitado', productos: carrito, metodoPago }, ...prev]);
    setCarrito([]);
    setTotal(0);
    setConfirmacion('Venta registrada');
    setTimeout(() => setConfirmacion(''), 2000);
  };

  // Resumen de venta
  const subtotal = carrito.reduce((acc, p) => acc + (Number(p.precioCliente || 0) * (p.cantidad || 1)), 0);
  const descuento = 0; // Puedes agregar lógica de descuentos
  const totalFinal = subtotal - descuento;

  return (
    <Fade in={true} timeout={400}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 2, background: '#fff' }}>
        <Typography variant="h5" color="primary" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.05rem', sm: '1.25rem', md: '1.5rem' } }}>
          Ventas
        </Typography>

        {/* Controles de escaneo y búsqueda (responsive) */}
        <Box sx={{
          display: 'flex',
          gap: 2,
          mb: 3,
          flexWrap: 'wrap',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.05)',
          p: 2,
          borderRadius: 2,
          flexDirection: { xs: 'column', sm: 'row' }
        }}>
          <TextField
            label="Escanear código"
            variant="filled"
            sx={{ bgcolor: 'white', borderRadius: 2, width: { xs: '100%', sm: 220, md: 260 } }}
            value={codigo}
            onChange={e => setCodigo(e.target.value)}
            inputRef={codigoRef}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleScan(); } }}
            inputProps={{ inputMode: 'numeric', autoComplete: 'off' }}
          />
          <Button variant="contained" color="error" sx={{ fontWeight: 'bold', width: { xs: '100%', sm: 140 }, height: 56 }} onClick={handleScan}>
            ESCANEAR
          </Button>

          <TextField
            label="Buscar producto"
            variant="filled"
            sx={{ bgcolor: 'white', borderRadius: 2, width: { xs: '100%', sm: 220, md: 260 } }}
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <Button variant="contained" color="error" sx={{ fontWeight: 'bold', width: { xs: '100%', sm: 140 }, height: 56 }} onClick={handleBuscar}>
            BUSCAR
          </Button>

          <TextField
            select
            label="Método de pago"
            variant="filled"
            sx={{ bgcolor: 'white', borderRadius: 2, width: { xs: '100%', sm: 160 } }}
            value={metodoPago}
            onChange={e => setMetodoPago(e.target.value)}
            SelectProps={{ native: true }}
          >
            <option value="Efectivo">Efectivo</option>
            <option value="Tarjeta">Tarjeta</option>
          </TextField>
        </Box>

        {/* Botones arriba de la tabla */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button variant="contained" color="success" sx={{ fontWeight: 'bold', px: 3, py: 1, width: { xs: '100%', sm: 'auto' } }} onClick={handleVenta}>
            REGISTRAR VENTA
          </Button>
          <Button variant="contained" color="warning" sx={{ fontWeight: 'bold', px: 3, py: 1, width: { xs: '100%', sm: 'auto' } }} onClick={handleCancelar}>
            CANCELAR VENTA
          </Button>
        </Box>

        {/* Responsive product list: table on desktop, stacked cards on tablets */}
        {isTablet ? (
          // Tablet / small screens: render compact cards to avoid horizontal scroll
          <Box sx={{ display: 'grid', gap: 2 }}>
            {carrito.map((p, i) => (
              <Paper key={p.id || i} elevation={1} sx={{ p: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</Typography>
                  <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Código: {p.codigo} • Stock: {p.stock}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: { xs: 1, sm: 0 } }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>${Number(p.precioCliente || 0).toFixed(2)}</Typography>
                  <Typography sx={{ fontSize: '0.95rem' }}>x{p.cantidad}</Typography>
                  <Button size="small" color="error" variant="outlined" onClick={() => handleEliminar(i)}>Eliminar</Button>
                </Box>
              </Paper>
            ))}
            {carrito.length === 0 && <Typography sx={{ color: 'text.secondary' }}>No hay productos en la venta.</Typography>}
          </Box>
        ) : (
          // Desktop: keep table
          <Box sx={{ mb: 4, p: 0, borderRadius: 2, background: 'rgba(255,255,255,0.0)' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#000' }}>Código</TableCell>
                  <TableCell sx={{ color: '#000' }}>Nombre</TableCell>
                  <TableCell sx={{ color: '#000' }}>Precio</TableCell>
                  <TableCell sx={{ color: '#000' }}>Cantidad</TableCell>
                  <TableCell sx={{ color: '#000' }}>Stock</TableCell>
                  <TableCell sx={{ color: '#000' }}>Eliminar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {carrito.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell sx={{ color: '#000' }}>{p.codigo}</TableCell>
                    <TableCell sx={{ color: '#000' }}>{p.nombre}</TableCell>
                    <TableCell sx={{ color: '#000' }}>{p.precioCliente}</TableCell>
                    <TableCell sx={{ color: '#000' }}>{p.cantidad}</TableCell>
                    <TableCell sx={{ color: '#000' }}>{p.stock}</TableCell>
                    <TableCell sx={{ color: '#000' }}>
                      <Button color="error" onClick={() => handleEliminar(i)}>Eliminar</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        {/* Totales: center on mobile/tablet, right on desktop */}
        <Box sx={{ mt: 2, mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
          <Typography sx={{ color: '#212121', fontWeight: 500, fontSize: { xs: '1rem', sm: '1.1rem' }, background: '#fff', borderRadius: 1, px: 1, py: 0.5 }}>
            Subtotal: ${subtotal.toFixed(2)}
          </Typography>
          <Typography sx={{ color: '#212121', fontWeight: 500, fontSize: { xs: '1rem', sm: '1.1rem' }, background: '#fff', borderRadius: 1, px: 1, py: 0.5 }}>
            Descuento: ${descuento.toFixed(2)}
          </Typography>
          <Typography sx={{ color: '#212121', fontWeight: 'bold', fontSize: { xs: '1.4rem', md: '2rem' }, background: '#fff', borderRadius: 1, px: 1, py: 0.5 }}>
            Total: ${totalFinal.toFixed(2)}
          </Typography>
        </Box>

        {confirmacion && <Typography sx={{ color: 'green', fontWeight: 'bold', mb: 3 }}>{confirmacion}</Typography>}

        {/* Historial and modal: reduce modal minWidth on tablet to avoid overflow */}
        <Modal open={openModal} onClose={() => setOpenModal(false)}>
          <Box sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            bgcolor: '#fff',
            color: '#b71c1c',
            p: 3,
            borderRadius: 3,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
            width: { xs: '90%', sm: 560, md: 420 },
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
              Selecciona un producto
            </Typography>
            {resultadosBusqueda.length === 0 ? (
              <Typography>No se encontraron productos.</Typography>
            ) : (
              resultadosBusqueda.map((p, i) => (
                <Box key={p.id || i} sx={{ mb: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2, cursor: 'pointer', ':hover': { bgcolor: '#ffeaea' } }} onClick={() => handleSeleccionarProducto(p)}>
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
      </Paper>
    </Fade>
  );
}

export default Ventas;


