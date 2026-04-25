const express = require('express');
const router  = express.Router();
const { v4: uuidv4 } = require('uuid');
const wave = require('../services/wave');
const om   = require('../services/orangeMoney');
const email = require('../services/email');

function getDB(req) { return req.app.locals.db; }

router.get('/produits', (req, res) => {
  try {
    const produits = getDB(req).prepare('SELECT * FROM produits WHERE disponible = 1').all();
    res.json({ success: true, data: produits });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.get('/supplements', (req, res) => {
  try {
    const supplements = getDB(req).prepare(
      'SELECT * FROM supplements WHERE disponible = 1'
    ).all();
    res.json({ success: true, data: supplements });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});
router.post('/commandes', async (req, res) => {
  try {
    const db = getDB(req);
    const { client_nom, client_tel, client_email, adresse_livraison, items, methode_paiement } = req.body;

    if (!client_nom || !client_tel)
      return res.status(400).json({ success: false, message: 'Nom et téléphone obligatoires.' });
    if (!items || !items.length)
      return res.status(400).json({ success: false, message: 'Le panier est vide.' });
    if (!['wave', 'orange_money'].includes(methode_paiement))
      return res.status(400).json({ success: false, message: 'Moyen de paiement invalide.' });

    let montant_total = 0;
    const itemsVerifies = [];
    for (const item of items) {
      const produit = db.prepare('SELECT * FROM produits WHERE id = ? AND disponible = 1').get(item.produit_id);
      if (!produit) return res.status(400).json({ success: false, message: `Produit indisponible.` });
      const quantite = Math.max(1, parseInt(item.quantite) || 1);
      montant_total += produit.prix * quantite;
      itemsVerifies.push({ produit_id: produit.id, nom: produit.nom, prix: produit.prix, quantite });
    }

    const orderId = uuidv4();
    const numero  = `CMD-${Date.now().toString(36).toUpperCase().slice(-8)}`;
    const baseUrl = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;

    db.prepare(`INSERT INTO commandes (id, numero, statut, methode_paiement, montant_total, client_nom, client_tel, client_email, adresse_livraison, items_json) VALUES (?, ?, 'en_attente', ?, ?, ?, ?, ?, ?, ?)`)
      .run(orderId, numero, methode_paiement, montant_total, client_nom, client_tel, client_email || null, adresse_livraison || null, JSON.stringify(itemsVerifies));

    const paymentParams = {
      orderId, amount: montant_total, clientPhone: client_tel,
      description: `Commande ${numero}`,
      successUrl: `${baseUrl}/paiement/succes?orderId=${orderId}`,
      errorUrl:   `${baseUrl}/paiement/echec?orderId=${orderId}`,
      cancelUrl:  `${baseUrl}/paiement/annule?orderId=${orderId}`,
      notifUrl:   `${baseUrl}/api/webhook/${methode_paiement}`,
      returnUrl:  `${baseUrl}/paiement/succes?orderId=${orderId}`,
    };

    let paymentResult;
    if (methode_paiement === 'wave') {
      paymentResult = await wave.createCheckoutSession(paymentParams);
    } else {
      paymentResult = await om.initiatePayment(paymentParams);
    }

    db.prepare('UPDATE commandes SET payment_ref = ?, payment_url = ? WHERE id = ?')
      .run(paymentResult.waveRef || paymentResult.omRef, paymentResult.paymentUrl, orderId);

    res.json({ success: true, data: { orderId, numero, montant_total, payment_url: paymentResult.paymentUrl } });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/commandes/:id', (req, res) => {
  try {
    const commande = getDB(req).prepare('SELECT * FROM commandes WHERE id = ?').get(req.params.id);
    if (!commande) return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    commande.items_json = JSON.parse(commande.items_json || '[]');
    res.json({ success: true, data: commande });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/commandes/:id/confirmer-sandbox', async (req, res) => {
  try {
    const db = getDB(req);
    const commande = db.prepare('SELECT * FROM commandes WHERE id = ?').get(req.params.id);
    if (!commande) return res.status(404).json({ success: false, message: 'Commande introuvable.' });
    db.prepare("UPDATE commandes SET statut='payee' WHERE id=?").run(commande.id);
    const updated = db.prepare('SELECT * FROM commandes WHERE id = ?').get(commande.id);
    await email.envoyerConfirmationCommande(updated);
    res.json({ success: true, numero: commande.numero });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.post('/webhook/wave', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const payload = JSON.parse(req.body.toString());
    if (payload.type === 'checkout.session.completed' && payload.data?.payment_status === 'succeeded') {
      const db = getDB(req);
      const commande = db.prepare('SELECT * FROM commandes WHERE id = ?').get(payload.data.client_reference);
      if (commande && commande.statut === 'en_attente') {
        db.prepare("UPDATE commandes SET statut='payee' WHERE id=?").run(commande.id);
        await email.envoyerConfirmationCommande(db.prepare('SELECT * FROM commandes WHERE id = ?').get(commande.id));
      }
    }
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhook/orange_money', async (req, res) => {
  try {
    const { status, order_id } = req.body;
    if (status === 'SUCCESS' && order_id) {
      const db = getDB(req);
      const commande = db.prepare('SELECT * FROM commandes WHERE id = ?').get(order_id);
      if (commande && commande.statut === 'en_attente') {
        db.prepare("UPDATE commandes SET statut='payee' WHERE id=?").run(commande.id);
        await email.envoyerConfirmationCommande(db.prepare('SELECT * FROM commandes WHERE id = ?').get(commande.id));
      }
    }
    res.json({ received: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
