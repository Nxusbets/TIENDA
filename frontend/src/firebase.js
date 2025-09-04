// Configuración de Firebase

import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDHWa0tMxSqUWDr-KV6Km3d9fXt5GusNYk",
  authDomain: "purificadora-712cf.firebaseapp.com",
  projectId: "purificadora-712cf",
  storageBucket: "purificadora-712cf.firebasestorage.app",
  messagingSenderId: "329907232022",
  appId: "1:329907232022:web:d3952d2c95fef89cdc0437"
};

const app = initializeApp(firebaseConfig);

// Inicializa Firestore y Auth inmediatamente para evitar errores por orden de inicialización
const db = getFirestore(app);
const auth = getAuth(app);

export function getDb() {
  return db;
}

export function getAuthInstance() {
  return auth;
}

// Verifica que las URLs de Firebase y cualquier llamada a tu backend usen el dominio correcto en producción.
// Ejemplo:
// const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
