import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, MenuItem, Select, InputLabel, FormControl, Table, TableHead, TableRow, TableCell, TableBody, Paper, Fade, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { db } from '../firebase';
import { collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isAdmin = usuario && usuario.toLowerCase() === 'jericho888873@gmail.com';

  useEffect(() => {
    console.log('Usuario en Inventario:', usuario);
    const fetchProductos = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'productos'));
        setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        setError('Error al cargar productos');
      } finally {
        setLoading(false);
      }
    };
    fetchProductos();
  }, [usuario]);

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
    setEditProducto({
      ...producto,
      nombre: producto.nombre ?? '',
      codigo: producto.codigo ?? '',
      precioProveedor: producto.precioProveedor ?? '',
      precioCliente: producto.precioCliente ?? '',
      stock: producto.stock ?? '',
      categoria: producto.categoria ?? ''
    });
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

  const handlePriceChange = (id, field, value) => {
    setProductos(productos.map(prod =>
      prod.id === id ? { ...prod, [field]: value } : prod
    ));
  };

  const saveProduct = async (id) => {
    const product = productos.find(p => p.id === id);
    try {
      await updateDoc(doc(db, 'productos', id), {
        precioProveedor: product.precioProveedor,
        precioCliente: product.precioCliente,
      });
      alert('Producto actualizado');
      // Recargar productos
      const snapshot = await getDocs(collection(db, 'productos'));
      setProductos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      alert('Error al actualizar producto');
    }
  };

  const theme = useTheme();
  const isTablet = useMediaQuery(theme.breakpoints.down('md')); // true en md y menores

  if (loading) return <p>Cargando inventario...</p>;
  if (error) return <p>{error}</p>;
  if (!usuario) {
    return <p>Usuario no definido. Inicia sesión con tu cuenta de admin.</p>;
  }

  return (
    <Fade in={true} timeout={400}>
      <Paper elevation={3} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, mb: 2 }}>
        <Typography variant="h5" color="primary" fontWeight={700} gutterBottom sx={{ fontSize: { xs: '1.1rem', md: '1.5rem' } }}>
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

        {/* Admin controls: stack responsive */}
        {isAdmin && (
          <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
            <TextField label="Nueva categoría" variant="outlined" value={nuevaCategoria} onChange={e => setNuevaCategoria(e.target.value)} sx={{ flex: 1 }} />
            <Button variant="contained" color="primary" onClick={handleAgregarCategoria} sx={{ minWidth: { xs: '100%', sm: 140 } }}>
              Agregar
            </Button>
          </Box>
        )}

        {/* Inputs: fullWidth on small screens */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 16 }}>
          <TextField label="Nombre del producto" fullWidth value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })} />
          <TextField label="Código" fullWidth value={nuevo.codigo} onChange={e => setNuevo({ ...nuevo, codigo: e.target.value })} />
          <TextField label="Precio proveedor" type="number" fullWidth value={nuevo.precioProveedor} onChange={e => setNuevo({ ...nuevo, precioProveedor: e.target.value })} />
          <TextField label="Precio cliente" type="number" fullWidth value={nuevo.precioCliente} onChange={e => setNuevo({ ...nuevo, precioCliente: e.target.value })} />
        </Box>

        <TextField label="Stock" type="number" fullWidth sx={{ mt: 2 }} value={nuevo.stock} onChange={e => setNuevo({ ...nuevo, stock: e.target.value })} />

        <Button variant="contained" color="error" fullWidth sx={{ fontWeight: 'bold', py: 1, mt: 2 }} onClick={handleRegistrarProducto}>
          Registrar producto
        </Button>

        {confirmacion && <Typography sx={{ mt: 2, color: '#388e3c', textAlign: 'center', fontWeight: 'bold' }}>{confirmacion}</Typography>}

        {/* Responsive product list: tarjetas en tablet, tabla en desktop */}
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
            Productos registrados:
          </Typography>

          {isTablet ? (
            <Box sx={{ display: 'grid', gap: 2 }}>
              {productos.map((p) => (
                <Paper key={p.id} elevation={1} sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontWeight: 700, fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nombre}</Typography>
                      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>Código: {p.codigo}</Typography>
                      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>Categoría: {p.categoria}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                      <Typography sx={{ fontWeight: 700 }}>${Number(p.precioCliente || 0).toFixed(2)}</Typography>
                      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>Stock: {p.stock}</Typography>
                    </Box>
                  </Box>
                  {isAdmin && (
                    <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                      <Button variant="outlined" color="primary" size="small" onClick={() => handleEditar(p)}>Editar</Button>
                      <Button variant="outlined" color="error" size="small" onClick={() => handleEliminarProducto(p.id)}>Eliminar</Button>
                    </Box>
                  )}
                </Paper>
              ))}
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table sx={{ minWidth: 720 }}>
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
                  {productos.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell>{p.codigo}</TableCell>
                      <TableCell>{p.nombre}</TableCell>
                      <TableCell>{p.stock}</TableCell>
                      <TableCell>${p.precioProveedor}</TableCell>
                      <TableCell>${p.precioCliente}</TableCell>
                      <TableCell>{p.categoria}</TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button variant="contained" color="primary" size="small" sx={{ mr: 1 }} onClick={() => handleEditar(p)}>Editar</Button>
                          <Button variant="contained" color="error" size="small" onClick={() => handleEliminarProducto(p.id)}>Eliminar</Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
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
                  value={editProducto.nombre ?? ''}
                  onChange={handleEditChange}
                  fullWidth
                />
                <TextField
                  label="Código"
                  name="codigo"
                  value={editProducto.codigo ?? ''}
                  onChange={handleEditChange}
                  fullWidth
                />
                <TextField
                  label="Precio proveedor"
                  name="precioProveedor"
                  type="number"
                  value={editProducto.precioProveedor ?? ''}
                  onChange={handleEditChange}
                  fullWidth
                />
                <TextField
                  label="Precio cliente"
                  name="precioCliente"
                  type="number"
                  value={editProducto.precioCliente ?? ''}
                  onChange={handleEditChange}
                  fullWidth
                />
                <TextField
                  label="Stock"
                  name="stock"
                  type="number"
                  value={editProducto.stock ?? ''}
                  onChange={handleEditChange}
                  fullWidth
                />
                <TextField
                  label="Categoría"
                  name="categoria"
                  value={editProducto.categoria ?? ''}
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



