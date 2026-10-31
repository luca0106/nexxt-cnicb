# Pași următori

Listă de lucrări propuse, nu implementate. Starea curentă este în [PROGRESS.md](PROGRESS.md).

## Verificarea fluxului financiar

- [ ] Verificare în browser pe desktop și mobil: **Clients → Financial profile**.
- [ ] Verificare completă: creare profil pentru client nou, salvare, reîncărcare și păstrarea valorilor.
- [ ] Verificare adăugare/ștergere cheltuieli și credite, inclusiv salvarea listelor goale.
- [ ] Verificare statusuri `suspected`, `confirmed`, `dismissed` și efectul lor asupra totalurilor.
- [ ] Verificare răspunsuri pentru erori API, deconectare și valori invalide.
- [ ] Verificare protecție pentru modificările nesalvate la navigarea prin sidebar și browser Back.
- [ ] Rulare integrare HTTP într-un mediu care permite conexiuni locale.
- [ ] Rulare verificări pe PostgreSQL, inclusiv compatibilitatea migrării `cnp` → `national_id`.

## Îmbunătățiri de date și comportament

- [ ] Clarificarea regulii de sincronizare între profilul financiar și venitul/datoriile din dosarul existent.
- [ ] Separarea provenienței sintetice de indicatorul „editat de utilizator”; `is_demo` pierde informația inițială după PUT.
- [ ] Revizuirea etichetelor valutare din directorul de clienți, unde venitul vechi este afișat în RON, în timp ce profilurile demo folosesc EUR.
- [ ] Definirea regulilor de consistență pentru credite achitate, solduri și rate înainte de a adăuga validări între câmpuri.
- [ ] Stabilirea unui flux explicit pentru modificarea monedei și eventuala conversie.
- [ ] Migrații versionate pentru viitoarele schimbări ale schemei.

## Agentic RAG (Ask Copilot)

- [x] Verificare în browser a tab-ului **Ask Copilot**: întrebare și citare deschisă la linia exactă (desktop, 2026-10-29).
- [ ] Verificare în browser: starea de eroare cu backend-ul oprit și afișarea pe mobil.
- [ ] Decizie: persistarea conversațiilor și logarea întrebărilor în Audit Trail.
- [ ] Evaluare retrieval semantic (embeddings) față de BM25 pe întrebări reale ale ofițerilor.
- [ ] Streaming al pașilor agentului; un răspuns durează acum ~20-30 s.

## Calitate

- [x] Traducerea textelor demo rămase în română și a răspunsurilor copilotului, inclusiv citările din analizele existente (2026-10-31).

- [ ] Teste UI pentru totaluri și pentru salvare/reîncărcare, când este disponibil un mediu de browser.
- [ ] Înlocuirea treptată a `datetime.utcnow()` pentru eliminarea avertismentelor de depreciere.
