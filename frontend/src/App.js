import React, { useState, useEffect, useMemo } from 'react';
import { getAuthInstance } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { Container, Typography, Modal, Box, TextField, Button, ThemeProvider, createTheme, CssBaseline, IconButton } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PointOfSaleIcon from '@mui/icons-material/PointOfSale';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import SearchIcon from '@mui/icons-material/Search';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import AssessmentIcon from '@mui/icons-material/Assessment';
import Inventario from './components/Inventario';
import Ventas from './components/Ventas';
import Caja from './components/Caja';
import Consulta from './components/Consulta';
import Reporte from './components/Reporte';
import Compras from './components/Compras';

const modalStyle = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  bgcolor: '#0d47a1',
  color: 'white',
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  minWidth: 300,
};

function makeTheme(mode) {
  return createTheme({
    palette: {
      mode,
      primary: {
        main: '#0d47a1', // azul fuerte (mantener)
        contrastText: '#fff'
      },
      secondary: {
        main: '#ff7043'
      },
      background: {
        default: '#f4f6fb', // fondo claro suave
        paper: '#ffffff'
      },
      text: {
        primary: '#0f1724',
        secondary: '#546e7a'
      }
    },
    shape: {
      borderRadius: 12
    },
    typography: {
      fontFamily: '"Montserrat", "Roboto", "Helvetica", "Arial", sans-serif',
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700 }
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 10,
            padding: '10px 16px',
            boxShadow: '0 4px 10px rgba(13,71,161,0.06)',
            transition: 'all 180ms ease',
          },
          containedPrimary: {
            backgroundImage: 'linear-gradient(180deg, #1976d2 0%, #0d47a1 100%)'
          }
        }
      },
      MuiPaper: {
        styleOverrides: {
          root: {
            borderRadius: 12,
            padding: 12,
            transition: 'all 200ms ease',
            // eleva sutilmente al hover
            '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 10px 30px rgba(2,6,23,0.08)' }
          }
        }
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            background: mode === 'dark' ? 'linear-gradient(135deg,#071740 0%, #0b2a66 100%)' : 'linear-gradient(135deg,#eef5ff 0%, #f8fbff 100%)'
          }
        }
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 12
          }
        }
      },
      MuiTextField: {
        defaultProps: {
          variant: 'filled'
        }
      }
    }
  });
}

