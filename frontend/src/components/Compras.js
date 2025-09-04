import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Button, Dialog, DialogTitle, DialogContent, DialogActions, Table, TableHead, TableRow, TableCell, TableBody, FormControl, InputLabel, Select, MenuItem, TextField, IconButton } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { getDb } from '../firebase';
import { collection, getDocs, addDoc, query, orderBy, onSnapshot } from 'firebase/firestore';
import { addPipaLitros } from '../services/inventory';
import { useTheme } from '@mui/material/styles';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';

function Compras({ usuario }) {
  const isAdmin = usuario === 'jericho888873@gmail.com';
  const [proveedor, setProveedor] = useState('');
  const [litros, setLitros] = useState('');
  const [precioTotal, setPrecioTotal] = useState('');
  const [numeroFactura, setNumeroFactura] = useState('');
  const [referencia, setReferencia] = useState('');
  const [notas, setNotas] = useState('');
  const [historial, setHistorial] = useState([]);
  const [openHistorial, setOpenHistorial] = useState(false);
  const [confirmacion, setConfirmacion] = useState('');
  const [tipoRegistro, setTipoRegistro] = useState('pipa'); // 'pipa' | 'gasto'
  const [descripcionGasto, setDescripcionGasto] = useState('');
  const [montoGasto, setMontoGasto] = useState('');
  const [gastoCategoria, setGastoCategoria] = useState('');
  const [gastoCategorias, setGastoCategorias] = useState([]);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const theme = useTheme();

  useEffect(() => {
    // suscripción en tiempo real al historial de pipas
    const db = getDb();
    const pipasRef = collection(db, 'pipas');
    const q = query(pipasRef, orderBy('fecha', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setHistorial(list);
    }, err => {
      console.error('Error suscripción pipas:', err);
      setHistorial([]);
    });
    return () => unsub();
  }, []);

  // opción para cargar historial una sola vez (no necesaria si usamos onSnapshot)
  const fetchHistorial = async () => {
    try {
      const db = getDb();
      const q = query(collection(db, 'pipas'), orderBy('fecha', 'desc'));
      const snap = await getDocs(q);
      setHistorial(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    // cargar categorías de gastos desde Firestore
    let mounted = true;
    (async () => {
      try {
        const db = getDb();
        const snap = await getDocs(collection(db, 'gastoCategorias'));
        if (!mounted) return;
        setGastoCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error cargando categorias de gasto', err);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleCrearCategoria = async () => {
    const name = (nuevaCategoria || '').toString().trim();
    if (!name) return;
    try {
      const db = getDb();
      const docRef = await addDoc(collection(db, 'gastoCategorias'), { name });
      setGastoCategorias(prev => [...prev, { id: docRef.id, name }]);
      setGastoCategoria(name);
      setNuevaCategoria('');
    } catch (err) {
      console.error('Error creando categoria', err);
    }
  };

  const handleRegistrarCompra = async () => {
    if (!isAdmin && tipoRegistro === 'pipa') {
      setConfirmacion('Acceso denegado. Solo administrador puede registrar pipas.');
      setTimeout(() => setConfirmacion(''), 2500);
      return;
    }

    try {
      const db = getDb();
      const fechaISO = new Date().toISOString();

      if (tipoRegistro === 'gasto') {
        // Validación básica
        const monto = Number(montoGasto);
        if (!Number.isFinite(monto) || monto <= 0 || !descripcionGasto) {
          setConfirmacion('Ingresa descripción y monto válidos para el gasto.');
          setTimeout(() => setConfirmacion(''), 2500);
          return;
        }
        // Guardar gasto en colección 'gastos'
        await addDoc(collection(db, 'gastos'), {
          descripcion: descripcionGasto,
          monto: monto,
          fecha: fechaISO,
          usuario: usuario || 'Admin',
          categoria: gastoCategoria || 'General',
          notas: '' // opcional
        });
        setDescripcionGasto('');
        setMontoGasto('');
        setGastoCategoria('');
        setConfirmacion('Gasto registrado.');
        setTimeout(() => setConfirmacion(''), 2500);
        // emitir evento para actualizar vistas
        window.dispatchEvent(new CustomEvent('gastos:changed', { detail: { time: Date.now() } }));
        return;
      }

      // Si es 'pipa' se mantiene el flujo de compra/pipa existente
      const totalLitros = Number(litros);
      const totalPrecio = Number(precioTotal);
      if (!Number.isFinite(totalLitros) || totalLitros <= 0) {
        setConfirmacion('Ingresa litros válidos (> 0).');
        setTimeout(() => setConfirmacion(''), 2500);
        return;
      }
      if (!Number.isFinite(totalPrecio) || totalPrecio < 0) {
        setConfirmacion('Ingresa un precio total válido.');
        setTimeout(() => setConfirmacion(''), 2500);
        return;
      }
      const precioPorLitro = totalLitros > 0 ? +(totalPrecio / totalLitros).toFixed(4) : 0;

      // documento de compra (gasto o registro contable)
      await addDoc(collection(db, 'compras'), {
        proveedor,
        litrosTotales: totalLitros,
        precioTotal: totalPrecio,
        precioPorLitro,
        numeroFactura: numeroFactura || null,
        referencia: referencia || null,
        notas: notas || null,
        fecha: fechaISO,
        usuario: usuario || 'Admin'
      });

      // documento de pipa (entrada)
      await addDoc(collection(db, 'pipas'), {
        proveedor,
        litrosTotales: totalLitros,
        precioTotal: totalPrecio,
        precioPorLitro,
        numeroFactura: numeroFactura || null,
        referencia: referencia || null,
        notas: notas || null,
        fecha: fechaISO,
        usuario: usuario || 'Admin'
      });

      // sumar litros al almacen central (transacción en servicio)
      await addPipaLitros(totalLitros);

      // limpiar campos y notificar
      setProveedor('');
      setLitros('');
      setPrecioTotal('');
      setNumeroFactura('');
      setReferencia('');
      setNotas('');
      setConfirmacion('Compra/pipa registrada y litros agregados al almacén.');
      setTimeout(() => setConfirmacion(''), 3000);

      window.dispatchEvent(new CustomEvent('almacen:changed', { detail: { time: Date.now() } }));
      window.dispatchEvent(new CustomEvent('pipa:registrada', { detail: { time: Date.now() } }));
    } catch (err) {
      console.error('Error registrar pipa/gasto:', err);
      setConfirmacion('Error al registrar compra/pipa/gasto.');
      setTimeout(() => setConfirmacion(''), 3000);
    }
  };

  if (!isAdmin) {
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6">Compras</Typography>
        <Typography sx={{ mt: 2 }}>Acceso restringido. Solo administradores pueden registrar compras de pipa.</Typography>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{
      p: { xs: 2, sm: 3 },
      borderRadius: 3,
      mb: 2,
      background: theme.palette.background.paper,
      boxShadow: 3,
      transition: 'all .18s ease'
    }}>
      <Typography variant="h5" color="primary" fontWeight={700} gutterBottom sx={{ mb: 2 }}>
        <LocalShippingIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Compras
      </Typography>

      <Box sx={{
        p: 2,
        borderRadius: 2,
        background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(13,71,161,0.03)',
        mb: 2
      }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
          <FormControl sx={{ minWidth: 160 }}>
            <InputLabel id="tipo-registro-label">Tipo</InputLabel>
            <Select
              labelId="tipo-registro-label"
              value={tipoRegistro}
              label="Tipo"
              onChange={e => setTipoRegistro(e.target.value)}
            >
              <MenuItem value="pipa">Pipa / Compra</MenuItem>
              <MenuItem value="gasto">Gasto</MenuItem>
            </Select>
          </FormControl>

          {tipoRegistro === 'gasto' ? (
            <>
              <TextField label="Descripción" value={descripcionGasto} onChange={e => setDescripcionGasto(e.target.value)} sx={{ minWidth: 220 }} />
              <TextField label="Monto" type="number" value={montoGasto} onChange={e => setMontoGasto(e.target.value)} sx={{ width: 140 }} />
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel id="gasto-categoria-label">Categoría</InputLabel>
                <Select
                  labelId="gasto-categoria-label"
                  value={gastoCategoria}
                  label="Categoría"
                  onChange={e => setGastoCategoria(e.target.value)}
                >
                  <MenuItem value="">General</MenuItem>
                  {gastoCategorias.map(c => (<MenuItem key={c.id} value={c.name}>{c.name}</MenuItem>))}
                </Select>
              </FormControl>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TextField placeholder="Nueva categoría" value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)} size="small" />
                <IconButton color="primary" onClick={handleCrearCategoria} aria-label="crear-categoria"><AddIcon /></IconButton>
              </Box>
            </>
          ) : (
            <>
              <TextField label="Proveedor" value={proveedor} onChange={e => setProveedor(e.target.value)} />
              <TextField label="Litros totales" type="number" value={litros} onChange={e => setLitros(e.target.value)} />
              <TextField label="Precio total (MXN)" type="number" value={precioTotal} onChange={e => setPrecioTotal(e.target.value)} />
              <TextField label="Número de factura" value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)} />
              <TextField label="Referencia" value={referencia} onChange={e => setReferencia(e.target.value)} />
              <TextField label="Notas (opcional)" value={notas} onChange={e => setNotas(e.target.value)} />
            </>
          )}
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="contained" color="primary" onClick={handleRegistrarCompra}>
            {tipoRegistro === 'gasto' ? 'Registrar gasto' : 'Registrar compra/pipa'}
          </Button>
          <Button variant="outlined" onClick={() => {
            setProveedor(''); setLitros(''); setPrecioTotal(''); setNumeroFactura(''); setReferencia(''); setNotas('');
            setDescripcionGasto(''); setMontoGasto(''); setGastoCategoria('');
          }}>
            Limpiar
          </Button>
        </Box>

        {confirmacion && <Typography sx={{ color: '#388e3c', fontWeight: 'bold' }}>{confirmacion}</Typography>}

        <Dialog open={openHistorial} onClose={() => setOpenHistorial(false)} fullWidth maxWidth="lg">
          <DialogTitle>Historial de compras / pipas</DialogTitle>
          <DialogContent>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Proveedor</TableCell>
                  <TableCell>Factura / Ref</TableCell>
                  <TableCell>Litros</TableCell>
                  <TableCell>Precio total</TableCell>
                  <TableCell>Precio/L</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Notas</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historial.map((h) => (
                  <TableRow key={h.id}>
                    <TableCell>{h.fecha ? new Date(h.fecha).toLocaleString() : ''}</TableCell>
                    <TableCell>{h.proveedor}</TableCell>
                    <TableCell>{h.numeroFactura || h.referencia || ''}</TableCell>
                    <TableCell>{h.litrosTotales}</TableCell>
                    <TableCell>{h.precioTotal ? Number(h.precioTotal).toFixed(2) : ''}</TableCell>
                    <TableCell>{h.precioPorLitro ? Number(h.precioPorLitro).toFixed(4) : ''}</TableCell>
                    <TableCell>{h.usuario}</TableCell>
                    <TableCell>{h.notas || ''}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenHistorial(false)}>Cerrar</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Paper>
  );
}

export default Compras;
