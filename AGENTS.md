# Instrucțiuni pentru agenți

Acest fișier se aplică întregului repository. Urmează cerințele utilizatorului și verifică implementarea înainte să descrii comportamentul aplicației.

## Context și structură

BankDesk este o aplicație demo pentru gestionarea clienților și dosarelor bancare, cu un copilot AI.

- `backend/app/`: FastAPI, SQLAlchemy, scheme Pydantic și seed-uri.
- `backend/app/routers/`: endpoint-uri REST sub `/api`.
- `backend/app/agents/orchestrator.py`: implementarea fluxului copilotului.
- `backend/tests/`: teste Python `unittest`.
- `frontend/src/pages/`: pagini React în JavaScript/JSX.
- `frontend/src/components/`: componente comune și copilot.
- `frontend/src/api/client.js`: funcțiile de acces la API.
- `frontend/src/App.jsx`: rutele React Router.

## Mod de lucru

- Citește `PROGRESS.md` și `TODO.md` pentru context; verifică informațiile în cod.
- Păstrează modificările utilizatorului și limitează intervențiile la sarcina curentă.
- Urmează stilul existent: Tailwind, temă întunecată, lucide-react și texte UI în engleză.
- Refolosește funcțiile API și componentele existente înainte să introduci dependențe.
- Include stări de încărcare, lipsă de date, eroare și salvare pentru fluxurile noi.
- Nu prezenta o verificare neexecutată drept reușită. Raportează separat build-ul, testele și verificarea în browser.

## Date și reguli financiare

- Datele demo sunt sintetice. Nu le descrie drept tranzacții sau documente reale.
- Seed-urile financiare se aplică ID-urilor demo cunoscute și nu suprascriu profiluri existente.
- Folosește `Decimal` și `Numeric` pentru noile valori monetare persistate; câmpurile vechi folosesc încă `Float`.
- `suspected` înseamnă neverificat. Păstrează statusul și nota de evidență; nu transforma automat suspiciunile în fapte sau decizii de credit.
- Totalul cheltuielilor din UI include `declared` și `confirmed`; `suspected` este afișat separat, iar `dismissed` este exclus.
- Ratele creditelor `active` și `overdue` intră în totalul plăților; creditele `paid_off` sunt excluse.
- `PUT /api/clients/{id}/financial-profile` înlocuiește profilul și listele de cheltuieli/credite. Listele omise devin goale.
- Salvarea setează `is_demo=false`; `source_kind` păstrează originea. Profilurile vechi deja editate pot avea origine `unknown`.
- Actualizarea unui profil existent cere `expected_version`: 428 dacă lipsește, 409 dacă este depășită. Păstrează editările în UI la erori.
- Nu schimba moneda unui profil existent prin relabelare; API-ul blochează operația până există un flux explicit de conversie.
- Creditele `paid_off` au sold, rată și termen rămase zero (termenul poate lipsi).
- Migrațiile ordonate sunt în `backend/app/migrations`; nu modifica o versiune deja livrată, adaugă o versiune nouă.
- Profilul financiar nu sincronizează automat venitul/datoriile vechi din `clients` și nu modifică deciziile copilotului.
- Nu șterge baza de date pentru a rezolva incompatibilități de schemă. Păstrează datele la migrare.

## Comenzi

Din rădăcina proiectului, cu mediul virtual și dependențele instalate:

```bash
# Backend; directorul curent stabilește locația SQLite implicită.
cd backend
../venv/bin/python -m uvicorn app.main:app --reload --port 8000
```

În alt terminal, din rădăcină:

```bash
cd frontend
npm run dev
```

Verificări relevante, fiecare pornită din rădăcină:

```bash
(cd backend && ../venv/bin/python -m unittest discover -s tests -v)
(cd frontend && npm run build)
(cd frontend && npm test)
(cd frontend && npm run test:e2e)
# Opțional, dacă sunt disponibile binarele PostgreSQL:
bash scripts/test-postgres.sh
git diff --check
```

Backend-ul folosește `DATABASE_URL` din mediu, implicit `sqlite:///./bankdesk.db`. Vite trimite `/api` către `http://localhost:8000`, configurabil prin `VITE_BACKEND_URL`. Nu presupune că `.env.example` este încărcat automat.

Actualizează `PROGRESS.md` când se schimbă starea implementării și `TODO.md` când finalizezi un punct sau identifici o problemă concretă. Aceste fișiere documentează proiectul; lista TODO nu autorizează automat lucrări noi.
