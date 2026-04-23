let panier = JSON.parse(localStorage.getItem('salade_panier') || '[]');
let tousLesProduits = [];
let filtreActif = 'all';

document.addEventListener('DOMContentLoaded', () => {
  chargerProduits();
  renderPanier();
  initFiltres();
});

async function chargerProduits() {
  try {
    const res  = await fetch('/api/produits');
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    tousLesProduits = data.data;
    afficherProduits(tousLesProduits);
  } catch (err) {
    document.getElementById('produitGrid').innerHTML = `
      <div class="loading-state">
        <p>❌ Erreur lors du chargement du menu.</p>
        <button class="btn btn-sm btn-primary" onclick="chargerProduits()">Réessayer</button>
      </div>`;
  }
}

function afficherProduits(produits) {
  const grid = document.getElementById('produitGrid');
  if (!produits.length) {
    grid.innerHTML = `<div class="loading-state"><p>Aucun produit dans cette catégorie.</p></div>`;
    return;
  }
  const badgeClass = { premium: 'badge-premium', vegan: 'badge-vegan', senegalaise: 'badge-senegalaise' };
  const badgeLabel = { classique: 'Classique', premium: '⭐ Premium', vegan: '🌱 Vegan', senegalaise: '🇸🇳 Sénégalais' };
  grid.innerHTML = produits.map(p => {
    const inPanier = panier.find(i => i.id === p.id);
    return `
      <article class="produit-card" data-cat="${p.categorie}">
        <div class="produit-img">
          <img src="${p.image_url}" alt="${p.nom}" loading="lazy"
               onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(p.nom)}&background=A8CC6A&color=2D5016&size=200'">
          <span class="produit-badge ${badgeClass[p.categorie] || ''}">${badgeLabel[p.categorie] || p.categorie}</span>
        </div>
        <div class="produit-body">
          <span class="produit-cat">${p.categorie}</span>
          <h3 class="produit-nom">${p.nom}</h3>
          <p class="produit-desc">${p.description}</p>
          <div class="produit-footer">
            <div class="produit-prix">${p.prix.toLocaleString('fr-FR')} <small>FCFA</small></div>
            <button class="btn-ajouter ${inPanier ? 'added' : ''}" id="btn-${p.id}" onclick="ajouterAuPanier(${p.id})">
              ${inPanier ? `✓ (${inPanier.quantite})` : '+ Ajouter'}
            </button>
          </div>
        </div>
      </article>`;
  }).join('');
}

function initFiltres() {
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filtreActif = btn.dataset.cat;
      const filtered = filtreActif === 'all' ? tousLesProduits : tousLesProduits.filter(p => p.categorie === filtreActif);
      afficherProduits(filtered);
    });
  });
}

function sauvegarderPanier() { localStorage.setItem('salade_panier', JSON.stringify(panier)); }
function totalPanier() { return panier.reduce((sum, i) => sum + i.prix * i.quantite, 0); }
function nombreArticles() { return panier.reduce((sum, i) => sum + i.quantite, 0); }

function ajouterAuPanier(produitId) {
  const produit = tousLesProduits.find(p => p.id === produitId);
  if (!produit) return;
  const existing = panier.find(i => i.id === produitId);
  if (existing) { existing.quantite++; }
  else { panier.push({ id: produit.id, nom: produit.nom, prix: produit.prix, image_url: produit.image_url, quantite: 1 }); }
  sauvegarderPanier();
  renderPanier();
  afficherProduits(filtreActif === 'all' ? tousLesProduits : tousLesProduits.filter(p => p.categorie === filtreActif));
  showToast(`🥗 ${produit.nom} ajouté !`);
  openCart();
}

function changerQuantite(produitId, delta) {
  const item = panier.find(i => i.id === produitId);
  if (!item) return;
  item.quantite += delta;
  if (item.quantite <= 0) panier = panier.filter(i => i.id !== produitId);
  sauvegarderPanier();
  renderPanier();
  afficherProduits(filtreActif === 'all' ? tousLesProduits : tousLesProduits.filter(p => p.categorie === filtreActif));
}

function supprimerDuPanier(produitId) {
  panier = panier.filter(i => i.id !== produitId);
  sauvegarderPanier();
  renderPanier();
  afficherProduits(filtreActif === 'all' ? tousLesProduits : tousLesProduits.filter(p => p.categorie === filtreActif));
  showToast('🗑️ Article retiré', 'error');
}

