"""Tools of the review agent and the state of one run.

The planner (Claude) decides which tool to call next; every tool is plain Python. Deterministic
work (extraction, DTI math, cross-check, specialist modules) reuses the existing agents, so the
numbers are identical to the deterministic pipeline. Tools the model uses to report something
(record_finding, escalate_to_human) are validated: a citation must point at a real document line.
"""

import json
import re
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy.orm import object_session

from ..agents.modular_agents import AGENT_CATALOG, execute_single_modular_agent
from ..agents.orchestrator import (
    calculate_feasibility_math,
    run_extraction_agent,
    run_investigator_agent,
    run_policy_agent,
)
from ..models import Client


class ToolRejected(Exception):
    """The call is invalid (bad arguments, citation that does not exist). Not retried."""


# =============================================================================
# PII SHIELD: real pseudonymization of the text sent to the model
# =============================================================================
_IBAN = re.compile(r"\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b")
_NAT_ID = re.compile(r"\b[1-8]\d{12}\b")
_EMAIL = re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.]+\b")


class PIIShield:
    """Replaces identifiers with stable tokens before any text reaches the LLM.

    The same value always gets the same token, so the model can still compare documents
    ("[NAT_ID_1]" on both = same person). Agent output is re-hydrated for the officer only.
    """

    CATEGORIES = {
        "NAT_ID": ("National Identification Number (SSN / Tax ID)", "Art. 4 & Art. 32 GDPR - Pseudonymization"),
        "ID_SERIES": ("Identity Card Series & Number", "Art. 32 GDPR - Identity Data Protection"),
        "PHONE": ("Phone Number", "Internal Bank Data Security"),
        "EMAIL": ("Email Address", "Internal Bank Data Security"),
        "IBAN": ("Bank Account IBAN", "Banking Secrecy & Regulatory Compliance"),
    }

    def __init__(self, client):
        self.forward: Dict[str, str] = {}
        self.kinds: Dict[str, str] = {}
        for kind, value in (("NAT_ID", client.national_id), ("ID_SERIES", client.id_card_series),
                            ("PHONE", client.phone), ("EMAIL", client.email)):
            if value and len(value.strip()) >= 5:
                self._token(kind, value.strip())

    def _token(self, kind: str, value: str) -> str:
        if value not in self.forward:
            n = sum(1 for k in self.kinds.values() if k == kind) + 1
            self.forward[value] = f"[{kind}_{n}]"
            self.kinds[value] = kind
        return self.forward[value]

    def mask(self, text: str) -> str:
        for value in sorted(self.forward, key=len, reverse=True):
            text = text.replace(value, self.forward[value])
        text = _IBAN.sub(lambda m: self._token("IBAN", m.group(0)), text)
        text = _NAT_ID.sub(lambda m: self._token("NAT_ID", m.group(0)), text)
        return _EMAIL.sub(lambda m: self._token("EMAIL", m.group(0)), text)

    def unmask(self, text: str) -> str:
        for value, token in self.forward.items():
            text = text.replace(token, value)
        return text

    def report(self) -> Dict[str, Any]:
        tokens = []
        for value, token in self.forward.items():
            category, article = self.CATEGORIES[self.kinds[value]]
            tokens.append({"category": category, "original_preview": value, "masked_token": token,
                           "gdpr_article": article})
        return {
            "enabled": True,
            "status": "active_protection",
            "masked_fields_count": len(tokens),
            "compliance_standard": "GDPR EU 2016/679 & Banking Secrecy Regulations",
            "tokens": tokens,
            "explanation": (
                f"{len(tokens)} identifiers (National ID, ID card, phone, email, IBAN) were replaced with tokens "
                "before any document text was sent to the LLM. Names, addresses and amounts stay visible because "
                "the cross-check needs them. Tokens are re-hydrated only in the officer's view."
            ),
        }


