import React, { useState, useRef, useEffect } from 'react';
import { getDb } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, addDoc } from 'firebase/firestore';
import {
  TextField, Button, Table, TableHead, TableRow, TableCell, TableBody,
  Typography, Box, Modal, Paper, Fade, useMediaQuery, IconButton
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SearchIcon from '@mui/icons-material/Search';
import DeleteIcon from '@mui/icons-material/Delete';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import CancelIcon from '@mui/icons-material/Cancel';
import { computeLitrosForSale, updateProductInventory } from '../services/inventory';

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
  const [productosDisponibles, setProductosDisponibles] = useState([]);
  const codigoRef = useRef(null);

  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    const timer = setInterval(() => setFechaHora(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const db = getDb();
    const colRef = collection(db, 'productos');
    const unsub = onSnapshot(colRef, snap => {
      const arr = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const unique = Array.from(new Map(arr.map(p => [p.id, p])).values());
      setProductosDisponibles(unique);
    }, err => console.error('productos snapshot error', err));
    return () => unsub();
  }, []);

  const handleScan = async () => {
    if (!codigo) return;
    const db = getDb();
    const q = query(collection(db, 'productos'), where('codigo', '==', codigo));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      const data = docSnap.data();
      let litrosPorUnidad = 0;
      if (data.cantidadLitros) litrosPorUnidad = Number(data.cantidadLitros);
      else if (data.presentacion && typeof data.presentacion === 'string') {
        const m = data.presentacion.match(/([\d.,]+)\s*(ml|l|lt|litros|garrafon)?/i);
        if (m) litrosPorUnidad = Number(m[1].replace(',', '.'));
      }
      const producto = { ...data, presentacion: data.presentacion || '', cantidad: 1, id: docSnap.id, cantidadLitros: litrosPorUnidad || 0 };
      setCarrito(prev => [...prev, producto]);
      setTotal(prev => prev + Number(producto.precioCliente || 0));
      setTimeout(() => codigoRef.current && codigoRef.current.focus(), 50);
    } else {
      setConfirmacion('Producto no encontrado');
      setTimeout(() => setConfirmacion(''), 2000);
      setTimeout(() => codigoRef.current && codigoRef.current.focus(), 50);
    }
    setCodigo('');
  };

  const handleBuscar = async () => {
    const q = (busqueda || '').toString().trim().toLowerCase();
    if (!q) {
      setResultadosBusqueda([]);
      return;
    }
    const res = productosDisponibles.filter(p => {
      const nombre = (p.nombre || '').toString().toLowerCase();
      const codigo = (p.codigo || '').toString().toLowerCase();
      return nombre.includes(q) || codigo.includes(q);
    });
    setResultadosBusqueda(res);
    setOpenModal(true);
  };

  const handleSeleccionarProducto = producto => {
    const item = { ...producto, cantidad: 1 };
    setCarrito(prev => [...prev, item]);
    setTotal(prev => prev + Number(producto.precioCliente || 0));
    setOpenModal(false);
    setResultadosBusqueda([]);
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
    if (!localStorage.getItem('aperturaCajaFecha')) {
      setConfirmacion('Debes aperturar la caja antes de registrar ventas.');
      setTimeout(() => setConfirmacion(''), 2500);
      return;
    }
    try {
      for (const producto of carrito) {
        const unidades = Number(producto.cantidad || 1);
        const { litrosPorUnidad } = computeLitrosForSale(unidades, producto.presentacion || producto.cantidadLitros || '');
        await updateProductInventory(producto.id, unidades, litrosPorUnidad);
      }
      const db = getDb();
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
      window.dispatchEvent(new CustomEvent('inventario:changed', { detail: { time: Date.now() } }));
    } catch (err) {
      console.error('Error registrando venta o actualizando inventario:', err);
      setConfirmacion('Error al registrar la venta');
      setTimeout(() => setConfirmacion(''), 2500);
    }
  };

  // Permitir editar cantidad desde la UI (tabla y vista móvil)
  const handleChangeCantidad = (idx, valor) => {
    const cant = Math.max(1, Number(valor) || 1);
    setCarrito(prev => {
      const nuevo = prev.map((p, i) => i === idx ? { ...p, cantidad: cant } : p);
      // recalcular total
      const nuevoTotal = nuevo.reduce((acc, p) => acc + (Number(p.precioCliente || 0) * (Number(p.cantidad || 1))), 0);
      setTotal(nuevoTotal);
      return nuevo;
    });
  };

  const subtotal = carrito.reduce((acc, p) => acc + (Number(p.precioCliente || 0) * (p.cantidad || 1)), 0);
  const descuento = 0;
  const totalFinal = subtotal - descuento;

  return (
    <Fade in={true} timeout={400}>
      <Paper elevation={3} sx={{
        p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 2,
        background: theme.palette.background.paper, boxShadow: 3, transition: 'all .18s ease'
      }}>
        <Typography variant="h5" color="primary" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.05rem', sm: '1.25rem', md: '1.5rem' } }}>
          Ventas
        </Typography>

        <Box sx={{
          display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center',
          p: 2, borderRadius: 2, background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(13,71,161,0.03)',
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
          <Button
            variant="contained"
            color="primary"
            startIcon={<QrCodeScannerIcon />}
            sx={{ fontWeight: 'bold', width: { xs: '100%', sm: 140 }, height: 56 }}
            onClick={handleScan}
            aria-label="escanear"
          >
            ESCANEAR
          </Button>

          <TextField
            label="Buscar producto"
            variant="filled"
            sx={{ bgcolor: 'white', borderRadius: 2, width: { xs: '100%', sm: 220, md: 260 } }}
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
          <Button
            variant="contained"
            color="primary"
            startIcon={<SearchIcon />}
            sx={{ fontWeight: 'bold', width: { xs: '100%', sm: 140 }, height: 56 }}
            onClick={handleBuscar}
            aria-label="buscar"
          >
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

        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<PointOfSaleIcon />}
            sx={{ fontWeight: 'bold', px: 3, py: 1, width: { xs: '100%', sm: 'auto' } }}
            onClick={handleVenta}
          >
            REGISTRAR VENTA
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<CancelIcon />}
            sx={{ fontWeight: 'bold', px: 3, py: 1, width: { xs: '100%', sm: 'auto' } }}
            onClick={handleCancelar}
          >
            CANCELAR VENTA
          </Button>
        </Box>

        {isTablet ? (
          <Box sx={{ display: 'grid', gap: 2 }}>
            {carrito.map((p, i) => (
              <Paper key={p.id ? `${p.id}-${i}` : i} elevation={1} sx={{ p: 1.25, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, minWidth: 0 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</Typography>
                  <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Código: {p.codigo} • Stock: {p.stock}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: { xs: 1, sm: 0 } }}>
                  <Typography sx={{ fontWeight: 700, fontSize: '1rem' }}>${Number(p.precioCliente || 0).toFixed(2)}</Typography>
                  <TextField
                    type="number"
                    size="small"
                    value={p.cantidad || 1}
                    onChange={e => handleChangeCantidad(i, e.target.value)}
                    inputProps={{ min: 1, style: { textAlign: 'center' } }}
                    sx={{ width: 88 }}
                  />
                  <Button size="small" color="primary" variant="outlined" startIcon={<DeleteIcon />} onClick={() => handleEliminar(i)}>Eliminar</Button>
                </Box>
              </Paper>
            ))}
            {carrito.length === 0 && <Typography sx={{ color: 'text.secondary' }}>No hay productos en la venta.</Typography>}
          </Box>
        ) : (
          <Box sx={{ mb: 4, p: 0, borderRadius: 2, background: 'transparent' }}>
            <Table sx={{ minWidth: 650 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>Código</TableCell>
                  <TableCell sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>Nombre</TableCell>
                  <TableCell sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>Precio</TableCell>
                  <TableCell sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>Cantidad</TableCell>
                  <TableCell sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>Stock</TableCell>
                  <TableCell sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.primary.contrastText }}>Eliminar</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {carrito.map((p, i) => (
                  <TableRow key={p.id ? `${p.id}-${i}` : i}>
                    <TableCell>{p.codigo}</TableCell>
                    <TableCell>{p.nombre}</TableCell>
                    <TableCell>${Number(p.precioCliente || 0).toFixed(2)}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={p.cantidad || 1}
                        onChange={e => handleChangeCantidad(i, e.target.value)}
                        inputProps={{ min: 1 }}
                        sx={{ width: 88 }}
                      />
                    </TableCell>
                    <TableCell>{p.stock}</TableCell>
                    <TableCell>
                      <IconButton color="primary" aria-label={`eliminar-${i}`} onClick={() => handleEliminar(i)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <Box sx={{ mt: 2, mb: 2, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, alignItems: 'center', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
          <Typography sx={{ color: theme.palette.text.primary, fontWeight: 500, fontSize: { xs: '1rem', sm: '1.1rem' }, background: '#fff', borderRadius: 1, px: 1, py: 0.5 }}>
            Subtotal: ${subtotal.toFixed(2)}
          </Typography>
          <Typography sx={{ color: theme.palette.text.primary, fontWeight: 500, fontSize: { xs: '1rem', sm: '1.1rem' }, background: '#fff', borderRadius: 1, px: 1, py: 0.5 }}>
            Descuento: ${descuento.toFixed(2)}
          </Typography>
          <Typography sx={{ color: theme.palette.text.primary, fontWeight: 'bold', fontSize: { xs: '1.4rem', md: '2rem' }, background: '#fff', borderRadius: 1, px: 1, py: 0.5 }}>
            Total: ${totalFinal.toFixed(2)}
          </Typography>
        </Box>

        {confirmacion && <Typography sx={{ color: 'green', fontWeight: 'bold', mb: 3 }}>{confirmacion}</Typography>}

        <Modal open={openModal} onClose={() => setOpenModal(false)}>
          <Box sx={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            bgcolor: '#fff', color: theme.palette.primary.main, p: 3, borderRadius: 3,
            boxShadow: '0 4px 24px rgba(0,0,0,0.18)', width: { xs: '90%', sm: 560, md: 420 },
            maxHeight: '80vh', overflowY: 'auto', transition: 'all .18s ease'
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
            <Button variant="outlined" color="primary" fullWidth sx={{ mt: 2 }} onClick={() => setOpenModal(false)}>
              Cancelar
            </Button>
          </Box>
        </Modal>

        <Box sx={{ mt: 6, background: 'rgba(255,255,255,0.04)', p: 2, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: theme.palette.primary.contrastText }}>
            Historial de ventas recientes
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ color: theme.palette.primary.contrastText, bgcolor: theme.palette.primary.main }}>Fecha</TableCell>
                <TableCell sx={{ color: theme.palette.primary.contrastText, bgcolor: theme.palette.primary.main }}>Total</TableCell>
                <TableCell sx={{ color: theme.palette.primary.contrastText, bgcolor: theme.palette.primary.main }}>Usuario</TableCell>
                <TableCell sx={{ color: theme.palette.primary.contrastText, bgcolor: theme.palette.primary.main }}>Productos</TableCell>
                <TableCell sx={{ color: theme.palette.primary.contrastText, bgcolor: theme.palette.primary.main }}>Método de Pago</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {historial.map((v, i) => (
                <TableRow key={i}>
                  <TableCell sx={{ color: theme.palette.primary.contrastText }}>{v.fecha}</TableCell>
                  <TableCell sx={{ color: theme.palette.primary.contrastText }}>${v.total}</TableCell>
                  <TableCell sx={{ color: theme.palette.primary.contrastText }}>{v.usuario}</TableCell>
                  <TableCell sx={{ color: theme.palette.primary.contrastText }}>{v.productos.map(p => p.nombre).join(', ')}</TableCell>
                  <TableCell sx={{ color: theme.palette.primary.contrastText }}>{v.metodoPago}</TableCell>
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


