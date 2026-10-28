# BankDesk & Raiffeisen AI Copilot — Triage & Audit

Aplicație fullstack (Backend FastAPI, Frontend React + Tailwind CSS, Bază de Date PostgreSQL/SQLite, Docker) construită pentru **Raiffeisen Bank Hackathon — Operational Efficiency**.

Proiectul îmbină:
1. **Aplicația-gazdă `BankDesk`**: Sistemul bancar intern în care lucrează ofițerul de credite (*Consultant 024*) — Dashboard identic cu macheta oficială, gestiune clienți, fișă de verificare manuală (Data Entry), vizualizator de documente numerotat pe rânduri, sarcini și jurnal de audit.
2. **Extensia Multi-Agentică `Raiffeisen AI Copilot (Triage & Audit)`**: Un panou lateral (Drawer stil extensie de browser) care se deschide peste pagina oricărui dosar din `BankDesk`, orchestrând o echipă de agenți AI în cascadă și în paralel pentru a reduce timpul de verificare a unui dosar de la **45 de minute la ~3 secunde**.

---

## 🤖 Arhitectura Multi-Agentică (Raiffeisen AI Copilot)

Când ofițerul de credite deschide un dosar și apasă **„Run AI Review”** în extensia Copilot, orchestratorul (`backend/app/agents/orchestrator.py`) execută următoarele etape:

1. **Scutul de Anonimizare PII (`PII Anonymization Shield — GDPR`)**:
   - Pseudonimizează datele cu caracter personal (`CNP`, `Serie/Nr. CI`, `IBAN`, `Telefon`, `Email`) înainte de analiza LLM și le re-hidratează exclusiv în interfața securizată a ofițerului bancar.
2. **Execuție în Paralel (`Extractor Agent` $\parallel$ `Policy Agent`)**:
   - **Agentul 1 — Extractor (OCR & Data Structuring)**: Citește documentele atașate și extrage câmpurile într-o schemă JSON strictă, reținând **documentul-sursă, numărul exact al rândului (`Rândul X`) și citatul exact**.
   - **Agentul 2A — Policy Agent (Norme BNR & Proceduri Interne)**: Caută în setul de proceduri bancare regulile aplicabile (`PROC-KYC-01`, `PROC-DOC-02`, `PROC-INC-03`, `NORMA-BNR-DTI-04`).
3. **Agentul 2B — Investigator (Cross-Checker) + Motor Matematic Determinist Python**:
   - **Cross-Checking cu Explicabilitate 100% (Audit Trail)**: Compară datele între documente și generează **Red Flags** (alerte/discrepanțe) și **Green Flags** (validări). Fiecare constatare are citări clickabile care evidențiază rândul exact în documentul din stânga.
   - **Calcul Matematic Separat în Python (`calculate_feasibility_math`)**: Rata lunară (formula anuității) și **Gradul de Îndatorare (plafon maxim 40% BNR)** sunt calculate 100% determinist în Python standard, eliminând riscul de halucinație al LLM-urilor pe calcule financiare.
4. **Agentul 3 — Agentul de Remedieri & Workflow (`Automation & Human-in-the-Loop`)**:
   - În cazul unor blocaje critice (ex: *Carte de Identitate expirată* sau discrepanțe între acte), formulează și trimite automat un **SMS și Email către client** cu un link securizat de reîncărcare.
   - Pregătește **Checklist-ul final pentru ofițer (Human-in-the-Loop)**: AI-ul nu ia decizii bancare finale, ci pregătește dosarul, iar ofițerul confirmă constatările, selectează valoarea validată (cu recalculare instantanee a DTI-ului) și apasă *Aprobă*, *Solicită Clarificări* sau *Respinge*.

---

## 🎯 Cele 3 Scenarii de Demo Pre-configurate (Pe Dashboard)

| Dosar | Titlu & Status | Scenariu Demonstrativ pentru Juriu |
| :--- | :--- | :--- |
| **Dosar #10482** | *Cerere de credit* (`În verificare`) | **Scenariul 1 — Discrepanțe Cross-Check**:<br>• **Venit diferit**: `5.200 RON` în Cererea de credit (*Rândul 8*) vs `5.700 RON` în Adeverința de venit (*Rândul 9*) și Extrasul de cont (*Rândul 8*).<br>• **Nume diferit**: `Ion Popescu` în CI (*Rândul 4*) vs `Ioan Popescu` în Adeverința de venit (*Rândul 4*).<br>• Ofițerul poate da click pe citate pentru evidențierea rândului în document și poate selecta valoarea validată (`5.700 RON`), recalculând instantaneu DTI-ul în Python (`17.92%` $\rightarrow$ `16.35%`). |
| **Dosar #10475** | *Deschidere cont* (`În așteptare`) | **Scenariul 2 — Edge Case Critică (Buletin Expirat)**:<br>• Cartea de identitate atașată a expirat la `10.02.2026` (*Rândul 7*), iar adresa de pe factura de utilități diferă de cea din CI.<br>• **Agentul de Remedieri** intervine automat la triaj și generează **SMS + Email cu link securizat de reîncărcare** către clientul *Mihai Dumitrescu*. |
| **Dosar #10479** | *Actualizare date client* (`Complet`) | **Scenariul 3 — Dosar 100% Valid (Green Flags)**:<br>• Toate documentele corespund 100% (*Elena Radu*, venit `6.800 RON`, CI valabil, DTI `17.83%` < `40%` BNR), gata de aprobare rapidă. |

---

## ⚡ Pornire Rapidă

### Varianta A — Cu Docker Compose
```bash
docker compose up --build
```
- **Frontend Web**: [http://localhost:3001](http://localhost:3001)
- **Backend API & Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

### Varianta B — Rulare Locală Directă (Development)
1. **Pornire Backend (FastAPI)**:
   ```bash
   cd backend
   python -m uvicorn app.main:app --reload --port 8000
   ```
2. **Pornire Frontend (Vite + React)**:
   ```bash
   cd frontend
   npm run dev
   ```
   Aplicația va fi disponibilă la [http://localhost:5173](http://localhost:5173).

---

## 🔌 Contract API Multi-Agent (Conform Specificației PDF)

- `POST /api/cases/{caseId}/analysis` — Pornește orchestratorul multi-agentic pe documentele dosarului.
- `GET /api/analyses/{analysisId}` — Returnează raportul complet (`findings`, `feasibilityMath`, `remediation`, `piiMasking`, `executionTrace`).
- `PATCH /api/analyses/{analysisId}/findings/{findingId}` — Revizuire umană pe constatare (confirmare sau selectarea valorii corecte cu recalculare automată DTI în Python).
- `POST /api/analyses/{analysisId}/remediation/send` — Trimite notificarea automată SMS & Email cu link securizat către client.
- `POST /api/analyses/{analysisId}/human-decision` — Înregistrează decizia finală a ofițerului (*Approve*, *Request Clarification*, *Reject*) în Audit Trail.