# =============================================================================
# STATE OF ONE RUN
# =============================================================================
@dataclass
class AgentRun:
    case: Any
    pii: PIIShield
    max_steps: int
    documents: Dict[str, Any] = field(default_factory=dict)  # doc_code -> Document
    extracted: Optional[List[Dict[str, Any]]] = None
    policies: List[Dict[str, Any]] = field(default_factory=list)
    feasibility: Optional[Dict[str, Any]] = None
    cross_check: Optional[List[Dict[str, Any]]] = None
    agent_findings: List[Dict[str, Any]] = field(default_factory=list)
    modular: Dict[str, Any] = field(default_factory=dict)
    company: Optional[Dict[str, Any]] = None
    requested_documents: List[Dict[str, str]] = field(default_factory=list)
    message_to_client: str = ""
    summary: str = ""
    risk_level: str = ""
    checklist: List[str] = field(default_factory=list)
    unverified: List[str] = field(default_factory=list)
    trace: List[Dict[str, Any]] = field(default_factory=list)
    messages: List[Any] = field(default_factory=list)
    pending_calls: List[Any] = field(default_factory=list)
    nudges: int = 0
    finished: bool = False
    input_tokens: int = 0
    output_tokens: int = 0

    @property
    def tool_steps(self) -> int:
        return sum(1 for s in self.trace if s.get("executionMode") == "agent_selected")


def _masked(run: AgentRun, data: Any) -> Any:
    return json.loads(run.pii.mask(json.dumps(data, ensure_ascii=False, default=str)))


def _line(run: AgentRun, doc_code: str, line: int) -> str:
    doc = run.documents.get(doc_code)
    if doc is None:
        raise ToolRejected(f"Unknown document {doc_code}. Known: {', '.join(run.documents)}")
    lines = (doc.content_text or "").splitlines()
    if not 1 <= int(line) <= len(lines):
        raise ToolRejected(f"{doc_code} has lines 1-{len(lines)}; line {line} does not exist")
    return lines[int(line) - 1]


