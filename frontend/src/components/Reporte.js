import React, { useState } from 'react';
import { Box, Button, MenuItem, Select, InputLabel, FormControl, TextField, Paper, Typography, Fade } from '@mui/material';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
import ExcelJS from 'exceljs';

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
    const snapshot = await getDocs(ventasRef);
    const ventas = snapshot.docs.map(doc => doc.data());
    const fechaBase = fecha ? new Date(fecha) : new Date();

    // mismo filtro que antes
    let filtro = () => true;
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

    // Crear workbook y hoja
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Ventas', { properties: { tabColor: { argb: 'FFB71C1C' } } });

    // Título
    const title = `REPORTE DE VENTAS - ${PERIODOS.find(p => p.value === periodo)?.label || periodo}`;
    ws.mergeCells('A1:E1');
    const titleCell = ws.getCell('A1');
    titleCell.value = title;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB71C1C' } };

    // Cabecera en fila 3 (dejamos fila 2 vacía)
    const headerRow = ws.addRow([]);
    ws.addRow([]); // row 2 blank
    const header = ['Fecha', 'Usuario', 'Total', 'Productos', 'MetodoPago'];
    const headerR = ws.addRow(header);
    headerR.eachCell(cell => {
      cell.font = { name: 'Arial', bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF37474F' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
    });

    // Datos
    ventasFiltradas.forEach(v => {
      const row = [
        new Date(v.fecha).toLocaleString(),
        v.usuario,
        Number(v.total) || 0,
        (v.productos || []).map(p => `${p.nombre} (x${p.cantidad})`).join(', '),
        v.metodoPago || ''
      ];
      const r = ws.addRow(row);
      // formato moneda en columna 3 (C)
      const totalCell = r.getCell(3);
      totalCell.numFmt = '"$"#,##0.00;[Red]\-"$"#,##0.00';
      // wrap text for productos
      r.getCell(4).alignment = { wrapText: true, vertical: 'top' };
    });

    // Fila de total ingresos
    ws.addRow([]);
    const totalIngresos = ventasFiltradas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    const totalRow = ws.addRow(['', '', totalIngresos, 'TOTAL INGRESOS', '']);
    totalRow.getCell(3).font = { bold: true };
    totalRow.getCell(3).numFmt = '"$"#,##0.00;[Red]\-"$"#,##0.00';
    totalRow.getCell(4).font = { bold: true };

    // Anchos de columnas
    ws.columns = [
      { key: 'fecha', width: 20 },
      { key: 'usuario', width: 20 },
      { key: 'total', width: 12 },
      { key: 'productos', width: 60 },
      { key: 'metodo', width: 16 },
    ];

    // Zebra rows para datos (comienza en fila 4, index 4 en Excel)
    const startDataRow = 4;
    ventasFiltradas.forEach((_, i) => {
      const rowNumber = startDataRow + i;
      if (i % 2 === 0) {
        const row = ws.getRow(rowNumber);
        row.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
        });
      }
    });

    // Ajustes finales
    ws.views = [{ state: 'frozen', ySplit: 3 }];

    // Generar archivo y forzar descarga en navegador
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_ventas_${periodo}_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setConfirmacion('Reporte de ventas descargado (con estilos)');
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

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Inventario', { properties: { tabColor: { argb: 'FF1976D2' } } });

    // Título
    ws.mergeCells('A1:F1');
    const titleCell = ws.getCell('A1');
    titleCell.value = `REPORTE DE INVENTARIO${categoria ? ' - ' + categoria : ''}`;
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1976D2' } };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };

    ws.addRow([]);
    const header = ['Nombre', 'Código', 'Stock', 'PrecioCliente', 'PrecioProveedor', 'Categoría'];
    const headerR = ws.addRow(header);
    headerR.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF455A64' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    productos.forEach((p, i) => {
      const r = ws.addRow([
        p.nombre,
        p.codigo,
        Number(p.stock) || 0,
        Number(p.precioCliente) || 0,
        Number(p.precioProveedor) || 0,
        p.categoria || ''
      ]);
      // formatear números
      r.getCell(4).numFmt = '"$"#,##0.00;[Red]\-"$"#,##0.00';
      r.getCell(5).numFmt = '"$"#,##0.00;[Red]\-"$"#,##0.00';
      r.getCell(3).numFmt = '0';
      if (i % 2 === 0) {
        r.eachCell(cell => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8F9FA' } };
        });
      }
    });

    ws.columns = [
      { key: 'nombre', width: 30 },
      { key: 'codigo', width: 16 },
      { key: 'stock', width: 8 },
      { key: 'precioCliente', width: 14 },
      { key: 'precioProveedor', width: 14 },
      { key: 'categoria', width: 16 },
    ];

    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_inventario_${categoria || 'total'}_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setConfirmacion('Reporte de inventario descargado (con estilos)');
    setTimeout(() => setConfirmacion(''), 2000);
  };

  return (
    <Fade in={true} timeout={400}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
        <Typography variant="h5" color="primary" fontWeight={700} gutterBottom>
          Reporte
        </Typography>
        <Box sx={{ maxWidth: 700, mx: 'auto', bgcolor: '#fff', color: '#b71c1c', p: { xs: 2, sm: 4 }, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', mt: 4 }}>
          <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
            Reportes
          </Typography>
          <Box sx={{ mb: 4, display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
            <FormControl fullWidth>
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
            />
          </Box>
          <Button variant="contained" color="error" fullWidth sx={{ fontWeight: 'bold', py: 1 }} onClick={handleDescargarVentas}>
            Descargar reporte de ventas
          </Button>
          <Box sx={{ mt: 4 }}>
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

