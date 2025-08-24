const express = require('express');
const cors = require('cors');
const admin = require('firebase-admin');

const app = express();
app.use(cors());
app.use(express.json());

// Inicializa Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
const db = admin.firestore();

// Endpoint ejemplo: obtener productos
app.get('/productos', async (req, res) => {
  const snapshot = await db.collection('productos').get();
  const productos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  res.json(productos);
});

app.listen(4000, () => {
  console.log('API backend corriendo en puerto 4000');
});
