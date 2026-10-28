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
- **Raiffeisen AI Copilot (3-Pillar Architecture + 360° Client Executive Summary)**:
  1. `dti_repayment_capacity` — Verificarea gradului de îndatorare (DTI plafon 40%), stress-test dobândă (+2%), cashflow net disponibil după cheltuielile lunare (`declared` + `confirmed`) și ratele creditelor (`active` + `overdue`), plus semnalarea datelor lipsă/contradictorii.
  2. `unusual_transactions` — Analiza extrasului de cont pe 3 luni și a structurii cheltuielilor, cu izolarea cheltuielilor `suspected` (ex. `sports_betting`) și a notelor de evidență (`evidence_note`) pentru verificarea umană.
  3. `doc_reconciliation` — Matrice de reconciliere în 3 direcții (Documente extrase cu citări pe linie vs. Sistem/ANAF vs. Profil Financiar).
  4. `clientSummary360` — Rezumat Executiv 360° complet despre client la finalul analizei (AWS Bedrock Amazon Nova Pro + motor determinist).
  5. **Referințe și acțiuni complete în AI Copilot (`AICopilotDrawer.jsx`, `CaseDetail.jsx`, `ai_copilot.py`, `orchestrator.py`, `modular_agents.py`)**:
     - Toate citările pe documente (din pilonul 2 `salaryInflows`, matricea în 3 direcții din pilonul 3 `reconciliationMatrix`, `findings` și tab-ul `GDPR & OCR`) deschid și evidențiază linia exactă în preview-ul inline și în viewer-ul de documente al dosarului.
     - Butoanele `Validate & Apply` și `Mark as Verified by Officer` actualizează sincronizat atât `findings`, cât și `modularResults`, recalculând DTI-ul în Python și matricea de reconciliere.
     - Tab-ul `Customer Outreach` folosește un composer interactiv de **Clarification Email** (destinatar, subiect și corp editabile, trimitere/logare în Audit Trail + SMTP opțional și deschidere în aplicația de e-mail prin `mailto:`), eliminând elementele mockuite nefolosite (SMS fals, link fictiv de upload).
  6. **Arhitectură decuplată de Plugin B2B Extern (`frontend/src/plugin/`, `/plugin`, `/api/plugin/manifest`)**:
     - Plugin-ul AI este decuplat într-un modul extern vandabil B2B (`PluginContext.jsx`, `PluginIntegrationModal.jsx`, `PluginStandalonePage.jsx`).
     - Include comutator live `External AI Plugin: Connected / Disconnected (Pure CRM)` în header și în pagina de dosar pentru a demonstra `BankDesk` ca aplicație bancară clasică independentă și conectarea instantanee a plugin-ului AI.
     - Rută dedicată `/plugin` și `/plugin/:id` care deschide consola B2B standalone a plugin-ului în afara layout-ului `BankDesk`, sincronizată prin REST API cu dosarele host-ului.
     - Modal de arhitectură B2B, snippet SDK (`FinSightPlugin.mount(...)`) și contract REST API (`/api/plugin/manifest`).

## Date demo

La ultima verificare a bazei SQLite locale: **218 clienți, 218 dosare de credit, 965 documente, 188 sarcini operaționale, 374 intrări de audit, 218 profiluri financiare, 1.823 cheltuieli și 124 credite**. Acestea sunt valori sintetice, nu date bancare reale. Numerele se pot schimba după editări; nu sunt garanții pentru orice bază de date configurată.

## Verificări efectuate

- Cele 11 teste din `backend/tests/` (`test_financial_profiles.py` și `test_agentic.py`) au trecut.
- `npm run build` a trecut după actualizarea UI-ului AI Copilot și rezolvarea tuturor referințelor de la butoane.
- Endpoint-urile `/api/cases/{id}/analysis` și `/api/cases/{id}/agents/{agent_id}/run` au fost verificate live cu AWS Bedrock (`Amazon Nova Pro`).
- Toate profilurile locale au trecut validarea `FinancialProfileOut`; nu existau clienți fără profil.
- `git diff --check` a trecut după implementare.

## Limite cunoscute

- Profilurile sunt snapshot-uri independente: salvarea în `PUT /api/clients/{id}/financial-profile` nu suprascrie automat câmpurile vechi din `clients`, dar copilotul citește acum ambele surse și evidențiază eventualele diferențe.
- Schimbarea monedei în UI schimbă eticheta, fără conversia sumelor.
- Salvarea unui profil demo setează `is_demo=false`, dar nu validează proveniența datelor.
- Avertizarea pentru modificări nesalvate acoperă închiderea/reîncărcarea paginii și linkul **All clients**; alte navigări interne trebuie verificate.
- `create_all` creează tabele lipsă; nu înlocuiește un sistem general de migrare a schemei.

Pașii propuși sunt în [TODO.md](TODO.md); structura tehnică este în [ARCHITECTURE.md](ARCHITECTURE.md).
