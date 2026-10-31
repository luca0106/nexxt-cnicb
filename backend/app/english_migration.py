"""Translate known legacy demo copy without changing financial or identity data."""
import json
import re

from sqlalchemy import select

from .models import AIAnalysis, AuditLog, Case, Document, Task


TRANSLATIONS = {
    'Dosar depus online. Documente justificative atașate. Necesită cross-check între formularul de cerere, adeverința de venit, CI și extrasul de cont.':
        'Case submitted online with supporting documents attached. Cross-check the application form, income certificate, ID card and bank statement.',
    'Toate documentele corespund 100%. Identitate, adresă și venituri confirmate fără discrepanțe. Grad de îndatorare în limitele BNR.':
        'All documents match 100%. Identity, address and income confirmed without discrepancies. Debt-to-income ratio within NBR limits.',
    'Blocaj identificat pe documentele de identitate: Carte de Identitate expirată și neconcordanță adresă pe factura de utilități.':
        'Identity document blocker: expired ID card and an address discrepancy on the utility bill.',
    'Documentație completă, în așteptarea verificării de conformitate.':
        'Complete documentation pending compliance review.',
    'Dosar în lucru pentru ': 'Case in progress for ',
    'Verificare discrepanță venit (5.200 RON în cerere vs 5.700 RON în adeverință)':
        'Verify income discrepancy (5.200 RON in application vs 5.700 RON in certificate)',
    "Clarificare neconcordanță prenume ('Ion' în CI vs 'Ioan' în adeverința de venit)":
        "Clarify first-name discrepancy ('Ion' on ID card vs 'Ioan' on income certificate)",
    'Așteptare reîncărcare Carte de Identitate valabilă de la clientul ': 'Await valid ID card re-upload from client ',
    'Conturi & Plăți': 'Accounts & Payments',
    'Operațiuni Clienți': 'Client Operations',
    'Credite Retail': 'Retail Lending',
    'Agenția Unirii București': 'Unirii Branch, Bucharest',
    'Fixă': 'Fixed',
    'Variabilă': 'Variable',
    'Alocare ofițer credite': 'Loan Officer Assignment',
    'Triaj inițial documente': 'Initial Document Triage',
    'Validare completă dosar': 'Full Case Validation',
    'Înregistrare dosar credit': 'Loan Case Registration',
    'Sistem Distribuție Automată': 'Automatic Assignment System',
    'Documente încărcate pentru deschidere cont și linie overdraft.': 'Documents uploaded for account opening and overdraft facility.',
    'Dosar alocat către Consultant 024 (Departament Credite Retail).': 'Case assigned to Consultant 024 (Retail Lending Department).',
    'Dosarul #10482 a fost creat și 4 documente justificative au fost atașate.': 'Case #10482 created with 4 supporting documents attached.',
    'Toate documentele și criteriile de eligibilitate au fost verificate cu succes.': 'All documents and eligibility criteria successfully verified.',
    'FORMULAR CERERE DE CREDIT NEVOI PERSONALE': 'PERSONAL LOAN APPLICATION FORM',
    'FORMULAR ACTUALIZARE DATE & PLAFON CREDIT': 'DATA UPDATE & CREDIT LIMIT FORM',
    'CERERE DESCHIDERE CONT CURENT PREMIUM & LINIE OVERDRAFT': 'PREMIUM CURRENT ACCOUNT & OVERDRAFT APPLICATION',
    'FORMULAR OPERAȚIUNE BANCARĂ': 'BANKING OPERATION FORM',
    'CERERE DE CREDIT': 'LOAN APPLICATION',
    'ADEVERINȚĂ DE VENIT NR.': 'INCOME CERTIFICATE NO.',
    'EXTRAS DE CONT BANCAR - PERIOADA': 'BANK STATEMENT - PERIOD',
    'ROMÂNIA - CARTE DE IDENTITATE (DOCUMENT SCANAT OCR)': 'ROMANIA - IDENTITY CARD (OCR SCANNED DOCUMENT)',
    'ROMÂNIA - CARTE DE IDENTITATE': 'ROMANIA - IDENTITY CARD',
    'FACTURĂ ENERGIE ELECTRICĂ - OCTOMBRIE': 'ELECTRICITY BILL - OCTOBER',
    'Număr înregistrare dosar:': 'Case registration number:',
    'Data depunerii:': 'Submission date:',
    'Nume și prenume solicitant:': 'Applicant full name:',
    'Cod Numeric Personal (CNP):': 'National Identification Number (CNP):',
    'Adresă domiciliu declarat:': 'Declared residential address:',
    'Angajator declarat:': 'Declared employer:',
    'Funcție: Inginer Software': 'Position: Software Engineer',
    'Venit lunar net declarat de solicitant:': 'Net monthly income declared by applicant:',
    'Suma solicitată:': 'Requested amount:',
    'Perioada de creditare:': 'Loan term:',
    'Alte rate sau obligații lunare declarate:': 'Other declared monthly installments or obligations:',
    'Semnătură electronică calificată: VALIDĂ': 'Qualified electronic signature: VALID',
    'Emisă de': 'Issued by',
    'Se adeverește prin prezenta că domnul ': 'This is to certify that Mr. ',
    'având CNP ': 'with CNP ',
    ', domiciliat în ': ', residing at ',
    'este angajat cu contract individual de muncă pe perioadă nedeterminată.': 'is employed under a permanent individual employment contract.',
    'Venituri salariale nete încasate în ultimele 3 luni:': 'Net salary income received in the last 3 months:',
    'Iulie': 'July',
    'Septembrie': 'September',
    'Venit lunar net mediu realizat:': 'Average net monthly income:',
    'Salariatul nu înregistrează popriri sau rețineri salariale.': 'The employee has no wage garnishments or salary deductions.',
    'Titular cont:': 'Account holder:',
    'Cont IBAN:': 'IBAN account:',
    'Monedă:': 'Currency:',
    'Încasare salariu ': 'Salary payment ',
    'Media încasărilor salariale lunare:': 'Average monthly salary payments:',
    'Debite automate alte credite / popriri:': 'Direct debits for other loans / garnishments:',
    'Sold final disponibil la ': 'Closing available balance as of ',
    'Seria ': 'Series ',
    ' Nr. ': ' No. ',
    'Nume:': 'Last name:',
    'Prenume:': 'First name:',
    'Loc naștere:': 'Place of birth:',
    'Domiciliu:': 'Residence:',
    'Valabilitate:': 'Validity:',
    'Număr dosar:': 'Case number:',
    'Data:': 'Date:',
    'Adresă domiciliu:': 'Residential address:',
    'Angajator:': 'Employer:',
    'Venit lunar net declarat:': 'Declared net monthly income:',
    'Obligații lunare existente (card cumpărături):': 'Existing monthly obligations (credit card):',
    'Plafon solicitat:': 'Requested limit:',
    ' RON pe ': ' RON over ',
    'Salariat:': 'Employee:',
    'Venit lunar net confirmat:': 'Confirmed net monthly income:',
    'Contract pe perioadă nedeterminată, fără popriri.': 'Permanent employment contract, no garnishments.',
    'Solicitant:': 'Applicant:',
    'Adresă declarată:': 'Declared address:',
    'Venit lunar net:': 'Net monthly income:',
    'Plafon Overdraft solicitat:': 'Requested overdraft limit:',
    'Data emiterii:': 'Issue date:',
    '[DOCUMENT EXPIRAT]': '[DOCUMENT EXPIRED]',
    'Titular contract:': 'Contract holder:',
    'Cod client:': 'Client code:',
    'Adresă corespondență și loc de consum:': 'Correspondence and service address:',
    'Total de plată:': 'Total amount due:',
    'Adresă:': 'Address:',
    'Titular:': 'Holder:',
    'Valabilitate CI:': 'ID card validity:',
    'Dosar operațional #': 'Operational Case #',
    'Cerere de credit': 'Loan Application',
    'Formular cerere': 'Application Form',
    'Adeverință venit': 'Income Certificate',
    'Copie CI': 'ID Card Copy',
    'Extras financiar': 'Bank Statement',
    'Factură utilități': 'Utility Bill',
}
_PATTERN = re.compile('|'.join(re.escape(s) for s in sorted(TRANSLATIONS, key=len, reverse=True)))