function renderPanier() {
  const badge  = document.getElementById('cartBadge');
  const items  = document.getElementById('cartItems');
  const empty  = document.getElementById('cartEmpty');
  const footer = document.getElementById('cartFooter');
  const total  = document.getElementById('cartTotal');
  const nb     = nombreArticles();
  badge.textContent = nb;
  badge.style.background = nb > 0 ? 'var(--orange-main)' : 'transparent';
  if (!panier.length) {
    items.innerHTML = '';
    empty.style.display = 'flex';
    footer.style.display = 'none';
    return;
  }
  empty.style.display = 'none';
  footer.style.display = 'flex';
  total.textContent = `${totalPanier().toLocaleString('fr-FR')} FCFA`;
  items.innerHTML = panier.map(item => `
    <div class="cart-item">
      <div class="cart-item-img">
        <img src="${item.image_url}" alt="${item.nom}"
             onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(item.nom)}&background=A8CC6A&color=2D5016&size=60'">
      </div>
      <div class="cart-item-info">
        <div class="cart-item-nom">${item.nom}</div>
        <div class="cart-item-prix">${(item.prix * item.quantite).toLocaleString('fr-FR')} FCFA</div>
        <div class="cart-item-ctrl">
          <button class="qty-btn minus" onclick="changerQuantite(${item.id}, -1)">−</button>
          <span class="qty-val">${item.quantite}</span>
          <button class="qty-btn" onclick="changerQuantite(${item.id}, 1)">+</button>
          <button class="cart-item-del" onclick="supprimerDuPanier(${item.id})">🗑️</button>
        </div>
      </div>
    </div>`).join('');
}

function openCart() {
  document.getElementById('cartPanel').classList.add('open');
  document.getElementById('cartOverlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cartPanel').classList.remove('open');
  document.getElementById('cartOverlay').classList.remove('active');
  document.body.style.overflow = '';
}
function toggleCart() {
  document.getElementById('cartPanel').classList.contains('open') ? closeCart() : openCart();
}

function ouvrirCheckout() {
  if (!panier.length) { showToast('Votre panier est vide !', 'error'); return; }
  closeCart();
  document.getElementById('checkoutOverlay').classList.add('active');
  afficherStep(1);
}
function fermerCheckout() {
  document.getElementById('checkoutOverlay').classList.remove('active');
  afficherStep(1);
}
function afficherStep(n) {
  [1,2,3].forEach(i => document.getElementById(`step${i}`)?.classList.toggle('hidden', i !== n));
}

function allerStep2() {
  const nom     = document.getElementById('clientNom').value.trim();
  const tel     = document.getElementById('clientTel').value.trim();
  const adresse = document.getElementById('clientAdresse').value.trim();
  let valid = true;
  [{ id: 'clientNom', val: nom }, { id: 'clientTel', val: tel }, { id: 'clientAdresse', val: adresse }].forEach(({ id, val }) => {
    const el = document.getElementById(id);
    if (!val) { el.classList.add('error'); valid = false; }
    else el.classList.remove('error');
  });
  if (!valid) { showToast('Veuillez remplir tous les champs.', 'error'); return; }
  const lignes = panier.map(i =>
    `<div style="display:flex;justify-content:space-between;margin-bottom:4px;font-size:13px;">
      <span>${i.nom} ×${i.quantite}</span>
      <span>${(i.prix * i.quantite).toLocaleString('fr-FR')} FCFA</span>
     </div>`).join('');
  document.getElementById('recapBox').innerHTML = `${lignes}<div class="recap-total">${totalPanier().toLocaleString('fr-FR')} FCFA</div>`;
  afficherStep(2);
}

function retourStep1() { afficherStep(1); }

async function passerCommande() {
  const paiement = document.querySelector('input[name="paiement"]:checked');
  if (!paiement) { showToast('Choisissez un moyen de paiement.', 'error'); return; }
  afficherStep(3);
  try {
    const res  = await fetch('/api/commandes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_nom: document.getElementById('clientNom').value.trim(),
        client_tel: document.getElementById('clientTel').value.trim(),
        client_email: document.getElementById('clientEmail').value.trim() || null,
        adresse_livraison: document.getElementById('clientAdresse').value.trim(),
        methode_paiement: paiement.value,
        items: panier.map(i => ({ produit_id: i.id, quantite: i.quantite }))
      })
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);
    localStorage.setItem('salade_last_order', data.data.orderId);
    panier = [];
    sauvegarderPanier();
    renderPanier();
    window.location.href = data.data.payment_url;
  } catch (err) {
    fermerCheckout();
    showToast(`❌ ${err.message || 'Erreur lors de la commande'}`, 'error');
  }
}

let toastTimer = null;
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.classList.remove('show'); }, 2800);
}

document.getElementById('checkoutOverlay')?.addEventListener('click', (e) => {
  if (e.target === document.getElementById('checkoutOverlay')) fermerCheckout();
});
