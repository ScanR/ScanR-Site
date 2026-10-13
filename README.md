# ScanR-Site

Le site de ScanR

## Modifier le site

- **Header** : il est commun à toutes les pages. Modifier `_partials/header.html`, puis lancer
  `node scripts/sync-header.mjs` pour le recopier dans `index.html`, `serie.html` et `404.html`
  (une vérification GitHub Actions échoue si on oublie).
- **Icônes** : symboles SVG définis dans le header (`<svg class="icon"><use href="#i-nom"></use></svg>`,
  ou `icon("nom")` en JavaScript). Pour en ajouter un, copier le SVG depuis Font Awesome Free.
- **Cache** : les fichiers JS et CSS sont gardés 4 h en cache. Après une modification, changer le
  numéro `?v=` partout (pages HTML et imports de `common.js`).
