---
title: StudyOrganizer Discord Bot
emoji: 🤖
colorFrom: indigo
colorTo: blue
sdk: docker
app_port: 7860
pinned: false
---

# StudyOrganizer — Discord to Firebase Auto-Sync Bot Bridge 🤖⚡

Lekki mostek (bot) w Node.js, który automatycznie nasłuchuje na wybranych kanałach Discorda (np. `#ogłoszenia`, `#materiały`, `#terminy`, kanały przedmiotów) i w ułamku sekundy zapisuje nowe wiadomości, ogłoszenia oraz załączniki bezpośrednio do bazy **Firebase Firestore** Twojego StudyOrganizera.

---

## 🚀 Szybki Start (Lokalnie na Twoim komputerze)

### 1. Pobierz klucz usługi Firebase (Service Account)
1. Otwórz [Firebase Console](https://console.firebase.google.com/project/organizer-637f1/settings/serviceaccounts/adminsdk).
2. W zakładce **Konta usługi (Service accounts)** kliknij przycisk **Wygeneruj nowy klucz prywatny (Generate new private key)**.
3. Pobrany plik `.json` zmień na nazwę:
   ```
   serviceAccountKey.json
   ```
   i przenieś go do tego folderu (`d:/Organizer/bot/serviceAccountKey.json`).

### 2. Skonfiguruj plik `.env`
Skopiuj `.env.example` do `.env`:
```bash
cp .env.example .env
```
W pliku `.env` wklej swój token bota:
```env
DISCORD_BOT_TOKEN=twoj_token_bota_z_developer_portal
FIREBASE_PROJECT_ID=organizer-637f1
```

### 3. Uruchom bota
```bash
npm start
```
Gdy bot się uruchomi, zobaczysz:
```
🤖 StudyOrganizer Discord Bot zalogowany jako: StudyOrganizer#1234
📡 Połączono z serwerami: Teleinformatyka 2025/26
🌐 Health-check server nasłuchuje na porcie 3000
```
Każda nowa wiadomość na Discordzie od razu pojawi się w organizerze na telefonie i komputerze!

---

## ☁️ Darmowy Hosting 24/7 na Render.com (Zalecane)

Dzięki wbudowanemu serwerowi Express z endpointem `/health`, bot może działać **24/7 całkowicie za darmo** na [Render.com](https://render.com) (darmowy Web Service, bez podawania karty kredytowej).

### Instrukcja wdrożenia na Render.com:
1. Zaloguj się na [Render.com](https://dashboard.render.com/) za pomocą konta GitHub.
2. Kliknij **New +** $\rightarrow$ **Web Service**.
3. Połącz swoje repozytorium projektu `Organizer`.
4. Uzupełnij parametry:
   - **Name**: `studyorganizer-discord-bot`
   - **Root Directory**: `bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node index.js`
   - **Instance Type**: `Free` (0 $/miesiąc)
5. W sekcji **Environment Variables** (Zmienne środowiskowe) dodaj:
   - `DISCORD_BOT_TOKEN` = *twój token bota*
   - `FIREBASE_PROJECT_ID` = `organizer-637f1`
   - `FIREBASE_SERVICE_ACCOUNT` = *otwórz plik serviceAccountKey.json w notatniku, skopiuj całą jego zawartość i wklej tutaj jako jedną linię*
6. Kliknij **Deploy Web Service**.

Gotowe! Twój bot będzie działał w chmurze bez przerw, a każde ogłoszenie ze serwera Discord natychmiast trafi do Twojego planu zajęć.
