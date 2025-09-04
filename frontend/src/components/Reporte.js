import React, { useState, useEffect } from 'react';
import { Box, Button, MenuItem, Select, InputLabel, FormControl, TextField, Paper, Typography, Fade, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { getDb } from '../firebase';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import ExcelJS from 'exceljs';
import { useTheme } from '@mui/material/styles';
import AssessmentIcon from '@mui/icons-material/Assessment';
import DownloadIcon from '@mui/icons-material/Download';

const PERIODOS = [
  { label: 'Día', value: 'dia' },
  { label: 'Semana', value: 'semana' },
  { label: 'Mes', value: 'mes' },
  { label: 'Año', value: 'año' }
];

function Reporte({ usuario }) {
  const isAdmin = usuario === 'jericho888873@gmail.com';
  const [periodo, setPeriodo] = useState('dia');
  const [fecha, setFecha] = useState('');
  const [categoria, setCategoria] = useState('');
  const [categorias, setCategorias] = useState(['Hogar', 'Limpieza', 'Alimentos', 'Mascotas', 'Medicina']);
  const [confirmacion, setConfirmacion] = useState('');
  const [consumoResultados, setConsumoResultados] = useState([]);
  const [gastoCategorias, setGastoCategorias] = useState([]);
  const [gastoCategoriaFilter, setGastoCategoriaFilter] = useState(''); // filtro para reporte financiero

  const theme = useTheme();

  useEffect(() => {
    // cargar categorías de gastos para el filtro
    (async () => {
      try {
        const db = getDb();
        const snap = await getDocs(collection(db, 'gastoCategorias'));
        setGastoCategorias(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Error cargando categorias de gasto', err);
      }
    })();
  }, []);

  // Reporte de ventas
  const handleDescargarVentas = async () => {
  const db = getDb();
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
    const ws = wb.addWorksheet('Ventas', { properties: { tabColor: { argb: 'FF0D47A1' } } });

    // Título
    const title = `REPORTE DE VENTAS - ${PERIODOS.find(p => p.value === periodo)?.label || periodo}`;
    ws.mergeCells('A1:E1');
    const titleCell = ws.getCell('A1');
    titleCell.value = title;
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    titleCell.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0D47A1' } };

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
  const db2 = getDb();
  const productosRef = collection(db2, 'productos');
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

  // Calcular consumo de litros por producto dentro del periodo seleccionado
  const handleCalcularConsumo = async () => {
    const db = getDb();
    const ventasRef = collection(db, 'ventas');
    const snap = await getDocs(ventasRef);
    const ventas = snap.docs.map(d => d.data());
    const fechaBase = fecha ? new Date(fecha) : new Date();
    let filtro = () => true;
    if (periodo === 'dia') {
      filtro = v => { const f = new Date(v.fecha); return f.toDateString() === fechaBase.toDateString(); };
    } else if (periodo === 'semana') {
      const start = new Date(fechaBase); start.setDate(start.getDate() - start.getDay());
      const end = new Date(start); end.setDate(end.getDate() + 6);
      filtro = v => { const f = new Date(v.fecha); return f >= start && f <= end; };
    } else if (periodo === 'mes') {
      filtro = v => { const f = new Date(v.fecha); return f.getMonth() === fechaBase.getMonth() && f.getFullYear() === fechaBase.getFullYear(); };
    } else if (periodo === 'año') {
      filtro = v => { const f = new Date(v.fecha); return f.getFullYear() === fechaBase.getFullYear(); };
    }
    const ventasFiltradas = ventas.filter(filtro);
    // Agregar por producto
    const map = {};
    ventasFiltradas.forEach(v => {
      (v.productos || []).forEach(p => {
        const key = p.nombre || p.codigo || 'Sin nombre';
        const litros = (Number(p.cantidadLitros || 0) * (Number(p.cantidad || p.unidades || 1)));
        map[key] = (map[key] || 0) + litros;
      });
    });
    const resultados = Object.keys(map).map(k => ({ producto: k, litros: map[k] }));
    setConsumoResultados(resultados);
  };

  const handleExportConsumo = async () => {
    if (!consumoResultados.length) return;
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Consumo', { properties: { tabColor: { argb: 'FF0D47A1' } } });
    ws.addRow(['Producto', 'Litros consumidos']);
    consumoResultados.forEach(r => {
      ws.addRow([r.producto, r.litros]);
    });
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `consumo_litros_${periodo}_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setConfirmacion('Reporte de consumo descargado');
    setTimeout(() => setConfirmacion(''), 2000);
  };

  // Reporte financiero
  const handleDescargarFinanciero = async () => {
    const db = getDb();
    const ventasSnap = await getDocs(collection(db, 'ventas'));
    const pipasSnap = await getDocs(collection(db, 'pipas'));
    // si hay filtro por categoría, consultar solo esos gastos
    let gastosSnap;
    if (gastoCategoriaFilter) {
      const q = query(collection(db, 'gastos'), where('categoria', '==', gastoCategoriaFilter));
      gastosSnap = await getDocs(q);
    } else {
      gastosSnap = await getDocs(collection(db, 'gastos'));
    }

    const ventas = ventasSnap.docs.map(d => d.data());
    const pipas = pipasSnap.docs.map(d => d.data());
    const gastos = gastosSnap.docs.map(d => d.data());

    const totalVentas = ventas.reduce((acc, v) => acc + (Number(v.total) || 0), 0);
    const totalPipas = pipas.reduce((acc, p) => acc + (Number(p.precioTotal) || 0), 0);
    const totalGastos = gastos.reduce((acc, g) => acc + (Number(g.monto) || 0), 0);
    const egresos = totalPipas + totalGastos;
    const neto = totalVentas - egresos;

    // crear workbook (resumen, ventas detalle, pipas, gastos)
    const wb = new ExcelJS.Workbook();
    const resumen = wb.addWorksheet('Resumen financiero');
    resumen.columns = [
      { header: 'Concepto', key: 'concepto', width: 30 },
      { header: 'Valor', key: 'valor', width: 20 }
    ];
    resumen.addRow({ concepto: 'Total Ventas (ingresos)', valor: totalVentas });
    resumen.addRow({ concepto: 'Total Pipas / Compras (egresos)', valor: totalPipas });
    resumen.addRow({ concepto: 'Total Gastos (egresos)', valor: totalGastos });
    resumen.addRow([]);
    resumen.addRow({ concepto: 'Egresos (pipas + gastos)', valor: egresos });
    const netRow = resumen.addRow({ concepto: 'NETO (Ingresos - Egresos)', valor: neto });
    netRow.getCell('valor').font = { bold: true };

    // pestaña Ventas (detalle)
    const wsVentas = wb.addWorksheet('Ventas detalle');
    wsVentas.columns = [
      { header: 'Fecha', key: 'fecha', width: 22 },
      { header: 'Total', key: 'total', width: 12 },
      { header: 'Usuario', key: 'usuario', width: 18 },
      { header: 'Productos (resumen)', key: 'productos', width: 50 }
    ];
    ventas.forEach(v => {
      wsVentas.addRow({
        fecha: v.fecha || '',
        total: Number(v.total) || 0,
        usuario: v.usuario || '',
        productos: (v.productos || []).map(p => `${p.nombre} (x${p.cantidad || p.unidades || 1})`).join(', ')
      });
    });

    // pestaña Pipas/Compras
    const wsPipas = wb.addWorksheet('Pipas_Compras');
    wsPipas.columns = [
      { header: 'Fecha', key: 'fecha', width: 22 },
      { header: 'Proveedor', key: 'proveedor', width: 20 },
      { header: 'Litros', key: 'litros', width: 12 },
      { header: 'Precio total', key: 'precioTotal', width: 14 },
      { header: 'Usuario', key: 'usuario', width: 18 }
    ];
    pipas.forEach(p => wsPipas.addRow({
      fecha: p.fecha || '',
      proveedor: p.proveedor || '',
      litros: Number(p.litrosTotales) || 0,
      precioTotal: Number(p.precioTotal) || 0,
      usuario: p.usuario || ''
    }));

    // pestaña Gastos (añadir columna categoría)
    const wsGastos = wb.addWorksheet('Gastos');
    wsGastos.columns = [
      { header: 'Fecha', key: 'fecha', width: 22 },
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Descripción', key: 'descripcion', width: 40 },
      { header: 'Monto', key: 'monto', width: 12 },
      { header: 'Usuario', key: 'usuario', width: 18 }
    ];
    gastos.forEach(g => wsGastos.addRow({
      fecha: g.fecha || '',
      categoria: g.categoria || 'General',
      descripcion: g.descripcion || g.notas || '',
      monto: Number(g.monto) || 0,
      usuario: g.usuario || ''
    }));

    // descargar
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `resumen_financiero_${Date.now()}.xlsx`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setConfirmacion('Resumen financiero descargado.');
    setTimeout(() => setConfirmacion(''), 2000);
  };

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
          <AssessmentIcon sx={{ mr: 1, verticalAlign: 'middle' }} /> Reportes
        </Typography>

        <Box sx={{
          p: 2,
          borderRadius: 2,
          background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(13,71,161,0.03)',
          mb: 2
        }}>
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
            <Button variant="contained" color="primary" fullWidth sx={{ fontWeight: 'bold', py: 1 }} onClick={handleDescargarVentas}>
              <DownloadIcon sx={{ mr: 1 }} /> Descargar reporte de ventas
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
                <DownloadIcon sx={{ mr: 1 }} /> Descargar reporte de inventario
              </Button>
            </Box>
            {/* Consumo de litros */}
            <Box sx={{ mt: 4, p: 2, borderRadius: 2, background: '#fafafa' }}>
              <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>Consumo de litros por periodo</Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Button variant="contained" color="primary" onClick={handleCalcularConsumo}>Calcular consumo</Button>
                <Button variant="outlined" color="primary" onClick={handleExportConsumo} disabled={!consumoResultados.length}>Exportar consumo (Excel)</Button>
              </Box>
              {consumoResultados.length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Producto</TableCell>
                      <TableCell>Litros consumidos</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {consumoResultados.map((r,i) => (
                      <TableRow key={i}>
                        <TableCell>{r.producto}</TableCell>
                        <TableCell>{r.litros}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography sx={{ mt: 1 }}>No hay datos calculados. Presiona "Calcular consumo".</Typography>
              )}
            </Box>
            <Box sx={{ mb: 2 }}>
              <Button variant="contained" color="primary" sx={{ mr: 1 }} onClick={handleDescargarFinanciero}>
                <DownloadIcon sx={{ mr: 1 }} /> Descargar resumen financiero
              </Button>
            </Box>
            {confirmacion && <Typography sx={{ mt: 3, color: '#388e3c', textAlign: 'center', fontWeight: 'bold' }}>{confirmacion}</Typography>}
          </Box>
        </Box>

        {/* vista de tablas / export buttons */}
        <Box sx={{ p: 2, borderRadius: 2, background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : 'rgba(13,71,161,0.03)' }}>
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>Tablas de datos</Typography>
          {/* Aquí se pueden agregar tablas para mostrar los datos en pantalla */}
        </Box>
        <Box sx={{ mt: 2, mb: 2 }}>
      <FormControl sx={{ minWidth: 220, mb: 2 }}>
        {/* filtro de categoría */}
      </FormControl>

      <Box>
        {isAdmin ? (
          <Button variant="contained" color="primary" sx={{ mr: 1 }} onClick={handleDescargarFinanciero}>
            <DownloadIcon sx={{ mr: 1 }} /> Descargar resumen financiero
          </Button>
        ) : (
          <Button variant="contained" color="primary" sx={{ mr: 1 }} disabled>
            <DownloadIcon sx={{ mr: 1 }} /> Descargar (sólo admin)
          </Button>
        )}

        {/* ejemplo: proteger otras descargas */}
        {isAdmin ? (
          <Button variant="outlined" onClick={handleDescargarVentas} sx={{ mr: 1 }}>
            Descargar ventas
          </Button>
        ) : (
          <Button variant="outlined" disabled sx={{ mr: 1 }}>Descargar ventas (sólo admin)</Button>
        )}
      </Box>

      {!isAdmin && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No tiene permisos para descargar reportes. Contacte al administrador.
        </Typography>
      )}
    </Box>
      </Paper>
    </Fade>
  );
}

export default Reporte;

