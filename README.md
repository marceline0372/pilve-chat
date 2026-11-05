# PaaS Chat Rakendus (Redis + Firebase)

See projekt on loodud kursuse **Pilverakendused** raames. Rakendus demonstreerib mikroteenuste ja asünkroonse sõnumijärjekorra arhitektuuri PaaS teenuste abil.

## Arhitektuur

1. **Client / Web Server (`server.js`)**:
   - Express server, mis serveerib staatilist veebiliidest.
   - Pakub REST API otspunkti `POST /api/send`.
   - Salvestab uued sõnumid Redis järjekorda (`chat_queue`).
2. **Sõnumijärjekord (Redis)**:
   - Toimib vahepuhvrina (PaaS: Upstash või Redis Cloud).
3. **Reader Worker (`reader.js`)**:
   - Eraldiseisev taustaprotsess.
   - Loob ühenduse Redisega ja loeb reaalajas sõnumeid (`BLPOP`).
   - Kirjutab valideeritud sõnumid Firebase Realtime Database'i.
4. **Firebase Realtime Database**:
   - Püsiv pilveandmebaas.
   - Kliendid kuulavad otse Firebase sündmusi (`child_added`), et kuvada sõnumeid reaalajas.

---

## 5 Parandatud viga (5 Git Commit'i)

Selle projekti jaoks on ette valmistatud 5 reaalset viga/parandust, mida saad lisada oma Git ajalukku:

### Commit 1: Fix XSS vulnerability in client chat rendering
- **Viga:** Kasutaja sisend (`item.text`, `item.username`) lisati otse DOM-i läbi `innerHTML`, mis lubas käivitada pahaloomulist skripti (`<script>`, `<img onerror=...>`).
- **Parandus:** Lisati funktsioon `escapeHtml()`, mis neutraliseerib ohtlikud HTML sümbolid enne renderdamist.

### Commit 2: Fix unhandled Redis disconnection crash in Reader worker
- **Viga:** Kui Redis ühendus ajutiselt katkes, jooksis `reader.js` kontrollimatult kokku (`UnhandledPromiseRejection`).
- **Parandus:** Lisati `try-catch` ümbris ja automaatne taastumisaeg (backoff delay 1s) enne uut katset `while(true)` tsüklis.

### Commit 3: Fix lack of payload validation on API endpoint
- **Viga:** Saatmisel võeti vastu tühjad sõnumid või tühikud (`"   "`), risustades järjekorda ja andmebaasi.
- **Parandus:** Serveris `server.js` lisati range sisendi kontroll (`.trim()` ja 400 Bad Request tagastus tühja sisu puhul).

### Commit 4: Fix hardcoded credentials security issue using dotenv
- **Viga:** Redis ja Firebase ühenduse andmed olid koodis 'hardcoded', mis tekitas turvariski GitHubi laadimisel.
- **Parandus:** Kõik saladused viidi `.env` faili ning lisati `.gitignore` ja `.env.example`.

### Commit 5: Fix timestamp desynchronization across client devices
- **Viga:** Ajamärk määrati brauseri kella järgi, tekitades valet ajajärjestust eri ajavööndites.
- **Parandus:** Sõnumi ajatempel määratakse nüüd serveri poolel (`Date.now()`) enne Redis järjekorda saatmist.

---

## Käivitamine

```bash
# 1. Paigalda sõltuvused
npm install

# 2. Seadista .env fail (.env.example põhjal)
cp .env.example .env

# 3. Käivita veebiserver
npm start

# 4. Teises terminalis käivita Reader taustaprotsess
npm run reader
```
