import React, { useState } from 'react';
import { Box, Button, MenuItem, Select, InputLabel, FormControl, TextField, Paper, Typography, Fade } from '@mui/material';
import * as XLSX from 'xlsx';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

const PERIODOS = [
  { label: 'Día', value: 'dia' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mes', value: 'mes' },
  { label: 'Año', value: 'año' }
];

function Reporte() {
  const [periodo, setPeriodo] = useState('dia');
  const [fecha, setFecha] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categorias, setCategorias] = useState(['Hogar', 'Limpieza', 'Alimentos', 'Mascotas', 'Medicina']);
  const [confirmacion, setConfirmacion] = useState('');

  // Reporte de ventas
  const handleDescargarVentas = async () => {
    const ventasRef = collection(db, 'ventas');
    let ventas = [];
    const snapshot = await getDocs(ventasRef);
    ventas = snapshot.docs.map(doc => doc.data());

    let filtro = () => true;
    const fechaBase = fecha ? new Date(fecha) : new Date();

    if (periodo === 'dia') {
      filtro = v => {
        const f = new Date(v.fecha);
        return f.toDateString() === fechaBase.toDateString();
      };
    } else if (periodo === 'semana') {
      const start = new Date(fechaBase);
      start.setDate(start.getDate() - start.getDay());
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      filtro = v => {
        const f = new Date(v.fecha);
        return f >= start && f <= end;
      };
    } else if (periodo === 'mes') {
      filtro = v => {
        const f = new Date(v.fecha);
        return f.getMonth() === fechaBase.getMonth() && f.getFullYear() === fechaBase.getFullYear();
      };
    } else if (periodo === 'año') {
      filtro = v => {
        const f = new Date(v.fecha);
        return f.getFullYear() === fechaBase.getFullYear();
      };
    }

    const ventasFiltradas = ventas.filter(filtro);
    const data = ventasFiltradas.map(v => ({
      Fecha: v.fecha,
      Usuario: v.usuario,
      Total: v.total,
      Productos: v.productos.map(p => `${p.nombre} (x${p.cantidad})`).join(', '),
      MetodoPago: v.metodoPago
    }));

    // Calcular total de ingresos
    const totalIngresos = ventasFiltradas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);

    // Agregar fila de total de ingresos al final
    if (data.length > 0) {
      data.push({
        Fecha: '',
        Usuario: '',
        Total: '',
        Productos: '',
        MetodoPago: '',
      });
    }
    data.push({
      Fecha: '',
      Usuario: '',
      Total: `TOTAL INGRESOS: $${totalIngresos.toFixed(2)}`,
      Productos: '',
      MetodoPago: ''
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
    XLSX.writeFile(wb, `reporte_ventas_${periodo}_${Date.now()}.xlsx`);
    setConfirmacion('Reporte de ventas descargado');
    setTimeout(() => setConfirmacion(''), 2000);
  };

  // Reporte de inventario
  const handleDescargarInventario = async () => {
    const productosRef = collection(db, 'productos');
    let productos = [];
    if (categoria) {
      const q = query(productosRef, where('categoria', '==', categoria));
      const snapshot = await getDocs(q);
      productos = snapshot.docs.map(doc => doc.data());
    } else {
      const snapshot = await getDocs(productosRef);
      productos = snapshot.docs.map(doc => doc.data());
    }
    const data = productos.map(p => ({
      Nombre: p.nombre,
      Código: p.codigo,
      Stock: p.stock,
      PrecioCliente: p.precioCliente,
      PrecioProveedor: p.precioProveedor,
      Categoría: p.categoria
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
    XLSX.writeFile(wb, `reporte_inventario_${categoria || 'total'}_${Date.now()}.xlsx`);
    setConfirmacion('Reporte de inventario descargado');
    setTimeout(() => setConfirmacion(''), 2000);
  };

  return (
    <Fade in={true} timeout={400}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
        <Typography variant="h5" color="primary" fontWeight={700} gutterBottom>
          Reporte
        </Typography>
        <Box sx={{ maxWidth: 600, mx: 'auto', bgcolor: '#fff', color: '#b71c1c', p: 4, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
            Reportes
          </Typography>
          <Box sx={{ mb: 4 }}>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>Reporte de ventas</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="periodo-label">Periodo</InputLabel>
              <Select
                labelId="periodo-label"
                value={periodo}
                label="Periodo"
                onChange={e => setPeriodo(e.target.value)}
              >
                {PERIODOS.map(p => (
                  <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Fecha base"
              type="date"
              variant="outlined"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              sx={{ mb: 2 }}
            />
            <Button variant="contained" color="error" fullWidth sx={{ fontWeight: 'bold', py: 1 }} onClick={handleDescargarVentas}>
              Descargar reporte de ventas
            </Button>
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>Reporte de inventario</Typography>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel id="categoria-label">Categoría</InputLabel>
              <Select
                labelId="categoria-label"
                value={categoria}
                label="Categoría"
                onChange={e => setCategoria(e.target.value)}
              >
                <MenuItem value="">Todas</MenuItem>
                {categorias.map(cat => (
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button variant="contained" color="primary" fullWidth sx={{ fontWeight: 'bold', py: 1 }} onClick={handleDescargarInventario}>
              Descargar reporte de inventario
            </Button>
          </Box>
          {confirmacion && <Typography sx={{ mt: 3, color: '#388e3c', textAlign: 'center', fontWeight: 'bold' }}>{confirmacion}</Typography>}
        </Box>
      </Paper>
    </Fade>
  );
}

export default Reporte;
