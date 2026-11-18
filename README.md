# PWA Lab · iOS 27

Una PWA in JavaScript puro (nessuna dipendenza, nessuna build) che mostra e mette alla prova tutto ciò che il browser di iOS 27.2 permette a una web app.

## Cosa contiene

- Matrice che rileva sul dispositivo quali funzioni sono disponibili.
- Demo interattive: posizione, sensori e bussola, fotocamera, microfono e registrazione, voce, notifiche, badge, push, wake lock, condivisione, appunti, aptica, archiviazione (localStorage, IndexedDB, OPFS, Cache), file, passkey con Face ID, Web Audio, PiP, AirPlay, Media Session, GPU, WebAssembly, Apple Pay (rilevamento), offline.
- Novità di iOS 27: Static Routing API, select personalizzabile, `<model>`, cookie con `maxAge`, View Transitions.

## Pubblicazione su GitHub Pages

1. Crea un repository su GitHub (per esempio `pwa-lab`) e carica tutti i file di questa cartella nella radice.
2. Vai su **Settings → Pages**.
3. In **Build and deployment** scegli **Deploy from a branch**, branch `main`, cartella `/ (root)`, poi **Save**.
4. Dopo circa un minuto il sito è su `https://TUO-UTENTE.github.io/pwa-lab/`.

Da riga di comando:

```bash
git init
git add .
git commit -m "PWA Lab"
git branch -M main
git remote add origin https://github.com/TUO-UTENTE/pwa-lab.git
git push -u origin main
```

Tutti i percorsi sono relativi, quindi funziona sia in un sottopercorso (`/pwa-lab/`) sia su un dominio personalizzato.

## Installazione su iPhone

1. Apri l'indirizzo in **Safari**.
2. Tocca **Condividi → Aggiungi alla schermata Home**.
3. Lascia attivo **Apri come web app** e tocca **Aggiungi**.
4. Apri l'icona dalla Home: notifiche, badge e wake lock funzionano solo così.

## Note

- Serve HTTPS (GitHub Pages lo fornisce). Per provare in locale usa `localhost`.
- Le notifiche push remote richiedono un tuo server e una coppia di chiavi VAPID; l'app mostra la sottoscrizione da inviare al server.
- Dopo una modifica ai file aumenta `VERSION` in `sw.js`, altrimenti l'app installata può continuare a mostrare la versione in cache.
- Le passkey sono legate al dominio: cambiando dominio vanno ricreate.