function App() {
  const [tab, setTab] = useState(1); // Ventas es la primera opción visible
  const [open, setOpen] = useState(true);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(''); // input del formulario
  const [userEmail, setUserEmail] = useState(''); // usuario autenticado
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('darkMode') === 'true');

  const theme = useMemo(() => makeTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode ? 'true' : 'false');
  }, [darkMode]);

  useEffect(() => {
    const auth = getAuthInstance();
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
      setAuthLoading(false);
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
      const auth = getAuthInstance();
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
    const auth = getAuthInstance();
    await signOut(auth);
    setOpen(true);
  };

  const isAdmin = userEmail === 'jericho888873@gmail.com';

  if (authLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Cargando...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{
        minHeight: '100vh',
        background: theme.palette.mode === 'dark' ? 'linear-gradient(135deg,#0b2a66 0%, #071740 100%)' : 'linear-gradient(135deg, #0d47a1 0%, #1976d2 100%)',
        color: 'white',
        fontFamily: 'Montserrat, Arial, sans-serif',
        transition: 'background 0.5s',
        position: 'relative'
      }}>
        {/* Toggle dark/light top-right */}
        <IconButton
          onClick={() => setDarkMode(dm => !dm)}
          sx={{ position: 'fixed', top: 12, right: 12, color: 'white', zIndex: 40 }}
          aria-label="toggle theme"
        >
          {theme.palette.mode === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
        </IconButton>

        <Modal open={open}>
          <Box sx={{
            ...modalStyle,
            boxShadow: '0 8px 32px 0 rgba(0,0,0,0.25)',
            border: '2px solid #fff',
            background: 'rgba(13,71,161,0.95)', // azul primario
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
            <Button variant="contained" color="primary" fullWidth onClick={handleAuth} disabled={loading} sx={{ fontWeight: 'bold', fontSize: '1.1rem', py: 1, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.10)', transition: 'all 0.3s' }}>
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
        <Container maxWidth="xl" sx={{ mt: 6, mb: 6, p: { xs: 1, sm: 2, md: 0 }, borderRadius: 4, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.18)', background: 'rgba(255,255,255,0.04)', minHeight: '80vh' }}>
          <Box sx={{ display: 'flex', height: '100%' }}>
            {/* Lado izquierdo: menú vertical */}
            <Box sx={{
              position: 'relative',
              zIndex: 1200,
              width: { xs: 110, sm: 130, md: 150 },
              minWidth: 110,
              bgcolor: 'rgba(13,71,161,0.95)',
              borderRadius: { xs: 2, sm: '12px 0 0 12px' },
              boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              py: 2,
              px: 1.25,
              minHeight: '80vh',
              overflowY: 'auto',
              overflowX: 'visible',
              // reglas para todos los botones del sidebar
              '& .sidebarBtn': {
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-start',
                textTransform: 'none',
                color: '#fff',
                fontWeight: 700,
                width: '100%',
                height: 48,
                borderRadius: 2,
                pl: 1,
                pr: 1,
                whiteSpace: 'nowrap',
                gap: 0,              // quitar espacio entre icono y texto
                overflow: 'visible'
              },
              // eliminar margin entre icono y texto
              '& .sidebarBtn .MuiButton-startIcon': {
                minWidth: 20,
                marginRight: 0,     // sin separación
                display: 'inline-flex',
                justifyContent: 'center'
              },
              // asegurar color y alineación del label
              '& .sidebarBtn .MuiButton-label, & .sidebarBtn .MuiTypography-root': {
                color: '#fff',
                textAlign: 'left',
                fontSize: '0.95rem',
                overflow: 'visible',
                textOverflow: 'ellipsis',
                paddingLeft: '8px'  // pequeño ajuste para que no queden pegados visualmente (ajustable)
              },
              // estado activo visual
              '& .sidebarBtnActive': {
                background: 'rgba(255,255,255,0.10)'
              }
            }}>
              <Typography
                variant="body2" // fuente más pequeña
                sx={{
                  fontWeight: 'bold',
                  mb: 2,
                  color: '#fff',
                  textShadow: '0 2px 8px rgba(0,0,0,0.12)',
                  textAlign: 'center',
                  wordBreak: 'break-all', // por si el correo es largo
                  fontSize: '0.75rem' // aún más pequeño si lo deseas
                }}
              >
                {userEmail || 'Usuario'}
              </Typography>
              <Button
                className="sidebarBtn"
                fullWidth
                variant="text"
                onClick={userEmail ? handleLogout : () => setOpen(true)}
                startIcon={<AccountBalanceWalletIcon />}
                sx={{
                  mb: 2,
                  fontSize: '0.95rem',
                  color: 'white',
                }}
              >
                {userEmail ? 'Cerrar sesión' : 'Iniciar sesión'}
              </Button>
              {/* Inventario solo para admin */}
              {isAdmin && (
                <Button
                  className={`sidebarBtn ${tab === 0 ? 'sidebarBtnActive' : ''}`}
                  fullWidth
                  onClick={() => setTab(0)}
                  startIcon={<Inventory2Icon />}
                >
                  Inventario
                </Button>
              )}
              <Button
                className={`sidebarBtn ${tab === 1 ? 'sidebarBtnActive' : ''}`}
                fullWidth
                onClick={() => setTab(1)}
                startIcon={<PointOfSaleIcon />}
              >
                Ventas
              </Button>
              <Button
                className={`sidebarBtn ${tab === 2 ? 'sidebarBtnActive' : ''}`}
                fullWidth
                onClick={() => setTab(2)}
                startIcon={<AccountBalanceWalletIcon />}
              >
                Caja
              </Button>
              <Button
                className={`sidebarBtn ${tab === 3 ? 'sidebarBtnActive' : ''}`}
                fullWidth
                onClick={() => setTab(3)}
                startIcon={<SearchIcon />}
              >
                Consultas
              </Button>
              {isAdmin && (
                <>
                  <Button
                    className={`sidebarBtn ${tab === 4 ? 'sidebarBtnActive' : ''}`}
                    fullWidth
                    onClick={() => setTab(4)}
                    startIcon={<LocalShippingIcon />}
                  >
                    Compras
                  </Button>
                  <Button
                    className={`sidebarBtn ${tab === 5 ? 'sidebarBtnActive' : ''}`}
                    fullWidth
                    onClick={() => setTab(5)}
                    startIcon={<AssessmentIcon />}
                  >
                    Reporte
                  </Button>
                </>
              )}
            </Box>
            {/* Lado derecho: contenido dinámico */}
            <Box sx={{
              flex: 1,
              p: { xs: 2, sm: 3, md: 4 },
              borderRadius: { xs: '8px', sm: '0 24px 24px 0' },
              background: 'rgba(255,255,255,0.07)',
              minHeight: '80vh',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              transition: 'background 0.5s',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <Typography variant="h3" align="center" gutterBottom sx={{ fontWeight: 'bold', color: '#0d47a1', textShadow: '0 2px 8px rgba(25,118,210,0.12)', mb: 4 }}>
                Purificadora
              </Typography>
              <Box sx={{ flex: 1 }}>
                {tab === 0 && isAdmin && <Inventario usuario={userEmail} />}
                {tab === 1 && <Ventas usuario={userEmail} />}
                {tab === 2 && <Caja usuario={userEmail} />}
                {tab === 3 && <Consulta usuario={userEmail} />}
                {tab === 4 && isAdmin && <Compras usuario={userEmail} />}
                {tab === 5 && isAdmin && <Reporte usuario={userEmail} />}
              </Box>
            </Box>
          </Box> {/* cierre del Box flex que envuelve menú + contenido */}
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
