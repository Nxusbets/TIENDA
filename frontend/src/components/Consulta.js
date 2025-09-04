import React, { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, onSnapshot, doc, where } from 'firebase/firestore';
import { getDb } from '../firebase';
import { Table, TableHead, TableRow, TableCell, TableBody, Tabs, Tab, Button, Box, Typography, TextField, Paper, Fade } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import SearchIcon from '@mui/icons-material/Search';
import Inventory2Icon from '@mui/icons-material/Inventory2';

function Consulta({ usuario }) {
  const isAdmin = usuario === 'jericho888873@gmail.com';
  const [tab, setTab] = useState(0);
  const [ventas, setVentas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [fecha, setFecha] = useState('');
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [resultados, setResultados] = useState([]);
  const [busquedaInventario, setBusquedaInventario] = useState('');
  const [pipas, setPipas] = useState([]);
  const [litrosAlmacen, setLitrosAlmacen] = useState(0);

  useEffect(() => {
    const fetchInventario = async () => {
      const db = getDb();
      const snap = await getDocs(collection(db, 'productos'));
      setInventario(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    };
    fetchInventario();

    const handler = () => { fetchInventario(); };
    window.addEventListener('inventario:changed', handler);
    return () => window.removeEventListener('inventario:changed', handler);
  }, []);

  useEffect(() => {
    const db = getDb();
    const pipasRef = collection(db, 'pipas');
    const q = query(pipasRef, orderBy('fecha', 'desc'));

    const unsubPipas = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const unique = Array.from(new Map(list.map(p => [p.id, p])).values());
      setPipas(unique);
    }, err => {
      console.error('Error suscripción pipas:', err);
      setPipas([]);
    });

    const almacenRef = doc(db, 'almacen', 'agua');
    const unsubAlmacen = onSnapshot(almacenRef, snap => {
      const litros = snap.exists() ? Number(snap.data().litrosDisponibles || 0) : 0;
      setLitrosAlmacen(litros);
    }, err => {
      console.error('Error suscripción almacen:', err);
      setLitrosAlmacen(0);
    });

    return () => {
      unsubPipas();
      unsubAlmacen();
    };
  }, []);

  const handleBuscar = async () => {
    const db3 = getDb();
    const ventasRef = collection(db3, 'ventas');
    let q;

    if (usuarioFiltro) {
      q = query(ventasRef, where('usuario', '==', usuarioFiltro));
    } else if (fecha) {
      const fechaIni = new Date(fecha);
      const fechaFin = new Date(fecha);
      fechaFin.setHours(23,59,59,999);
      const snapshot = await getDocs(ventasRef);
      const ventas = snapshot.docs
        .map(doc => doc.data())
        .filter(v => {
          const ventaFecha = new Date(v.fecha);
          return ventaFecha >= fechaIni && ventaFecha <= fechaFin;
        });
      setResultados(ventas);
      return;
    } else {
      const snapshot = await getDocs(ventasRef);
      setResultados(snapshot.docs.map(doc => doc.data()));
      return;
    }

    const snapshot = await getDocs(q);
    setResultados(snapshot.docs.map(doc => doc.data()));
  };

  // normalizar la búsqueda (asegura que siempre sea string)
  const searchQuery = (busquedaInventario ?? '').toString().trim().toLowerCase();
  const resultadosInventario = inventario.filter(p => {
    if (!searchQuery) return true;
    const nombre = (p.nombre ?? '').toString().toLowerCase();
    const codigo = (p.codigo ?? '').toString().toLowerCase();
    const precio = (p.precioCliente ?? '').toString().toLowerCase();
    const stock = (p.stock ?? '').toString().toLowerCase();
    return (
      nombre.includes(searchQuery) ||
      codigo.includes(searchQuery) ||
      precio.includes(searchQuery) ||
      stock.includes(searchQuery)
    );
  });

  const theme = useTheme();

  return (
    <Fade in={true} timeout={400}>
      <Paper elevation={3} sx={{
        p: { xs: 2, sm: 3 },
        borderRadius: 3,
        mb: 2,
        background: theme.palette.background.paper,
        boxShadow: 3,
        transition: 'all .18s ease'
      }}>
        <Typography variant="h5" color="primary" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
          <Inventory2Icon sx={{ mr: 1, verticalAlign: 'middle' }} /> Consultas
        </Typography>

        <Box sx={{
          p: 2,
          borderRadius: 2,
          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(13,71,161,0.03)',
          mb: 2
        }}>
          <Tabs value={tab} onChange={(e, v) => setTab(v)}>
            <Tab label="Ventas" />
            <Tab label="Inventario" />
            <Tab label="Pipas" />
          </Tabs>

          {tab === 0 && (
            <Box sx={{ maxWidth: 700, mx: 'auto', bgcolor: '#fff', color: '#b71c1c', p: 4, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', mt: 4 }}>
              <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
                Consultas de ventas
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                <TextField
                  label="Usuario"
                  variant="outlined"
                  value={usuarioFiltro}
                  onChange={e => setUsuarioFiltro(e.target.value)}
                />
                <TextField
                  label="Fecha"
                  type="date"
                  variant="outlined"
                  InputLabelProps={{ shrink: true }}
                  value={fecha}
                  onChange={e => setFecha(e.target.value)}
                />
                <Button variant="contained" color="primary" sx={{ fontWeight: 'bold' }} onClick={handleBuscar}>
                  Buscar
                </Button>
              </Box>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Usuario</TableCell>
                    <TableCell>Total</TableCell>
                    <TableCell>Productos</TableCell>
                    <TableCell>Método de Pago</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resultados.map((v, i) => (
                    <TableRow key={i}>
                      <TableCell>{v.fecha}</TableCell>
                      <TableCell>{v.usuario}</TableCell>
                      <TableCell>{v.total}</TableCell>
                      <TableCell>{v.productos.map(p => p.nombre).join(', ')}</TableCell>
                      <TableCell>{v.metodoPago}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {tab === 1 && (
            <Box sx={{ mb: 3 }}>
              <TextField
                label="Buscar producto por nombre"
                variant="outlined"
                fullWidth
                sx={{ mb: 2 }}
                value={busquedaInventario}
                onChange={e => setBusquedaInventario(e.target.value)}
              />
              <Box sx={{ overflowX: 'auto' }}>
                <Table sx={{ minWidth: 600 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Stock</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {resultadosInventario.map(p => (
                      <TableRow key={p.id}>
                        <TableCell>{p.codigo}</TableCell>
                        <TableCell>{p.nombre}</TableCell>
                        <TableCell>{p.stock}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}

          {tab === 2 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ mb: 2 }}>Historial de Pipas</Typography>
              <Typography sx={{ mb: 1 }}>Litros disponibles en almacén: <strong>{litrosAlmacen} L</strong></Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Fecha</TableCell>
                      <TableCell>Proveedor</TableCell>
                      <TableCell>Litros</TableCell>
                      <TableCell>Distribución</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pipas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4}>No hay registros de pipas</TableCell>
                      </TableRow>
                    ) : pipas.map((p) => {
                      return (
                        <TableRow key={p.id}>
                          <TableCell>{p.fecha ? new Date(p.fecha).toLocaleString() : ''}</TableCell>
                          <TableCell>{p.proveedor}</TableCell>
                          <TableCell>{p.litrosTotales}</TableCell>
                          <TableCell>{(p.distribucion || []).map(d => `${d.productoNombre}: ${d.litros}L`).join(', ')}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Box>
          )}
        </Box>
      </Paper>
    </Fade>
  );
}

export default Consulta;

