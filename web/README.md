# 🎓 StudyOrganizer Web Frontend

Moduł frontendowy i bezserwerowy aplikacji **StudyOrganizer** dla studentów AGH (React 19, Vite, Tailwind CSS v4, PWA, Firebase Cloud Functions).

> 💡 **Pełna dokumentacja architektury, schematów, integracji oraz planu rozwoju znajduje się w głównym pliku [README.md](../README.md).**

---

## ⚡ Szybki Start

```bash
# 1. Instalacja zależności
npm install

# 2. Uruchomienie deweloperskie (HMR)
npm run dev

# 3. Budowanie produkcyjne
npm run build

# 4. Sprawdzenie lintera
npm run lint
```

## 📦 Struktura katalogu `web/`
- `src/` – Komponenty React, widoki, serwisy, zarządcy kontekstu i logika kampusu AGH.
- `public/` – PWA manifest, service worker (`firebase-messaging-sw.js`), ikony.
- `functions/` – Firebase Cloud Functions (harmonogram sprawdzania powiadomień `Time-to-Leave`).
- `firestore.rules` – Reguły bezpieczeństwa bazy Cloud Firestore.
- `firebase.json` – Konfiguracja wdrożenia na Firebase Hosting, Functions i Firestore.

Więcej szczegółów w [głównym README projektu](../README.md).
