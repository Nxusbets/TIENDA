import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, Fade } from '@mui/material';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';

function Caja({ usuario }) {
  // Separar monto y fecha de apertura
  const [aperturaMonto, setAperturaMonto] = useState(localStorage.getItem('aperturaCajaMonto') || '');
  const [aperturaFecha, setAperturaFecha] = useState(localStorage.getItem('aperturaCajaFecha') || '');
  const [cierre, setCierre] = useState('');
  const [total, setTotal] = useState(0);
  const [cajaAbierta, setCajaAbierta] = useState(!!localStorage.getItem('aperturaCajaFecha'));
  const [ingresos, setIngresos] = useState([]);
  const [entrega, setEntrega] = useState('');
  const [confirmacion, setConfirmacion] = useState('');

  // Calcula ingresos totales de ventas registradas por el usuario en el turno
  const ingresosTotales = ingresos.reduce((acc, v) => acc + v.total, 0);

  useEffect(() => {
    // Si hay apertura guardada, mantener caja abierta
    if (localStorage.getItem('aperturaCajaFecha')) {
      setCajaAbierta(true);
      setAperturaFecha(localStorage.getItem('aperturaCajaFecha'));
      setAperturaMonto(localStorage.getItem('aperturaCajaMonto') || '');
    }
  }, []);

  useEffect(() => {
    // Consulta ventas del usuario desde la fecha de apertura
    const fetchVentas = async () => {
      if (cajaAbierta && aperturaFecha && usuario) {
        const aperturaDate = new Date(aperturaFecha);
        const ventasRef = collection(db, 'ventas');
        const q = query(
          ventasRef,
          where('usuario', '==', usuario)
        );
        const snapshot = await getDocs(q);
        // Filtra ventas por fecha posterior a la apertura
        const ventas = snapshot.docs
          .map(doc => doc.data())
          .filter(v => new Date(v.fecha) >= aperturaDate);
        setIngresos(ventas);
        setTotal(ventas.reduce((acc, v) => acc + v.total, 0));
      }
    };
    fetchVentas();
  }, [cajaAbierta, aperturaFecha, usuario]);

  const handleApertura = async () => {
    if (!aperturaMonto || isNaN(aperturaMonto)) {
      setConfirmacion('Ingresa un monto válido');
      return;
    }
    await addDoc(collection(db, 'caja'), {
      apertura: new Date().toISOString(),
      monto: Number(aperturaMonto),
      total: 0,
    });
    const aperturaStr = new Date().toISOString();
    setAperturaFecha(aperturaStr);
    setCajaAbierta(true);
    localStorage.setItem('aperturaCajaFecha', aperturaStr);
    localStorage.setItem('aperturaCajaMonto', aperturaMonto);
    setConfirmacion('Caja abierta correctamente');
    setTimeout(() => setConfirmacion(''), 2000);
  };

  const handleCorte = async () => {
    if (!entrega || isNaN(entrega)) {
      setConfirmacion('Ingresa el monto de entrega');
      return;
    }
    await addDoc(collection(db, 'caja'), {
      cierre: new Date().toISOString(),
      total,
    });
    // Genera resumen para Excel
    const productosVendidos = ingresos.map(v => v.productos).flat();
    const productosResumen = productosVendidos.map(p =>
      `${p.nombre} (x${p.cantidad})`
    ).join(', ');
    const resumen = [
      ['Usuario', usuario],
      ['Ventas (ingresos)', ingresosTotales],
      ['Productos vendidos', productosResumen],
      ['Apertura', aperturaMonto],
      ['Entrega', entrega],
      ['Fecha', new Date().toLocaleString()],
    ];
    const ws = XLSX.utils.aoa_to_sheet(resumen);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'ResumenCaja');
    XLSX.writeFile(wb, `corte_caja_${usuario}_${Date.now()}.xlsx`);
    setCierre(new Date().toLocaleString());
    setEntrega('');
    setTotal(0);
    setConfirmacion('Corte de caja realizado y archivo descargado');
    setCajaAbierta(false);
    setAperturaFecha('');
    setAperturaMonto('');
    localStorage.removeItem('aperturaCajaFecha');
    localStorage.removeItem('aperturaCajaMonto');
    setTimeout(() => setConfirmacion(''), 2000);
  };

  return (
    <Fade in={true} timeout={400}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 2, background: '#fff' }}>
        <Typography variant="h5" color="primary" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}>
          Caja - {usuario}
        </Typography>
        {!cajaAbierta ? (
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Monto de apertura" type="number" variant="outlined" fullWidth value={aperturaMonto} onChange={e => setAperturaMonto(e.target.value)} />
            <Button variant="contained" color="error" sx={{ minWidth: { xs: '100%', sm: 160 } }} onClick={handleApertura}>Abrir caja</Button>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center' }}>
            <Typography sx={{ color: 'primary.main' }}>Ingresos obtenidos: <b>${ingresosTotales.toFixed(2)}</b></Typography>
            <TextField label="Monto de entrega" type="number" variant="outlined" value={entrega} onChange={e => setEntrega(e.target.value)} sx={{ minWidth: { xs: '100%', sm: 200 } }} />
            <Button variant="contained" color="success" sx={{ minWidth: { xs: '100%', sm: 200 } }} onClick={handleCorte}>Corte de caja y descargar resumen</Button>
          </Box>
        )}
        {confirmacion && (
          <Typography sx={{ mt: 2, color: 'primary.main', textAlign: 'center', fontWeight: 'bold' }}>
            {confirmacion}
          </Typography>
        )}
      </Paper>
    </Fade>
  );
}

export default Caja;
     



