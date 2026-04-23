const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'salade-shop.db');

function initDB() {
  const fs = require('fs');
  if (!fs.existsSync(path.join(__dirname, 'data'))) {
    fs.mkdirSync(path.join(__dirname, 'data'));
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS produits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      description TEXT NOT NULL,
      prix REAL NOT NULL,
      image_url TEXT NOT NULL,
      categorie TEXT DEFAULT 'classique',
      disponible INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS commandes (
      id TEXT PRIMARY KEY,
      numero TEXT NOT NULL UNIQUE,
      statut TEXT DEFAULT 'en_attente',
      methode_paiement TEXT,
      montant_total REAL NOT NULL,
      client_nom TEXT NOT NULL,
      client_tel TEXT NOT NULL,
      client_email TEXT,
      adresse_livraison TEXT,
      items_json TEXT NOT NULL,
      payment_ref TEXT,
      payment_url TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS webhook_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT,
      payload TEXT,
      statut TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  const count = db.prepare('SELECT COUNT(*) as n FROM produits').get();
  if (count.n === 0) {
    const insert = db.prepare(`
      INSERT INTO produits (nom, description, prix, image_url, categorie)
      VALUES (@nom, @description, @prix, @image_url, @categorie)
    `);

    const produits = [
      { nom: 'Salade Niçoise Sénégalaise', description: 'Thon, olives, œufs durs, tomates cerises, haricots verts et vinaigrette citronnée.', prix: 3500, image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop', categorie: 'classique' },
      { nom: 'Bowl Avocat & Crevettes', description: 'Avocat crémeux, crevettes grillées, mangue fraîche, roquette et sauce sésame.', prix: 4500, image_url: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=400&h=300&fit=crop', categorie: 'premium' },
      { nom: 'Salade César Poulet', description: 'Laitue romaine, poulet grillé, parmesan, croûtons et sauce César maison.', prix: 3800, image_url: 'https://images.unsplash.com/photo-1550304943-4f24f54ddde9?w=400&h=300&fit=crop', categorie: 'classique' },
      { nom: 'Salade Végane', description: 'Quinoa, pois chiches, betterave, carottes, épinards et vinaigrette aux herbes.', prix: 3200, image_url: 'https://images.unsplash.com/photo-1514190051997-0f6f39ca5cde?w=400&h=300&fit=crop', categorie: 'vegan' },
      { nom: 'Fataya Bowl Fusion', description: 'Riz thaï, poulet yassa, oignons confits, olives et herbes fraîches.', prix: 4200, image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop', categorie: 'senegalaise' },
      { nom: 'Salade Pastèque & Feta', description: 'Pastèque juteuse, feta émiettée, menthe fraîche et vinaigrette miel-citron.', prix: 3000, image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop', categorie: 'classique' },
    ];

    const insertMany = db.transaction((items) => {
      for (const item of items) insert.run(item);
    });
    insertMany(produits);
  }

  return db;
}

module.exports = { initDB };
