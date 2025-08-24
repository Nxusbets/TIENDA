import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, MenuItem, Select, InputLabel, FormControl, Table, TableHead, TableRow, TableCell, TableBody, Paper, Fade, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';

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
  const [editOpen, setEditOpen] = useState(false);
  const [editProducto, setEditProducto] = useState(null);
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

  const handleEditar = producto => {
    setEditProducto({ ...producto });
    setEditOpen(true);
  };

  const handleEditChange = e => {
    setEditProducto({ ...editProducto, [e.target.name]: e.target.value });
  };

  const handleGuardarEdicion = async () => {
    if (!editProducto) return;
    await updateDoc(doc(db, 'productos', editProducto.id), {
      nombre: editProducto.nombre,
      codigo: editProducto.codigo,
      precioProveedor: Number(editProducto.precioProveedor),
      precioCliente: Number(editProducto.precioCliente),
      stock: Number(editProducto.stock),
      categoria: editProducto.categoria
    });
    setEditOpen(false);
    setEditProducto(null);
    // Recargar productos
    const snapshot = await getDocs(collection(db, 'productos'));
    setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    setConfirmacion('Producto editado');
    setTimeout(() => setConfirmacion(''), 2000);
  };

  const handleEliminarProducto = async id => {
    await deleteDoc(doc(db, 'productos', id));
    setProductos(productos.filter(p => p.id !== id));
    setConfirmacion('Producto eliminado');
    setTimeout(() => setConfirmacion(''), 2000);
  };

  return (
    <Fade in={true} timeout={400}>
      <Paper elevation={3} sx={{ p: 3, borderRadius: 3, mb: 2 }}>
        <Typography variant="h5" color="primary" fontWeight={700} gutterBottom>
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
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
            Productos registrados:
          </Typography>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Código</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Stock</TableCell>
                <TableCell>Precio Proveedor</TableCell>
                <TableCell>Precio Cliente</TableCell>
                <TableCell>Categoría</TableCell>
                {isAdmin && <TableCell sx={{ fontWeight: 'bold', color: '#b71c1c' }}>Acciones</TableCell>}
              </TableRow>
            </TableHead>
            <TableBody>
              {productos.map((p, i) => (
                <TableRow key={p.id || i}>
                  <TableCell>{p.codigo}</TableCell>
                  <TableCell>{p.nombre}</TableCell>
                  <TableCell>{p.stock}</TableCell>
                  <TableCell>${p.precioProveedor}</TableCell>
                  <TableCell>${p.precioCliente}</TableCell>
                  <TableCell>{p.categoria}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="contained"
                        color="primary"
                        size="small"
                        sx={{ mr: 1, minWidth: 80 }}
                        onClick={() => handleEditar(p)}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="contained"
                        color="error"
                        size="small"
                        sx={{ minWidth: 80 }}
                        onClick={() => handleEliminarProducto(p.id)}
                      >
                        Eliminar
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
        {/* Modal de edición */}
        <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
          <DialogTitle>Editar producto</DialogTitle>
          <DialogContent>
            {editProducto && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                <TextField
                  label="Nombre"
                  name="nombre"
                  value={editProducto.nombre}
                  onChange={handleEditChange}
                  fullWidth
                />
                <TextField
                  label="Código"
                  name="codigo"
                  value={editProducto.codigo}
                  onChange={handleEditChange}
                  fullWidth
                />
                <TextField
                  label="Precio proveedor"
                  name="precioProveedor"
                  type="number"
                  value={editProducto.precioProveedor}
                  onChange={handleEditChange}
                  fullWidth
                />
                <TextField
                  label="Precio cliente"
                  name="precioCliente"
                  type="number"
                  value={editProducto.precioCliente}
                  onChange={handleEditChange}
                  fullWidth
                />
                <TextField
                  label="Stock"
                  name="stock"
                  type="number"
                  value={editProducto.stock}
                  onChange={handleEditChange}
                  fullWidth
                />
                <TextField
                  label="Categoría"
                  name="categoria"
                  value={editProducto.categoria}
                  onChange={handleEditChange}
                  fullWidth
                />
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button variant="contained" color="primary" onClick={handleGuardarEdicion}>Guardar</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Fade>
  );
}

export default Inventario;
