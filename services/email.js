const nodemailer = require('nodemailer');

async function envoyerConfirmationCommande(commande) {
  const items = JSON.parse(commande.items_json || '[]');
  const lignes = items.map(i =>
    `• ${i.nom} x${i.quantite} — ${(i.prix * i.quantite).toLocaleString('fr-FR')} FCFA`
  ).join('\n');

  const contenu = `
Bonjour ${commande.client_nom},

Votre commande ${commande.numero} est confirmée ! 🎉

Articles :
${lignes}

Total : ${commande.montant_total.toLocaleString('fr-FR')} FCFA
Paiement : ${commande.methode_paiement === 'wave' ? 'Wave' : 'Orange Money'}
Livraison : ${commande.adresse_livraison || 'À définir'}

Temps de préparation : 30-45 minutes.

Merci — L'équipe Salade Shop 🥗
  `;

  // Mode simulation : afficher dans la console
  if (!process.env.SMTP_USER || process.env.NODE_ENV !== 'production') {
    console.log('\n📧 EMAIL DE CONFIRMATION (simulé)');
    console.log('═'.repeat(40));
    console.log(contenu);
    console.log('═'.repeat(40) + '\n');
    return;
  }

  // Mode production : envoyer vraiment
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  if (commande.client_email) {
    await transporter.sendMail({
      from: `SaladeShop <${process.env.SMTP_USER}>`,
      to: commande.client_email,
      subject: `✅ Commande confirmée — ${commande.numero}`,
      text: contenu,
    });
    console.log(`📧 Email envoyé à ${commande.client_email}`);
  }
}

module.exports = { envoyerConfirmationCommande };
