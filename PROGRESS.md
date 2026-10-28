# Progres

Actualizat: 2026-10-28. Starea documentată reflectă implementarea existentă și verificările din sesiunea de dezvoltare.

## Implementat

- Backend FastAPI cu clienți, dosare, documente, sarcini, istoric și endpoint-uri pentru copilot.
- Frontend React cu director de clienți și pagină financiară la `/clients/:id/finances`, accesibilă prin **Clients → Financial profile**.
- Tabelele `financial_profiles`, `client_expenses`, `client_credits` pentru salariu, venit suplimentar, monedă, situație familială, copii, cheltuieli și credite.
- Citire și înlocuire profil prin `GET` și `PUT /api/clients/{id}/financial-profile`.
- UI pentru adăugare/ștergere cheltuieli și credite, note de evidență, statusuri de verificare și feedback de salvare.
- Carduri cu venit lunar, ieșiri lunare, soldul creditelor și cheltuieli suspectate afișate separat.
- Seed determinist pentru clienții demo, fără suprascrierea profilurilor existente.
- Compatibilitate cu vechiul câmp `clients.cnp`, redenumit `national_id` la inițializare.

## Date demo

La ultima verificare a bazei SQLite locale: **33 clienți, 33 profiluri financiare, 275 cheltuieli, 8 credite și 11 cheltuieli suspectate**. Acestea sunt valori sintetice, nu date bancare reale. Numerele se pot schimba după editări; nu sunt garanții pentru orice bază de date configurată.

## Verificări efectuate

- Cele 4 teste din `backend/tests/test_financial_profiles.py` au trecut: persistență și înlocuire, validare, idempotenta seed-ului și consistența profilurilor generate.
- `npm run build` a trecut după adăugarea UI-ului.
- Toate profilurile locale au trecut validarea `FinancialProfileOut`; nu existau clienți fără profil.
- `git diff --check` a trecut după implementare.
- Testul HTTP local dintre funcțiile frontend și backend nu a putut fi finalizat: mediul a respins conexiunea la localhost cu `EPERM`.
- Verificarea vizuală într-un browser și testarea PostgreSQL nu au fost efectuate în această sesiune.

## Limite cunoscute

- Profilurile sunt snapshot-uri independente: câmpurile vechi de venit/datorii și analiza AI nu se actualizează automat.
- Schimbarea monedei în UI schimbă eticheta, fără conversia sumelor.
- Salvarea unui profil demo setează `is_demo=false`, dar nu validează proveniența datelor.
- Avertizarea pentru modificări nesalvate acoperă închiderea/reîncărcarea paginii și linkul **All clients**; alte navigări interne trebuie verificate.
- `create_all` creează tabele lipsă; nu înlocuiește un sistem general de migrare a schemei.

Pașii propuși sunt în [TODO.md](TODO.md); structura tehnică este în [ARCHITECTURE.md](ARCHITECTURE.md).
