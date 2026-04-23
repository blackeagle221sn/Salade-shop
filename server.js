require('dotenv').config();

const express    = require('express');
const path       = require('path');
const cors       = require('cors');
const helmet     = require('helmet');
const rateLimit  = require('express-rate-limit');
const { initDB } = require('./db');
const apiRoutes  = require('./routes/api');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const db = initDB();
app.locals.db = db;

app.use('/api', apiRoutes);

app.get('/paiement/simulation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'simulation.html'));
});
app.get('/paiement/succes', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'succes.html'));
});
app.get('/paiement/echec', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'echec.html'));
});
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🥗 Salade Shop démarré sur le port ${PORT}`);
});

module.exports = app;