def translate_text(value):
    value = _PATTERN.sub(lambda match: TRANSLATIONS[match.group()], value)
    value = re.sub(r'\bRândul (?=\d+:)', 'Line ', value)
    return re.sub(r'(?<=\d) luni\b', ' months', value)


def translate_payload(value):
    """Keep JSON keys, IDs, filenames, names and numeric values unchanged."""
    if isinstance(value, str):
        return translate_text(value)
    if isinstance(value, list):
        return [translate_payload(item) for item in value]
    if isinstance(value, dict):
        return {key: translate_payload(item) for key, item in value.items()}
    return value


def translate_legacy_copy(connection):
    fields = {
        Case: ('department', 'branch', 'interest_type', 'notes'),
        Document: ('content_text',),
        Task: ('title',),
        AuditLog: ('action', 'performed_by', 'details'),
        AIAnalysis: ('summary', 'pii_masking_json', 'extracted_fields_json', 'policy_rules_json',
                     'findings_json', 'feasibility_math_json', 'remediation_json',
                     'workflow_checklist_json', 'execution_trace_json', 'metrics_json'),
    }
    for model, names in fields.items():
        for row in connection.execute(select(model.id, *(getattr(model, name) for name in names))).mappings():
            changes = {}
            for name in names:
                original = row[name]
                if not original:
                    continue
                if name.endswith('_json'):
                    try:
                        payload = json.loads(original)
                    except (ValueError, TypeError):
                        continue
                    translated = translate_payload(payload)
                    value = json.dumps(translated, ensure_ascii=False) if translated != payload else original
                else:
                    value = translate_text(original)
                if value != original:
                    changes[name] = value
            if changes:
                if model is Case:
                    changes['updated_at'] = Case.updated_at
                connection.execute(model.__table__.update().where(model.id == row['id']).values(**changes))
