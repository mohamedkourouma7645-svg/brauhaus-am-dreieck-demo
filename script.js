// Brauhaus Am Dreieck — comportement partagé du site (démo, sans backend)

document.addEventListener('DOMContentLoaded', () => {
  /* ---------- Cookie-Hinweis ---------- */
  const cookieBanner = document.getElementById('cookie-banner');
  if (cookieBanner) {
    let bereitsAkzeptiert = false;
    try {
      bereitsAkzeptiert = localStorage.getItem('brauhaus_cookie_consent') === 'true';
    } catch (e) {
      bereitsAkzeptiert = false;
    }
    if (!bereitsAkzeptiert) {
      cookieBanner.removeAttribute('hidden');
      requestAnimationFrame(() => cookieBanner.classList.add('show'));
    }
    document.getElementById('cookie-accept')?.addEventListener('click', () => {
      try {
        localStorage.setItem('brauhaus_cookie_consent', 'true');
      } catch (e) {
        /* localStorage nicht verfügbar (z. B. privater Modus) — Banner schließt sich trotzdem,
           erscheint beim nächsten Laden dieser Seitenansicht aber erneut. */
      }
      cookieBanner.classList.remove('show');
      window.setTimeout(() => cookieBanner.setAttribute('hidden', ''), 400);
    });
  }

  /* ---------- Halo qui suit le curseur sur les cartes ---------- */
  document.querySelectorAll('.card.spotlight').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${e.clientX - rect.left}px`);
      card.style.setProperty('--my', `${e.clientY - rect.top}px`);
    });
  });

  /* ---------- Menu mobile ---------- */
  const toggle = document.querySelector('.nav-toggle');
  const navInner = document.querySelector('.nav-inner');
  if (toggle && navInner) {
    toggle.addEventListener('click', () => {
      const isOpen = navInner.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(isOpen));
    });
  }

  /* ---------- Révélation au scroll ----------
     Important : le marquage des enfants de .reveal-stagger DOIT se faire avant
     la sélection de .reveal ci-dessous — sinon ces enfants n'ont pas encore la
     classe "reveal" au moment où l'observer les recherche, et restent bloqués
     à opacity:0 pour toujours (jamais observés, jamais révélés). */
  document.querySelectorAll('.reveal-stagger').forEach((group) => {
    Array.from(group.children).forEach((child, i) => {
      child.style.setProperty('--i', i);
      child.classList.add('reveal');
    });
  });

  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in-view'));
  }

  /* ---------- Validation de formulaires (inline, sans alert()) ---------- */
  function attachValidation(form) {
    if (!form) return;

    const showError = (field, message) => {
      field.setAttribute('aria-invalid', 'true');
      const errorEl = form.querySelector(`[data-error-for="${field.id}"]`);
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('show');
      }
    };
    const clearError = (field) => {
      field.removeAttribute('aria-invalid');
      const errorEl = form.querySelector(`[data-error-for="${field.id}"]`);
      if (errorEl) errorEl.classList.remove('show');
    };

    form.querySelectorAll('input, select, textarea').forEach((field) => {
      field.addEventListener('input', () => clearError(field));
      field.addEventListener('blur', () => {
        if (field.hasAttribute('required') && !field.value.trim()) {
          showError(field, 'Dieses Feld wird benötigt.');
        } else if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
          showError(field, 'Bitte eine gültige E-Mail-Adresse eingeben.');
        }
      });
    });

    return function validate() {
      let valid = true;
      form.querySelectorAll('input, select, textarea').forEach((field) => {
        if (field.hasAttribute('required') && !field.value.trim()) {
          showError(field, 'Dieses Feld wird benötigt.');
          valid = false;
        } else if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) {
          showError(field, 'Bitte eine gültige E-Mail-Adresse eingeben.');
          valid = false;
        } else {
          clearError(field);
        }
      });
      return valid;
    };
  }

  /* ---------- Formulaires de réservation (Tisch et Bowling — totalement séparés) ----------
     Chaque formulaire a son propre id, sa propre page, et son propre libellé de
     confirmation ("Neue Tisch-Reservierung" / "Neue Bowling-Reservierung") — ce
     libellé sert de repère clair pour le restaurant, qui doit pouvoir distinguer
     immédiatement les deux types de réservation sans les confondre. */
  function attachReservationForm(formId, options) {
    const form = document.getElementById(formId);
    if (!form) return;
    const validate = attachValidation(form);
    const dateInput = form.querySelector('input[type="date"]');
    if (dateInput) dateInput.setAttribute('min', new Date().toISOString().split('T')[0]);

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!validate()) return;

      const name = form.querySelector('[name="name"]').value.trim();
      const date = form.querySelector('[name="date"]').value;
      const time = form.querySelector('[name="time"]').value;
      const menge = form.querySelector(`[name="${options.mengeField}"]`).value;

      const dateFormatted = date
        ? new Date(date + 'T00:00:00').toLocaleDateString('de-DE', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
          })
        : '';

      const confirmation = document.getElementById(options.confirmationId);
      confirmation.innerHTML =
        `<strong>${options.label}</strong><br>` +
        `Vielen Dank, ${name}. Ihre Reservierung für ${menge} am ${dateFormatted} um ${time} Uhr ` +
        `wurde erfasst. Demo — es werden aktuell keine echten Daten übertragen.`;
      confirmation.classList.add('show');
      form.reset();
    });
  }

  attachReservationForm('reservation-form', {
    mengeField: 'guests',
    label: 'Neue Tisch-Reservierung ✓',
    confirmationId: 'confirmation-message',
  });
  attachReservationForm('bowling-reservation-form', {
    mengeField: 'lanes',
    label: 'Neue Bowling-Reservierung ✓',
    confirmationId: 'bowling-confirmation-message',
  });

  /* ---------- Formulaire de contact ---------- */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const validate = attachValidation(contactForm);
    contactForm.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!validate()) return;
      const name = document.getElementById('contact-name').value.trim();
      const confirmation = document.getElementById('contact-confirmation');
      confirmation.textContent = `Danke, ${name}. Ihre Nachricht wurde erfasst. Demo — es wird aktuell nichts versendet.`;
      confirmation.classList.add('show');
      contactForm.reset();
    });
  }

  /* ---------- Warenkorb : plusieurs plats, une seule commande à la validation ---------- */

  const WARENKORB_KEY = 'brauhaus_warenkorb';
  const LETZTE_BESTELLUNG_KEY = 'brauhaus_letzte_bestellung';
  const VERLAUF_KEY = 'brauhaus_bestell_verlauf';

  function ladeWarenkorb() {
    try {
      return JSON.parse(sessionStorage.getItem(WARENKORB_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function speichereWarenkorb(items) {
    try {
      sessionStorage.setItem(WARENKORB_KEY, JSON.stringify(items));
    } catch (e) {
      /* sessionStorage nicht verfügbar (z. B. privater Modus) — der Warenkorb funktioniert
         dann nur für die aktuelle Seitenansicht, ohne Speicherung. */
    }
  }

  function formatPreis(zahl) {
    return zahl.toFixed(2).replace('.', ',') + ' €';
  }

  function warenkorbGesamt(items) {
    return items.reduce((summe, i) => summe + i.preis * i.menge, 0);
  }

  /* Lit le nom/prix d'un plat depuis son .menu-item — pas de variantes de taille
     sur ce menu (contrairement à RAUM), donc juste un prix fixe par plat. */
  function infosPlat(menuItem) {
    const name = menuItem.getAttribute('data-dish-name') || '';
    const priceEl = menuItem.querySelector('.price');
    const preis = priceEl ? parseFloat(priceEl.textContent.replace(/[^\d,]/g, '').replace(',', '.')) || 0 : 0;
    return { name, preis };
  }

  /* Ajoute au panier le plat, à la quantité actuellement choisie dans son compteur
     +/- (indique "combien j'ajoute maintenant", pas "combien j'ai déjà dans le
     panier"). Le compteur part de 0 : tant qu'il est à 0, "Bestellen" ne fait rien
     (rien à ajouter). Remet le compteur à 0 après un ajout réussi. */
  function dishAddToCart(menuItem) {
    const { name, preis } = infosPlat(menuItem);
    const valueEl = menuItem.querySelector('.dish-counter-value');
    if (!valueEl) return;
    const menge = parseInt(valueEl.textContent, 10) || 0;
    if (menge <= 0) return;

    const items = ladeWarenkorb();
    const index = items.findIndex((i) => i.name === name);
    if (index !== -1) {
      items[index].menge += menge;
      items[index].preis = preis;
    } else {
      items.push({ name, preis, menge });
    }
    speichereWarenkorb(items);
    aktualisiereBestellBadge();

    const confirmEl = document.getElementById('cart-confirm');
    if (confirmEl) confirmEl.setAttribute('hidden', '');
    renderCartPanel();

    valueEl.textContent = '0';

    const addedEl = menuItem.querySelector('.order-added');
    if (addedEl) {
      addedEl.textContent = menge > 1 ? '✓ ' + menge + '× zum Warenkorb hinzugefügt' : '✓ Zum Warenkorb hinzugefügt';
      addedEl.classList.add('show');
      window.clearTimeout(addedEl._timeout);
      addedEl._timeout = window.setTimeout(() => addedEl.classList.remove('show'), 2200);
    }
  }

  function resetAlleDishQty() {
    document.querySelectorAll('.dish-counter-value').forEach((valueEl) => {
      valueEl.textContent = '0';
    });
  }

  function warenkorbAendereMenge(index, delta) {
    const items = ladeWarenkorb();
    if (!items[index]) return;
    items[index].menge += delta;
    if (items[index].menge <= 0) items.splice(index, 1);
    speichereWarenkorb(items);
    aktualisiereBestellBadge();
    renderCartPanel();
  }

  /* Erzeugt eine zufällige, innerhalb dieses Besuchs eindeutige Bestellnummer (Demo, kein Backend). */
  function erzeugeBestellnummer() {
    let verlauf = [];
    try {
      verlauf = JSON.parse(sessionStorage.getItem(VERLAUF_KEY) || '[]');
    } catch (e) {
      verlauf = [];
    }
    let nummer;
    do {
      nummer = Math.floor(1000 + Math.random() * 9000);
    } while (verlauf.includes(nummer));
    verlauf.push(nummer);
    try {
      sessionStorage.setItem(VERLAUF_KEY, JSON.stringify(verlauf));
      sessionStorage.setItem(LETZTE_BESTELLUNG_KEY, String(nummer));
    } catch (e) {
      /* sessionStorage nicht verfügbar (z. B. private Modus) — Nummer wird trotzdem angezeigt, nur nicht gemerkt. */
    }
    return nummer;
  }

  /* Zeigt das feste Badge unten rechts. Tant qu'aucune commande n'est validée, on
     n'affiche RIEN qui ressemble à un numéro — juste l'icône panier + le nombre
     d'articles. Le numéro de commande n'apparaît que dans l'état "Ihre Bestellung",
     après la validation. */
  function aktualisiereBestellBadge() {
    const badge = document.getElementById('order-badge');
    const countEl = document.getElementById('order-badge-count');
    const labelEl = document.getElementById('order-badge-label');
    const nummerEl = document.getElementById('order-badge-number');
    if (!badge || !nummerEl) return;

    const items = ladeWarenkorb();
    const anzahl = items.reduce((n, i) => n + i.menge, 0);

    if (anzahl > 0) {
      labelEl.textContent = 'Warenkorb ansehen';
      nummerEl.textContent = '';
      countEl.textContent = String(anzahl);
      countEl.removeAttribute('hidden');
      badge.removeAttribute('hidden');
      return;
    }

    let letzte = null;
    try {
      letzte = sessionStorage.getItem(LETZTE_BESTELLUNG_KEY);
    } catch (e) {
      letzte = null;
    }
    countEl.setAttribute('hidden', '');
    if (letzte) {
      labelEl.textContent = 'Ihre Bestellung';
      nummerEl.textContent = '#' + letzte;
      badge.removeAttribute('hidden');
    } else {
      badge.setAttribute('hidden', '');
    }
  }

  /* ---------- Panier : rendu du contenu ---------- */

  function renderCartPanel() {
    const itemsEl = document.getElementById('cart-items');
    const emptyEl = document.getElementById('cart-empty');
    const footerEl = document.getElementById('cart-footer');
    const confirmEl = document.getElementById('cart-confirm');
    const totalEl = document.getElementById('cart-total-amount');
    const checkoutBtn = document.getElementById('cart-checkout');
    if (!itemsEl) return;

    if (confirmEl && !confirmEl.hasAttribute('hidden')) return;

    const items = ladeWarenkorb();

    if (items.length === 0) {
      itemsEl.innerHTML = '';
      emptyEl.removeAttribute('hidden');
      footerEl.setAttribute('hidden', '');
      return;
    }

    emptyEl.setAttribute('hidden', '');
    footerEl.removeAttribute('hidden');

    itemsEl.innerHTML = items
      .map((item, index) => {
        return (
          '<li class="cart-item">' +
          '<div class="cart-item-info"><span class="cart-item-name">' + item.name + '</span></div>' +
          '<div class="cart-item-qty">' +
          '<button type="button" class="cart-qty-btn" data-cart-action="dec" data-index="' + index + '" aria-label="Weniger">−</button>' +
          '<span>' + item.menge + '</span>' +
          '<button type="button" class="cart-qty-btn" data-cart-action="inc" data-index="' + index + '" aria-label="Mehr">+</button>' +
          '</div>' +
          '<span class="cart-item-price">' + formatPreis(item.preis * item.menge) + '</span>' +
          '</li>'
        );
      })
      .join('');

    totalEl.textContent = formatPreis(warenkorbGesamt(items));
    checkoutBtn.removeAttribute('disabled');
  }

  function oeffneCartPanel() {
    const scrim = document.getElementById('cart-scrim');
    const panel = document.getElementById('cart-panel');
    if (!panel || !scrim) return;
    renderCartPanel();
    scrim.removeAttribute('hidden');
    panel.removeAttribute('hidden');
    requestAnimationFrame(() => {
      scrim.classList.add('show');
      panel.classList.add('show');
    });
  }

  function schliesseCartPanel() {
    const scrim = document.getElementById('cart-scrim');
    const panel = document.getElementById('cart-panel');
    if (!panel || !scrim) return;
    scrim.classList.remove('show');
    panel.classList.remove('show');
    window.setTimeout(() => {
      scrim.setAttribute('hidden', '');
      panel.setAttribute('hidden', '');
    }, 350);
  }

  function checkoutWarenkorb() {
    const items = ladeWarenkorb();
    if (items.length === 0) return;

    const nummer = erzeugeBestellnummer();
    const anzahl = items.reduce((n, i) => n + i.menge, 0);
    const liste = items
      .map(
        (i) =>
          '<li class="cart-confirm-item">' +
          '<span class="cart-confirm-item-name">' + i.name + '</span>' +
          '<strong class="cart-confirm-item-qty">× ' + i.menge + '</strong>' +
          '</li>'
      )
      .join('');

    speichereWarenkorb([]);
    resetAlleDishQty();

    const confirmEl = document.getElementById('cart-confirm');
    const itemsEl = document.getElementById('cart-items');
    const emptyEl = document.getElementById('cart-empty');
    const footerEl = document.getElementById('cart-footer');

    itemsEl.innerHTML = '';
    emptyEl.setAttribute('hidden', '');
    footerEl.setAttribute('hidden', '');

    confirmEl.innerHTML =
      '<p class="cart-confirm-msg">Bestellung bestätigt — Nummer <strong>#' + nummer + '</strong><br>' +
      'Zeigen Sie diese Nummer an der Theke.</p>' +
      '<p class="cart-confirm-list-label">' + anzahl + ' Artikel:</p>' +
      '<ul class="cart-confirm-list">' + liste + '</ul>';
    confirmEl.removeAttribute('hidden');

    aktualisiereBestellBadge();
  }

  aktualisiereBestellBadge();

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const panel = document.getElementById('cart-panel');
      if (panel && !panel.hasAttribute('hidden')) schliesseCartPanel();
    }
  });

  document.addEventListener('click', (event) => {
    const counterBtn = event.target.closest('.dish-counter-btn');
    if (counterBtn) {
      const valueEl = counterBtn.closest('.dish-counter')?.querySelector('.dish-counter-value');
      if (!valueEl) return;
      const aktuell = parseInt(valueEl.textContent, 10) || 0;
      const delta = counterBtn.getAttribute('data-counter-action') === 'inc' ? 1 : -1;
      valueEl.textContent = String(Math.max(0, aktuell + delta));
      return;
    }

    const addBtn = event.target.closest('.dish-add-btn');
    if (addBtn) {
      const menuItem = addBtn.closest('.menu-item');
      if (menuItem) dishAddToCart(menuItem);
      return;
    }

    if (event.target.closest('#order-badge')) {
      oeffneCartPanel();
      return;
    }
    if (event.target.closest('#cart-close') || event.target.closest('#cart-scrim')) {
      schliesseCartPanel();
      return;
    }
    if (event.target.closest('#cart-checkout')) {
      checkoutWarenkorb();
      return;
    }
    const qtyBtn = event.target.closest('.cart-qty-btn');
    if (qtyBtn) {
      const index = parseInt(qtyBtn.getAttribute('data-index'), 10);
      const delta = qtyBtn.getAttribute('data-cart-action') === 'inc' ? 1 : -1;
      warenkorbAendereMenge(index, delta);
      return;
    }
  });
});
