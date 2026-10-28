# Progres

Actualizat: 2026-10-28. Primul bloc P0 din [TODO.md](TODO.md), stabilizarea profilului financiar, este implementat și verificat. Financial Intelligence, simulatorul, remedierile și celelalte blocuri din roadmap rămân de implementat.

## Implementat

- Backend FastAPI cu clienți, dosare, documente, sarcini, istoric și endpoint-uri pentru copilot.
- Profil financiar la `/clients/:id/finances`, accesibil prin **Clients → Financial profile**: venit, familie, copii, cheltuieli și credite.
- API GET/PUT și tabele financiare cu valori `Numeric`/`Decimal`.
- Salvare și reîncărcare, liste goale, statusuri canonice `declared`, `suspected`, `confirmed`, `dismissed`; sumele suspectate sunt separate de ieșiri.
- Totaluri UI calculate în cenți; creditele `paid_off` sunt excluse, cele `active` și `overdue` sunt incluse.
- Protecție pentru editări nesalvate la sidebar, linkuri interne și Back; `beforeunload` pentru reîncărcare/închidere unde browserul permite. Navigarea este blocată și în timpul salvării.
- Erorile de salvare păstrează formularul. Reîncărcarea este explicită, cu confirmarea abandonării editărilor.
- Versiuni pentru profiluri: `expected_version` obligatoriu la actualizare (428 dacă lipsește), conflicte de versiune (409) și verificare SQLAlchemy la scriere.
- Originea `source_kind` rămâne separată de `is_demo`; un profil sintetic editat păstrează originea sintetică. Snapshot-uri înainte și după editare în `financial_profile_revisions`.
- Moneda unui profil existent nu poate fi schimbată fără un viitor flux de conversie. Profilurile noi cer alegerea explicită a monedei în UI.
- Venitul legacy nu mai este etichetat automat RON în director și nu este copiat automat într-un profil nou.
- Creditele achitate cer sold și rată zero, plus termen zero sau absent. Facilitățile active pot avea sold zero.
- Migrații ordonate în `backend/app/migrations`, cu registru `schema_migrations`: redenumire `cnp` și adăugare metadate și compatibilitate cu noile câmpuri de client/dosar, fără pierderea valorilor financiare. Câmpurile noi ale înregistrărilor vechi rămân necunoscute (NULL).
- Default-uri ORM UTC actualizate; eliminarea utilizărilor vechi din restul aplicației rămâne treptată.
- Antetul mobil afișează compact identificatorul consultantului, evitând tăierea lui pe ecrane mici.

## Verificări efectuate

- **8 teste backend pe SQLite: trecute.** Persistență, înlocuire, validare, seed idempotent, statusuri, proveniență, istoric, conflicte și migrare din schema veche.
- **Aceleași 8 teste pe PostgreSQL 16: trecute.** Instanță temporară UTF-8 și scheme izolate; fără acces la tabelele aplicației.
- **10 teste Playwright: trecute**, pe desktop 1440×1000 și mobil 390×844. Acoperă API pentru cei 33 de clienți demo, creare/editare/salvare/reîncărcare, liste goale, sidebar, Back, conflicte și erori de acces/rețea.
- **Testul de totaluri UI: trecut.** Verifică separarea suspiciunilor, excluderea creditelor achitate și adunarea în cenți.
- **Build frontend: trecut.**
- Capturile desktop/mobil au fost inspectate; testele de editare scriu artefacte în `frontend/test-results/`, fără includere în Git. Directorul este regenerat la fiecare rulare.
- Blocajul anterior pentru conexiuni locale a fost depășit prin rularea verificărilor cu accesul necesar la serverele locale.

Comenzi reproductibile în [README.md](README.md), inclusiv `npm test`, `npm run test:e2e` și `bash scripts/test-postgres.sh`.

## Date demo și limite

După migrare, baza locală are 33 clienți și profiluri, 275 cheltuieli, 8 credite și 11 cheltuieli suspectate. Migrarea a fost aplicată local și toate cele 33 de profiluri au trecut validarea. Datele sunt sintetice, iar numerele se pot schimba după editări. Testele de browser folosesc propria bază temporară.

- Profilurile nu sincronizează automat venitul/datoriile legacy și nu schimbă deciziile copilotului.
- Originea profilurilor deja editate înainte de această migrare nu poate fi reconstruită sigur și este marcată `unknown`.
- `imported` este o valoare de proveniență rezervată; un flux de import nu a fost implementat.
- Istoricul financiar nu este un audit autentificat sau protejat împotriva modificării directe în DB. Nu s-a adăugat autentificare/RBAC.
- Testul 401 verifică răspunsul UI la o sesiune respinsă, fără să presupună existența unui sistem real de sesiuni.
- Migrațiile sunt additive, fără downgrade și fără coordonare pentru startup-uri/deploy-uri simultane.
- Testele automate nu acoperă încă toate scenariile copilotului, citările, simulatorul sau remedierile.