def _citations(run: AgentRun, citations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not citations:
        raise ToolRejected("At least one citation (doc_code + line) is required")
    values = []
    for c in citations:
        quote = _line(run, c["doc_code"], c["line"])
        doc = run.documents[c["doc_code"]]
        values.append({
            "documentId": doc.id, "docCode": c["doc_code"], "documentName": doc.file_name,
            "documentType": doc.document_type, "value": run.pii.unmask(c.get("value") or ""),
            "lineNumber": int(c["line"]), "page": 1, "quote": quote,
        })
    return values


def _ensure_extracted(run: AgentRun) -> List[Dict[str, Any]]:
    if run.extracted is None:
        run.extracted = run_extraction_agent(run.case, list(run.documents.values()))
    return run.extracted


def default_feasibility(run: AgentRun) -> Dict[str, Any]:
    """Same income choice as the deterministic pipeline: lowest documented income, highest as alternative."""
    incomes = sorted({float(i["value"]) for i in _ensure_extracted(run) if i["field"] == "monthly_income"})
    client = run.case.client
    return calculate_feasibility_math(
        monthly_income=incomes[0] if incomes else float(client.monthly_income or 5000.0),
        existing_debts=float(client.existing_monthly_debts or 0.0),
        requested_amount=float(run.case.requested_amount or 35000.0),
        loan_term_months=int(run.case.loan_term_months or 60),
        annual_interest_rate=float(run.case.interest_rate_annual or 8.9),
        alternative_income=incomes[1] if len(incomes) > 1 else None,
    )


# =============================================================================
# TOOLS: fn(run, **args) -> (result for the model, one-line summary for the trace)
# =============================================================================
def read_documents(run: AgentRun, doc_codes: Optional[List[str]] = None, **_):
    codes = doc_codes or list(run.documents)
    out = []
    for code in codes:
        doc = run.documents.get(code)
        if doc is None:
            raise ToolRejected(f"Unknown document {code}. Known: {', '.join(run.documents)}")
        out.append({"doc_code": code, "document_type": doc.document_type, "file_name": doc.file_name,
                    "status": doc.status, "text": run.pii.mask(doc.content_text or "(empty document)")})
    return {"documents": out}, f"Read {len(out)} document(s): {', '.join(codes)} (PII masked)"


def extract_fields(run: AgentRun, **_):
    run.extracted = run_extraction_agent(run.case, list(run.documents.values()))
    compact = [{"field": i["field"], "value": i["value"], "doc_code": i["docCode"], "line": i["lineNumber"],
                "confidence": i["confidence"]} for i in run.extracted]
    return {"fields": _masked(run, compact)}, f"{len(compact)} fields extracted with line citations"


def search_policies(run: AgentRun, query: str, **_):
    words = {w for w in re.findall(r"[a-z0-9]+", query.lower()) if len(w) > 2}
    scored = []
    for rule in run_policy_agent(run.case):
        text = f"{rule['ruleId']} {rule['title']} {rule['category']} {rule['excerpt']}".lower()
        score = sum(1 for w in words if w in text)
        if score:
            scored.append((score, rule))
    hits = [r for _, r in sorted(scored, key=lambda x: -x[0])[:3]]
    for rule in hits:
        if rule["ruleId"] not in {p["ruleId"] for p in run.policies}:
            run.policies.append(rule)
    if not hits:
        titles = [f"{r['ruleId']}: {r['title']}" for r in run_policy_agent(run.case)]
        return {"found": False, "available_rules": titles}, f"No rule matched '{query}'"
    return {"found": True, "rules": hits}, f"{len(hits)} rule(s): {', '.join(r['ruleId'] for r in hits)}"


def calculate_dti(run: AgentRun, monthly_income: float, existing_monthly_debts: Optional[float] = None,
                  alternative_income: Optional[float] = None, **_):
    if monthly_income <= 0:
        raise ToolRejected("monthly_income must be positive")
    run.feasibility = calculate_feasibility_math(
        monthly_income=float(monthly_income),
        existing_debts=float(existing_monthly_debts if existing_monthly_debts is not None
                             else run.case.client.existing_monthly_debts or 0.0),
        requested_amount=float(run.case.requested_amount or 35000.0),
        loan_term_months=int(run.case.loan_term_months or 60),
        annual_interest_rate=float(run.case.interest_rate_annual or 8.9),
        alternative_income=alternative_income,
    )
    f = run.feasibility
    keys = ("calculated_monthly_installment", "total_monthly_obligation", "monthly_income_used", "dti_percentage",
            "max_dti_limit_percent", "is_feasible", "alternative_income_scenario")
    return {k: f[k] for k in keys}, f"DTI {f['dti_percentage']}% (installment {f['calculated_monthly_installment']}, limit 40%)"


def run_cross_check(run: AgentRun, **_):
    _ensure_extracted(run)
    if run.feasibility is None:
        run.feasibility = default_feasibility(run)
    run.cross_check = run_investigator_agent(run.case, run.extracted, run.policies or run_policy_agent(run.case),
                                             run.feasibility)
    compact = [{"id": f["id"], "flag": f["flagType"], "severity": f.get("severity"), "field": f.get("field"),
                "title": f["title"]} for f in run.cross_check]
    red = sum(1 for f in run.cross_check if f["flagType"] == "red_flag")
    return {"findings": _masked(run, compact)}, f"{red} red flag(s), {len(compact) - red} green flag(s)"


def run_specialist(run: AgentRun, agent_id: str, **_):
    if agent_id not in {a["agentId"] for a in AGENT_CATALOG}:
        raise ToolRejected(f"Unknown specialist {agent_id}")
    out = execute_single_modular_agent(agent_id, run.case)
    run.modular[agent_id] = out
    brief = {k: out.get(k) for k in ("name", "badgeText", "status", "riskLevel", "aiNarrative") if k in out}
    if isinstance(brief.get("aiNarrative"), str):
        brief["aiNarrative"] = brief["aiNarrative"][:1200]
    return _masked(run, brief), f"{out.get('name', agent_id)}: {out.get('badgeText', 'done')}"


def lookup_company(run: AgentRun, company_name: str, **_):
    """Mock trade registry built from the employers known to the bank (demo stays offline)."""
    db = object_session(run.case)
    wanted = company_name.strip().lower()
    match = None
    for employer, cui in db.query(Client.employer, Client.employer_cui).filter(Client.employer.isnot(None)).distinct():
        name = employer.lower()
        if wanted and (wanted == name or wanted in name or name in wanted):
            match = (employer, cui)
            break
    if match is None:
        run.company = {"companyName": company_name, "found": False, "source": "mock trade registry"}
        return run.company, f"'{company_name}' not found in the registry"
    run.company = {"companyName": match[0], "found": True, "cui": match[1], "status": "active",
                   "insolvency": False, "source": "mock trade registry"}
    return run.company, f"{match[0]}: active, no insolvency"


def record_finding(run: AgentRun, flag_type: str, severity: str, field: str, title: str, description: str,
                   citations: List[Dict[str, Any]], rule_ref: str = "", suggested_action: str = "", **_):
    values = _citations(run, citations)
    red = flag_type == "red_flag"
    finding = {
        "id": f"finding-agent-{len(run.agent_findings) + 1}",
        "flagType": flag_type, "type": "agent_observation", "severity": severity,
        "field": field, "fieldLabel": field.replace("_", " ").title(), "ruleRef": rule_ref or None,
        "title": f"{'🔴' if red else '🟢'} {run.pii.unmask(title)}",
        "description": run.pii.unmask(description),
        "values": values, "status": "action_required" if red else "verified",
        "suggestedAction": run.pii.unmask(suggested_action) or None,
        "selectableValues": [], "resolvedValue": None, "source": "review_agent",
    }
    run.agent_findings.append(finding)
    return {"recorded": finding["id"]}, f"{flag_type} on {field}: {title}"


def escalate_to_human(run: AgentRun, field: str, question: str, citations: List[Dict[str, Any]], **_):
    values = _citations(run, citations)
    finding = {
        "id": f"finding-agent-{len(run.agent_findings) + 1}",
        "flagType": "red_flag", "type": "escalation", "severity": "high",
        "field": field, "fieldLabel": field.replace("_", " ").title(), "ruleRef": None,
        "title": f"🔴 Officer decision needed: {field.replace('_', ' ')}",
        "description": run.pii.unmask(question), "values": values, "status": "action_required",
        "suggestedAction": "The agent could not settle this from the documents. Decide using the cited sources.",
        "selectableValues": [v["value"] for v in values if v["value"]], "resolvedValue": None,
        "source": "review_agent",
    }
    run.agent_findings.append(finding)
    return {"escalated": finding["id"]}, f"Escalated {field} to the officer"


def request_missing_document(run: AgentRun, document_type: str, message_to_client: str, **_):
    run.requested_documents.append({"documentType": document_type})
    run.message_to_client = run.pii.unmask(message_to_client)
    return ({"requested": document_type, "note": "Draft prepared for the officer; nothing is sent automatically."},
            f"Requested {document_type} from the client (draft for officer approval)")


def finish(run: AgentRun, summary: str, risk_level: str, checklist: List[str], message_to_client: str = "", **_):
    run.summary = run.pii.unmask(summary)
    run.risk_level = risk_level
    run.checklist = [run.pii.unmask(c) for c in checklist]
    if message_to_client and not run.message_to_client:
        run.message_to_client = run.pii.unmask(message_to_client)
    run.finished = True
    return {"finished": True}, f"Report handed to the officer (risk: {risk_level})"


TOOLS: Dict[str, Callable] = {
    "read_documents": read_documents,
    "extract_fields": extract_fields,
    "search_policies": search_policies,
    "calculate_dti": calculate_dti,
    "run_cross_check": run_cross_check,
    "run_specialist": run_specialist,
    "lookup_company": lookup_company,
    "record_finding": record_finding,
    "escalate_to_human": escalate_to_human,
    "request_missing_document": request_missing_document,
    "finish": finish,
}

# Which agent of the copilot a tool belongs to (shown in the execution trace)
TOOL_AGENTS = {
    "read_documents": "Extraction Agent",
    "extract_fields": "Extraction Agent",
    "search_policies": "Policy Agent",
    "calculate_dti": "Investigator Agent (Python Math)",
    "run_cross_check": "Investigator Agent (Cross-Checker)",
    "run_specialist": "Specialist Agent",
    "lookup_company": "Company Registry Check",
    "record_finding": "Investigator Agent (Claude)",
    "escalate_to_human": "Human Escalation",
    "request_missing_document": "Remediation Agent",
    "finish": "Planner (Claude)",
}

_REASON = {"type": "string", "description": "One sentence: why you call this now, given what you just observed."}
_CITATIONS = {
    "type": "array", "minItems": 1,
    "items": {"type": "object", "properties": {
        "doc_code": {"type": "string"},
        "line": {"type": "integer", "description": "Line number as written in the document ('Line N:')"},
        "value": {"type": "string", "description": "The value as it appears on that line"},
    }, "required": ["doc_code", "line"]},
}


def tool_definitions() -> List[Dict[str, Any]]:
    def tool(name, description, props=None, required=()):
        return {"name": name, "description": description, "input_schema": {
            "type": "object", "properties": {"reason": _REASON, **(props or {})},
            "required": ["reason", *required]}}

    specialists = [a["agentId"] for a in AGENT_CATALOG]
    return [
        tool("read_documents", "Read the full text of case documents, line by line. Omit doc_codes to read all.",
             {"doc_codes": {"type": "array", "items": {"type": "string"}}}),
        tool("extract_fields", "Deterministic extraction of name, national ID, income, address, ID validity etc. "
             "from all documents, each with its document and line."),
        tool("search_policies", "Search the bank's credit policies and NBR rules. Returns cited rules.",
             {"query": {"type": "string"}}, ["query"]),
        tool("calculate_dti", "Deterministic annuity installment and DTI (40% ceiling) for the case's loan terms. "
             "Never compute DTI yourself. existing_monthly_debts defaults to the bank's client record "
             "(credit bureau data); pass it explicitly if the documents show a different figure.",
             {"monthly_income": {"type": "number"}, "existing_monthly_debts": {"type": "number"},
              "alternative_income": {"type": "number", "description": "A second documented income, for comparison"}},
             ["monthly_income"]),
        tool("run_cross_check", "Deterministic validator: compares identity, income, address, ID validity and DTI "
             "across documents and returns red/green flags with citations. Its findings go to the officer as they are."),
        tool("run_specialist", "Run one specialist module: dti_repayment_capacity (full repayment capacity incl. "
             "financial profile), unusual_transactions (expense anomalies, gambling, AML signals), "
             "doc_reconciliation (document-by-document reconciliation).",
             {"agent_id": {"type": "string", "enum": specialists}}, ["agent_id"]),
        tool("lookup_company", "Check the applicant's employer in the trade registry (exists, active, insolvency).",
             {"company_name": {"type": "string"}}, ["company_name"]),
        tool("record_finding", "Report something the cross-check did NOT already report, with citations to the "
             "exact document lines. Rejected if a citation does not exist.",
             {"flag_type": {"type": "string", "enum": ["red_flag", "green_flag"]},
              "severity": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
              "field": {"type": "string"}, "title": {"type": "string"}, "description": {"type": "string"},
              "citations": _CITATIONS, "rule_ref": {"type": "string"}, "suggested_action": {"type": "string"}},
             ["flag_type", "severity", "field", "title", "description", "citations"]),
        tool("escalate_to_human", "A contradiction you cannot settle from documents or policies, or a value you "
             "cannot read. Cite every conflicting source. Never pick a value yourself.",
             {"field": {"type": "string"}, "question": {"type": "string"}, "citations": _CITATIONS},
             ["field", "question", "citations"]),
        tool("request_missing_document", "A mandatory document is missing or no longer valid (e.g. expired ID). "
             "Prepares a message to the client for the officer to approve; nothing is sent automatically.",
             {"document_type": {"type": "string"}, "message_to_client": {"type": "string"}},
             ["document_type", "message_to_client"]),
        tool("finish", "End the review and hand the report to the officer.",
             {"summary": {"type": "string", "description": "3-5 factual sentences for the officer"},
              "risk_level": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
              "checklist": {"type": "array", "items": {"type": "string"},
                            "description": "Concrete next steps for the officer"},
              "message_to_client": {"type": "string",
                                    "description": "Email to the client if they must clarify something; else empty"}},
             ["summary", "risk_level", "checklist"]),
    ]
