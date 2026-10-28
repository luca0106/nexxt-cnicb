Pași următori — BankDesk & Raiffeisen AI Copilot
TODO / roadmap, nu raport de implementare. Elementele nebifate sunt propuse sau necesită reverificare. Starea reală a proiectului rămâne în [PROGRESS.md](PROGRESS.md).

Priorități: P0 = înainte de demo (MVP); P1 = diferențiatori de hackathon; P2 = robustețe și integrare ulterioară. Bifarea se face numai după implementare și verificarea criteriilor de acceptare.

P0 — 1. Stabilizarea fluxului financiar existent
- [x] Testare în browser, desktop și mobil: Clients → Financial profile (afișare, editare, salvare).
- [x] Test end-to-end: creare profil pentru client nou → salvare → reîncărcare → valori persistente.
- [x] Verificare adăugare/ștergere de cheltuieli și credite, inclusiv salvarea listelor goale.
- [x] Alinierea stărilor reale din API/DB/UI (declared, suspected, confirmed/verified, dismissed); definirea unei singure convenții și a regulilor pentru fiecare total.
- [x] Tratarea erorilor API, a sesiunii expirate/deconectării, a datelor invalide și a cererilor concurente.
- [x] Avertizare pentru modificări nesalvate la navigarea prin sidebar, browser Back și închiderea paginii, unde este posibil.
- [x] Rularea testelor HTTP într-un mediu care permite conexiuni locale.
- [x] Verificare pe PostgreSQL, inclusiv migrarea compatibilă cnp → national_id.
- [x] Separarea provenienței datelor (synthetic/user_supplied/imported) de is_demo și de istoricul editărilor.
- [x] Corectarea etichetelor de monedă: veniturile legacy în RON vs. profilurile demo în EUR; fără conversii implicite.
- [x] Stabilirea regulilor pentru împrumuturi stinse, sold rămas, rată lunară și status active/closed.
- [x] Definirea schimbării monedei: conversie explicită, rată de schimb datată și proveniență documentată sau blocarea operației.
- [x] Introducerea migrațiilor versionate (de ex. Alembic) pentru modificările următoare.
Acceptare: profilul celor 33 de clienți demo se poate citi fără a altera datele existente; un PUT urmat de GET returnează aceleași valori financiare; stările neverificate nu sunt prezentate ca fapte confirmate.

Verificat 2026-10-28: 8 teste backend pe SQLite și aceleași 8 pe PostgreSQL; 10 teste Playwright desktop/mobil; test de totaluri în cenți și build frontend. Starea canonică este `confirmed`, iar creditele stinse folosesc `paid_off`. Răspunsul 401 este simulat pentru verificarea UI; autentificarea/RBAC nu sunt implementate de acest bloc. Originea vechilor profiluri deja editate este `unknown`. Migrațiile sunt ordonate și additive, fără mecanism de downgrade sau coordonarea deploy-urilor simultane.

