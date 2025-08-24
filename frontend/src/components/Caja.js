import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button } from '@mui/material';
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
    <Box sx={{
      maxWidth: 400,
      mx: 'auto',
      bgcolor: '#fff',
      color: '#b71c1c',
      p: 4,
      borderRadius: 3,
      boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      mt: 6
    }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
        Caja - {usuario}
      </Typography>
      {!cajaAbierta ? (
        <>
          <Typography sx={{ mb: 2 }}>Ingresa el monto de apertura:</Typography>
          <TextField
            label="Monto de apertura"
            type="number"
            variant="outlined"
            fullWidth
            value={aperturaMonto}
            onChange={e => setAperturaMonto(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" color="error" fullWidth sx={{ fontWeight: 'bold', py: 1 }} onClick={handleApertura}>
            Abrir caja
          </Button>
        </>
      ) : (
        <>
          <Typography sx={{ mb: 2 }}>Ingresos obtenidos: <b>${ingresosTotales.toFixed(2)}</b></Typography>
          <TextField
            label="Monto de entrega"
            type="number"
            variant="outlined"
            fullWidth
            value={entrega}
            onChange={e => setEntrega(e.target.value)}
            sx={{ mb: 2 }}
          />
          <Button variant="contained" color="success" fullWidth sx={{ fontWeight: 'bold', py: 1 }} onClick={handleCorte}>
            Corte de caja y descargar resumen
          </Button>
        </>
      )}
      {confirmacion && <Typography sx={{ mt: 2, color: '#388e3c', textAlign: 'center', fontWeight: 'bold' }}>{confirmacion}</Typography>}
    </Box>
  );
}

export default Caja;
