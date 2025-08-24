import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, MenuItem, Select, InputLabel, FormControl, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { db } from '../firebase';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';

const CATEGORIAS_DEFAULT = [
  'Hogar',
  'Limpieza',
  'Alimentos',
  'Mascotas',
  'Medicina'
];

function Inventario({ usuario }) {
  const [productos, setProductos] = useState([]);
  const [nuevo, setNuevo] = useState({ codigo: '', nombre: '', precioProveedor: '', precioCliente: '', stock: '' });
  const [categorias, setCategorias] = useState(CATEGORIAS_DEFAULT);
  const [nuevaCategoria, setNuevaCategoria] = useState('');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [categoriaConsulta, setCategoriaConsulta] = useState('');
  const [nombreConsulta, setNombreConsulta] = useState('');
  const [productosConsulta, setProductosConsulta] = useState([]);
  const isAdmin = usuario === 'jericho888873@gmail.com';

  useEffect(() => {
    const fetchProductos = async () => {
      const snapshot = await getDocs(collection(db, 'productos'));
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };
    fetchProductos();
  }, []);

  const handleChange = e => {
    setNuevo({ ...nuevo, [e.target.name]: e.target.value });
  };

  const handleAdd = async () => {
    if (!isAdmin) {
      alert('Solo el administrador puede agregar productos.');
      return;
    }
    await addDoc(collection(db, 'productos'), {
      ...nuevo,
      precioProveedor: Number(nuevo.precioProveedor),
      precioCliente: Number(nuevo.precioCliente),
      stock: Number(nuevo.stock),
    });
    setNuevo({ codigo: '', nombre: '', precioProveedor: '', precioCliente: '', stock: '' });
    // Recargar productos
    const snapshot = await getDocs(collection(db, 'productos'));
    setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleAgregarCategoria = async () => {
    if (!nuevaCategoria.trim()) return;
    if (categorias.includes(nuevaCategoria.trim())) {
      setConfirmacion('La categoría ya existe');
      setTimeout(() => setConfirmacion(''), 2000);
      return;
    }
    setCategorias([...categorias, nuevaCategoria.trim()]);
    setNuevaCategoria('');
    setConfirmacion('Categoría agregada');
    setTimeout(() => setConfirmacion(''), 2000);
    // Opcional: guarda la categoría en Firestore
    // await addDoc(collection(db, 'categorias'), { nombre: nuevaCategoria.trim() });
  };

  const handleRegistrarProducto = async () => {
    if (!nuevo.nombre || !nuevo.codigo || !nuevo.precioProveedor || !nuevo.precioCliente || !nuevo.stock || !categoriaSeleccionada) {
      setConfirmacion('Completa todos los campos');
      setTimeout(() => setConfirmacion(''), 2000);
      return;
    }
    await addDoc(collection(db, 'productos'), {
      nombre: nuevo.nombre,
      codigo: nuevo.codigo,
      precioProveedor: Number(nuevo.precioProveedor),
      precioCliente: Number(nuevo.precioCliente),
      stock: Number(nuevo.stock),
      categoria: categoriaSeleccionada
    });
    setNuevo({ codigo: '', nombre: '', precioProveedor: '', precioCliente: '', stock: '' });
    setCategoriaSeleccionada('');
    setConfirmacion('Producto registrado');
    setTimeout(() => setConfirmacion(''), 2000);
  };

  const handleConsultarPorCategoria = async () => {
    if (!categoriaConsulta) return;
    const q = query(collection(db, 'productos'), where('categoria', '==', categoriaConsulta));
    const snapshot = await getDocs(q);
    setProductosConsulta(snapshot.docs.map(doc => doc.data()));
  };

  const handleBuscarPorNombre = async () => {
    if (!nombreConsulta) return;
    const q = query(collection(db, 'productos'), where('nombre', '==', nombreConsulta));
    const snapshot = await getDocs(q);
    setProductosConsulta(snapshot.docs.map(doc => doc.data()));
  };

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', bgcolor: '#fff', color: '#b71c1c', p: 4, borderRadius: 3, boxShadow: '0 4px 24px rgba(0,0,0,0.10)', mt: 4 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 'bold', textAlign: 'center' }}>
        Inventario
      </Typography>
      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="categoria-label">Categoría</InputLabel>
        <Select
          labelId="categoria-label"
          value={categoriaSeleccionada}
          label="Categoría"
          onChange={e => setCategoriaSeleccionada(e.target.value)}
        >
          {categorias.map(cat => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </Select>
      </FormControl>
      {isAdmin && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            label="Nueva categoría"
            variant="outlined"
            value={nuevaCategoria}
            onChange={e => setNuevaCategoria(e.target.value)}
            sx={{ flex: 1 }}
          />
          <Button variant="contained" color="primary" onClick={handleAgregarCategoria}>
            Agregar
          </Button>
        </Box>
      )}
      <TextField
        label="Nombre del producto"
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
        value={nuevo.nombre}
        onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })}
      />
      <TextField
        label="Código"
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
        value={nuevo.codigo}
        onChange={e => setNuevo({ ...nuevo, codigo: e.target.value })}
      />
      <TextField
        label="Precio proveedor"
        type="number"
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
        value={nuevo.precioProveedor}
        onChange={e => setNuevo({ ...nuevo, precioProveedor: e.target.value })}
      />
      <TextField
        label="Precio cliente"
        type="number"
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
        value={nuevo.precioCliente}
        onChange={e => setNuevo({ ...nuevo, precioCliente: e.target.value })}
      />
      <TextField
        label="Stock"
        type="number"
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
        value={nuevo.stock}
        onChange={e => setNuevo({ ...nuevo, stock: e.target.value })}
      />
      <Button variant="contained" color="error" fullWidth sx={{ fontWeight: 'bold', py: 1, mt: 2 }} onClick={handleRegistrarProducto}>
        Registrar producto
      </Button>
      {confirmacion && <Typography sx={{ mt: 2, color: '#388e3c', textAlign: 'center', fontWeight: 'bold' }}>{confirmacion}</Typography>}

      <FormControl fullWidth sx={{ mb: 2 }}>
        <InputLabel id="categoria-consulta-label">Consultar por categoría</InputLabel>
        <Select
          labelId="categoria-consulta-label"
          value={categoriaConsulta}
          label="Consultar por categoría"
          onChange={e => setCategoriaConsulta(e.target.value)}
        >
          {categorias.map(cat => (
            <MenuItem key={cat} value={cat}>{cat}</MenuItem>
          ))}
        </Select>
      </FormControl>
      <Button variant="outlined" color="primary" fullWidth sx={{ mb: 2 }} onClick={handleConsultarPorCategoria}>
        Consultar productos por categoría
      </Button>
      <TextField
        label="Buscar producto por nombre"
        variant="outlined"
        fullWidth
        sx={{ mb: 2 }}
        value={nombreConsulta}
        onChange={e => setNombreConsulta(e.target.value)}
      />
      <Button variant="outlined" color="primary" fullWidth sx={{ mb: 2 }} onClick={handleBuscarPorNombre}>
        Buscar producto por nombre
      </Button>
      {productosConsulta.length > 0 && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
            Resultados de consulta:
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Precio</TableCell>
                <TableCell>Categoría</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {productosConsulta.map((p, i) => (
                <TableRow key={i}>
                  <TableCell>{p.codigo}</TableCell>
                  <TableCell>{p.nombre}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell>${p.precioCliente}</TableCell>
                  <TableCell>{p.categoria}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

export default Inventario;