P0 — 2. Financial Intelligence Engine (primul feature nou)
Backend și date
- [ ] Legarea dosarului de financial_profiles, client_expenses și client_credits prin client ID, fără suprascrierea automată a câmpurilor legacy.
- [ ] Serviciu backend/app/services/financial_intelligence.py pentru calcule deterministe cu Decimal, în moneda comună validată.
- [ ] Separarea veniturilor eligibile confirmate, ratelor existente active, ratei propuse și cheltuielilor de trai; prevenirea dublei numărări.
- [ ] Calcul DTI total = (rate existente eligibile + rată nouă) / venit eligibil × 100; calcul separat al venitului disponibil după cheltuieli.
- [ ] Evidențierea sumelor suspected ca neconfirmate, fără includerea lor automată în deciziile de credit; excluderea sumelor dismissed.
- [ ] Păstrarea sursei, datei, statusului de verificare și versiunii pentru fiecare valoare; confirmarea explicită de către consultant.
- [ ] Adăugare GET /api/cases/{caseId}/financial-intelligence și POST /api/cases/{caseId}/financial-context/confirm (numele finale se aliniază cu API-ul existent).
Frontend
- [ ] Tab/card Financial Intelligence în Copilot: venit verificat, rate active, cheltuieli, obligația nouă, DTI total și disponibil lunar.
- [ ] Click dintr-o valoare sau observație → document/linie ori profil financiar sursă; indicator clar pentru valori neconfirmate.
- [ ] Confirmare/revizuire cifre de către consultant, cu recalculare instantanee și audit event.
Acceptare: pentru #10482, alegerea venitului validat de 5.700 RON actualizează calculele; noul DTI total include explicit și ratele existente, dacă acestea există. Valorile din demo-ul inițial (17,92% → 16,35%) rămân valabile doar pentru formula și ipotezele scenariului inițial.
P0 — 3. What-If Loan Simulator
- [ ] Reutilizarea funcției Python calculate_feasibility_math; fără calcule financiare efectuate de LLM.
- [ ] Endpoint POST /api/cases/{caseId}/simulate-loan pentru sumă, perioadă, dobândă, venit eligibil și datorii existente (cu validare server-side).
- [ ] Calcul rată anuitate, DTI și venit disponibil, plus mesaje explicative pentru ipoteze și valori lipsă.
- [ ] Componenta React ScenarioLab: sliders pentru sumă, durată, dobândă, venit și comparare Original vs. Simulated.
- [ ] Scenariile simulate nu modifică cererea reală; aplicarea unei modificări cere acțiune explicită, permisiuni și audit.
- [ ] Etichetarea simulării ca estimativă: dobândă fixă presupusă, fără comisioane/asigurări dacă nu sunt modelate.
Acceptare: modificarea oricărui parametru actualizează rezultatele fără a salva automat dosarul; calculul frontend este reconciliat cu rezultatul determinist al backend-ului.
P0 — 4. AI Case Resolution / Remediation end-to-end
- [ ] Model remediation_requests: case_id, finding_id, status, token_hash, expires_at, sent_at, resolved_at, actor și audit metadata.
- [ ] Flux: finding critic → draft SMS/email → aprobare consultant → trimitere simulată sau reală controlată → upload → revalidare document → review uman.
- [ ] Endpoint-uri propuse: POST /api/remediations/{id}/approve-send, POST /api/remediations/{id}/upload, GET /api/remediations/{id}/status.
- [ ] Link de upload cu token unic, expirat, cu utilizare limitată; verificări de tip/dimensiune fișier, autorizare și acces minim necesar.
- [ ] Mod Demo / Dry-run care arată mesajele și schimbarea statusurilor fără a trimite SMS/email către persoane reale.
- [ ] Re-rularea verificărilor relevante după upload; blockerul se marchează resolved doar după validarea corespunzătoare și rămâne vizibil consultantului.
Acceptare: cazul #10475 demonstrează complet traseul „ID expirat → solicitare aprobată → document încărcat → reverificare → confirmare consultant”, fără aprobare automată a creditului.
P1 — 5. Smart Case Queue și Document Completeness
- [ ] Serviciu case_prioritization.py și GET /api/cases/triage-queue cu prioritate operațională explicabilă: blocaje, termene, documente lipsă, dependențe externe.
- [ ] Dashboard AI Recommended Queue cu explicația priorității și filtre; cazurile finalizate se separă de coada activă.
- [ ] Matrice configurabilă de documente necesare pentru fiecare tip de produs/caz.
- [ ] Checklist dinamic pentru documente lipsă, expirate sau ilizibile, cu trimiteri către surse.
- [ ] Niciun scor de prioritate operațională nu este prezentat ca scor de bonitate sau folosit pentru decizia de credit.
Acceptare: #10475 afișează blocker documentar, #10482 apare cu discrepanțe de verificat, #10479 rămâne Completed.
P1 — 6. Policy & Compliance Engine versionat
- [ ] Mutarea regulilor din cod hardcodat în politici versionate, cu interval de valabilitate, produs, monedă, excepții și sursă normativă.
- [ ] Selectarea versiunii politicii valabile la data evaluării și stocarea ei în analiză.
- [ ] Aplicarea pragurilor DTI potrivit produsului și circumstanțelor, nu a unei limite universale hardcodate de 40%.
- [ ] Afișarea pentru fiecare finding a regulii exacte, a sursei și a motivului pentru care se aplică.
- [ ] Verificarea reglementărilor aplicabile cu un responsabil de compliance înainte de utilizare reală.
Acceptare: aceeași analiză poate fi reprodusă ulterior cu versiunea de politică salvată; o modificare ulterioară a regulilor nu schimbă retroactiv istoricul.
P1 — 7. AI Audit Timeline și Operational Efficiency Dashboard
- [ ] Timeline append-only: extragere AI, citări, versiune model/prompt, regulă aplicată, intervenție umană, valori confirmate și remedieri.
- [ ] Istoric de modificări și acces bazat pe roluri; jurnalul nu expune PII inutile.
- [ ] Indicatori: timp total/etapă, timp AI, timp consultant, cazuri cu blocaje, rata sugestiilor acceptate și intervențiile manuale.
- [ ] Benchmark reproductibil pentru cele 3 cazuri demo; separarea timpului de triage AI de timpul de finalizare a dosarului.
- [ ] Fără afirmații „3 secunde garantat” sau „100% accuracy” înainte de măsurători și teste.
Acceptare: un membru al juriului poate urmări o observație până la document, regulă, calcul și acțiunea consultantului; dashboard-ul arată măsurători reale sau marcate explicit ca demo.
P2 — 8. Securitate, integrare și robustețe
- [ ] Contracte API stabile și documentate OpenAPI pentru integrarea ca sidecar în LOS/CRM.
- [ ] Autorizare server-side pe client/dosar, RBAC pentru acțiuni și protecție la acces între clienți.
- [ ] Teste de pseudonimizare/restaurare PII, inclusiv loguri, citări, erori și date trimise către LLM.
- [ ] Idempotency pentru rulări AI, confirmări, upload-uri și expedierea notificărilor; protecție la retry/dublă trimitere.
- [ ] Limite de dimensiune/tip fișier, scanare anti-malware, retenție documente și managementul secretelor.
- [ ] Moduri Copilot 50/50 Split View și Expanded, accesibilitate tastatură și responsive.
- [ ] Observabilitate: request IDs, metrici de latență, erori și costuri per analiză, fără date sensibile în loguri.
QA — Testare automată și validare finală
- [ ] Teste unitare pentru anuități, Decimal, DTI, zero venit, rate active, monede diferite, valori suspectate și credite închise.
- [ ] Teste de integrare API pentru profil, confirmări, simulator, triage, remediation și audit.
- [ ] Teste UI pentru totaluri, salvare/reîncărcare, guard de modificări nesalvate, citări click-to-highlight și responsive.
- [x] Teste PostgreSQL + SQLite și migrații versionate; seed idempotent pentru cei 33 de clienți demo.
- [ ] Teste de acces neautorizat, sesiuni expirate și încărcări invalide/malițioase.
- [ ] Înlocuirea treptată a datetime.utcnow() cu datetimes UTC timezone-aware.
- [ ] Rulare completă a scenariilor #10482, #10475 și #10479, cu capturi și metrici de demo.
- [x] Actualizarea PROGRESS.md pentru blocul P0 — 1; se continuă la fiecare bloc următor.
Ordinea recomandată pentru demo
1. Stabilizează profilul financiar și statusurile/proveniența/monedele.
2. Integrează Financial Intelligence în dosar și afișează calculele cu surse.
3. Adaugă What-If Simulator cu comparație imediată și fără modificări automate.
4. Închide bucla de Remediation pe cazul #10475, în modul dry-run.
5. Adaugă Smart Queue + Document Completeness pentru vizibilitate operațională.
6. Instrumentează Audit & Metrics, apoi măsoară timpul real de triere.
7. Extinde politica versionată și hardening-ul înainte de orice utilizare în producție.
