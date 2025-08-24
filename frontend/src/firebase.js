// Configuración de Firebase

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyBYycM_oaSiaXiJXdXT98pjrEDq8rSyXfQ",
  authDomain: "tienda-15dff.firebaseapp.com",
  projectId: "tienda-15dff",
  storageBucket: "tienda-15dff.firebasestorage.app",
  messagingSenderId: "988758369171",
  appId: "1:988758369171:web:6ed1978973e383cfe3be66"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Verifica que las URLs de Firebase y cualquier llamada a tu backend usen el dominio correcto en producción.
// Ejemplo:
// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
