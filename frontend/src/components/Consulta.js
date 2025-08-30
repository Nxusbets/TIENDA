import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { Table, TableHead, TableRow, TableCell, TableBody, Tabs, Tab, Button, Box, Typography, TextField, Paper, Fade } from '@mui/material';

function Consulta({ usuario }) {
  const isAdmin = usuario === 'jericho888873@gmail.com';
  const [tab, setTab] = useState(0);
  const [ventas, setVentas] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [fecha, setFecha] = useState('');
  const [usuarioFiltro, setUsuarioFiltro] = useState('');
  const [resultados, setResultados] = useState([]);
  const [busquedaInventario, setBusquedaInventario] = useState('');

  useEffect(() => {
    const fetchVentas = async () => {
      const snapshot = await getDocs(collection(db, 'ventas'));
      setVentas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    const fetchInventario = async () => {
      const snapshot = await getDocs(collection(db, 'productos'));
      setInventario(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchVentas();
    fetchInventario();
  }, []);

  const handleBuscar = async () => {
    const ventasRef = collection(db, 'ventas');
    let q;

    if (usuarioFiltro) {
      q = query(ventasRef, where('usuario', '==', usuarioFiltro));
    } else if (fecha) {
      // Filtra por fecha (solo día, no por rango)
      const fechaIni = new Date(fecha);
      const fechaFin = new Date(fecha);
      fechaFin.setHours(23,59,59,999);
      // No se pueden usar dos where con diferentes campos en Firestore, así que filtra manualmente
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
      // Sin filtros, muestra todas las ventas
      const snapshot = await getDocs(ventasRef);
      setResultados(snapshot.docs.map(doc => doc.data()));
      return;
    }

    // Si hay filtro por usuario
    const snapshot = await getDocs(q);
    setResultados(snapshot.docs.map(doc => doc.data()));
  };

  return (
    <Fade in={true} timeout={400}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
        <Typography variant="h5" color="primary" fontWeight={700} gutterBottom>
          Consulta
        </Typography>
        <Tabs value={tab} onChange={(e, v) => setTab(v)}>
          <Tab label="Ventas" />
          <Tab label="Inventario" />
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
              <Button variant="contained" color="error" sx={{ fontWeight: 'bold' }} onClick={handleBuscar}>
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
                  {inventario
                    .filter(p =>
                      !busquedaInventario.trim() ||
                      (p.nombre && p.nombre.toLowerCase().includes(busquedaInventario.trim().toLowerCase()))
                    )
                    .map(p => (
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
      </Paper>
    </Fade>
  );
}

export default Consulta;

