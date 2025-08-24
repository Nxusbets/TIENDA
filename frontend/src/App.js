import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Container, Typography, Modal, Box, TextField, Button } from '@mui/material';
import Inventario from './components/Inventario';
import Ventas from './components/Ventas';
import Caja from './components/Caja';
import Consulta from './components/Consulta';
import Reporte from './components/Reporte';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: '#b71c1c',
  color: 'white',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  minWidth: 300,
};

function App() {
  const [tab, setTab] = useState(1); // Ventas es la primera opción visible
  const [open, setOpen] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(''); // input del formulario
  const [userEmail, setUserEmail] = useState(''); // usuario autenticado
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(user => {
      if (user) {
        setUserEmail(user.email); // guardar email del usuario autenticado
        // Si no es admin, mostrar Caja al iniciar sesión
        if (user.email !== 'jericho888873@gmail.com') {
          setTab(2); // Caja
        } else {
          setTab(1); // Ventas para admin
        }
        setOpen(false);
      } else {
        setUserEmail('');
        setOpen(true);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      // Solo para registro, valida que el email sea válido
      if (!isLogin && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError('Ingresa un correo electrónico válido');
        setLoading(false);
        return;
      }
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      setOpen(false);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleLogout = async () => {
    await signOut(auth);
    setOpen(true);
  };

  const isAdmin = userEmail === 'jericho888873@gmail.com';

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #b71c1c 0%, #f44336 100%)',
      color: 'white',
      fontFamily: 'Montserrat, Arial, sans-serif',
      transition: 'background 0.5s',
    }}>
      <Modal open={open}>
        <Box sx={{
          ...modalStyle,
          boxShadow: '0 8px 32px 0 rgba(0,0,0,0.25)',
          border: '2px solid #fff',
          background: 'rgba(183,28,28,0.95)',
          backdropFilter: 'blur(6px)',
        }}>
          <Typography variant="h4" align="center" gutterBottom sx={{ fontWeight: 'bold', letterSpacing: 1 }}>
            {isLogin ? 'Iniciar Sesión' : 'Registrar Usuario'}
          </Typography>
          <TextField
            label="Correo"
            variant="filled"
            fullWidth
            sx={{ mb: 2, bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <TextField
            label="Contraseña"
            type="password"
            variant="filled"
            fullWidth
            sx={{ mb: 2, bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {error && <Typography sx={{ color: '#ffe082', fontSize: '0.9rem', mb: 1, textAlign: 'center' }}>{error}</Typography>}
          <Button variant="contained" color="error" fullWidth onClick={handleAuth} disabled={loading} sx={{ fontWeight: 'bold', fontSize: '1.1rem', py: 1, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.10)', transition: 'all 0.3s', ':hover': { bgcolor: '#d32f2f' } }}>
            {loading ? 'Procesando...' : isLogin ? 'Entrar' : 'Registrar'}
          </Button>
          <Button
            sx={{ mt: 2, color: '#b71c1c', borderColor: '#fff', fontWeight: 'bold', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', transition: 'all 0.3s', ':hover': { bgcolor: '#fff', color: '#b71c1c' } }}
            variant="outlined"
            fullWidth
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
          </Button>
        </Box>
      </Modal>
      <Container maxWidth="xl" sx={{ mt: 6, mb: 6, p: 0, borderRadius: 4, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.18)', background: 'rgba(255,255,255,0.04)', minHeight: '80vh' }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* Lado izquierdo: menú vertical */}
          <Box sx={{
            width: 180,
            bgcolor: 'rgba(183,28,28,0.92)',
            borderRadius: '18px 0 0 18px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            py: 2,
            px: 1,
            minHeight: '80vh',
          }}>
            <Typography
              variant="body2" // fuente más pequeña
              sx={{
                fontWeight: 'bold',
                mb: 2,
                color: '#fff',
                textShadow: '0 2px 8px #b71c1c',
                textAlign: 'center',
                wordBreak: 'break-all', // por si el correo es largo
                fontSize: '0.85rem' // aún más pequeño si lo deseas
              }}
            >
              {userEmail || 'Usuario'}
            </Typography>
            <Button
              fullWidth
              variant="outlined"
              color="info"
              sx={{ mb: 2, fontWeight: 'bold', fontSize: '0.95rem', borderRadius: 2 }}
              onClick={userEmail ? handleLogout : () => setOpen(true)}
            >
              {userEmail ? 'Cerrar sesión' : 'Iniciar sesión'}
            </Button>
            {/* Inventario solo para admin */}
            {isAdmin && (
              <Button
                fullWidth
                variant={tab === 0 ? "contained" : "outlined"}
                color="error"
                sx={{ mb: 1, fontWeight: 'bold', fontSize: '1rem', borderRadius: 2 }}
                onClick={() => setTab(0)}
              >
                Inventario
              </Button>
            )}
            <Button
              fullWidth
              variant={tab === 1 ? "contained" : "outlined"}
              color="error"
              sx={{ mb: 1, fontWeight: 'bold', fontSize: '1rem', borderRadius: 2 }}
              onClick={() => setTab(1)}
            >
              Ventas
            </Button>
            <Button
              fullWidth
              variant={tab === 2 ? "contained" : "outlined"}
              color="error"
              sx={{ mb: 1, fontWeight: 'bold', fontSize: '1rem', borderRadius: 2 }}
              onClick={() => setTab(2)}
            >
              Caja
            </Button>
            <Button
              fullWidth
              variant={tab === 3 ? "contained" : "outlined"}
              color="error"
              sx={{ mb: 1, fontWeight: 'bold', fontSize: '1rem', borderRadius: 2 }}
              onClick={() => setTab(3)}
            >
              Consultas
            </Button>
            {isAdmin && (
              <Button
                fullWidth
                variant={tab === 4 ? "contained" : "outlined"}
                color="error"
                sx={{ mb: 1, fontWeight: 'bold', fontSize: '1rem', borderRadius: 2 }}
                onClick={() => setTab(4)}
              >
                Reporte
              </Button>
            )}
          </Box>
          {/* Lado derecho: contenido dinámico */}
          <Box sx={{
            flex: 1,
            p: 4,
            borderRadius: '0 24px 24px 0',
            background: 'rgba(255,255,255,0.07)',
            minHeight: '80vh',
            boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
            transition: 'background 0.5s',
            display: 'flex',
            flexDirection: 'column',
          }}>
            <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 'bold', color: '#fff', textShadow: '0 2px 8px #b71c1c', mb: 4 }}>
              Tienda de Abarrotes
            </Typography>
            <Box sx={{ flex: 1 }}>
              {tab === 0 && isAdmin && <Inventario />}
              {tab === 1 && <Ventas usuario={userEmail} />}
              {tab === 2 && <Caja usuario={userEmail} />}
              {tab === 3 && <Consulta usuario={userEmail} />}
              {tab === 4 && isAdmin && <Reporte />}
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
}

export default App;
