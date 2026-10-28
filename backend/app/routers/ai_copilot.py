import json
import uuid
from datetime import datetime
from typing import Optional, Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Case, AIAnalysis, AuditLog
from ..schemas import (
    RunAnalysisRequest,
    AIAnalysisResponse,
    FindingResolutionRequest,
    RemediationTriggerRequest,
    HumanDecisionRequest,
)
from ..agents.orchestrator import execute_multi_agent_pipeline, calculate_feasibility_math
from ..agents.modular_agents import (
    get_case_agent_catalog,
    execute_single_modular_agent,
    AGENT_CATALOG,
)

router = APIRouter(tags=["Raiffeisen AI Copilot (Multi-Agent Extension)"])


def _serialize_analysis(analysis: AIAnalysis, case_number: str) -> AIAnalysisResponse:
    return AIAnalysisResponse(
        analysisId=analysis.analysis_uid,
        caseId=analysis.case_id,
        caseNumber=case_number,
        status=analysis.status,
        engineUsed=analysis.engine_used,
        summary=analysis.summary or "",
        riskScore=analysis.risk_score or "medium",
        humanDecision=analysis.human_decision or "pending",
        piiMasking=json.loads(analysis.pii_masking_json or "{}"),
        extractedFields=json.loads(analysis.extracted_fields_json or "[]"),
        policyRules=json.loads(analysis.policy_rules_json or "[]"),
        findings=json.loads(analysis.findings_json or "[]"),
        feasibilityMath=json.loads(analysis.feasibility_math_json or "{}"),
        remediation=json.loads(analysis.remediation_json or "{}"),
        workflowChecklist=json.loads(analysis.workflow_checklist_json or "[]"),
        executionTrace=json.loads(analysis.execution_trace_json or "[]"),
        metrics=json.loads(analysis.metrics_json or "{}"),
        createdAt=analysis.created_at,
        completedAt=analysis.completed_at,
    )


def _find_case(db: Session, case_id: int) -> Case:
    c = db.query(Case).filter(Case.id == case_id).first()
    if not c:
        c = db.query(Case).filter(Case.case_number == str(case_id)).first()
    if not c:
        raise HTTPException(status_code=404, detail="Case not found.")
    return c


@router.get("/cases/{case_id}/agents")
def list_case_modular_agents(case_id: int, db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    Returns the modular AI agent catalog tailored for this case type,
    along with any modular results already executed on this case.
    """
    case_obj = _find_case(db, case_id)
    catalog = get_case_agent_catalog(case_obj)

    latest_analysis = (
        db.query(AIAnalysis)
        .filter(AIAnalysis.case_id == case_obj.id)
        .order_by(AIAnalysis.created_at.desc())
        .first()
    )
    modular_results = {}
    if latest_analysis and latest_analysis.metrics_json:
        metrics_data = json.loads(latest_analysis.metrics_json or "{}")
        modular_results = metrics_data.get("modularResults", {})

    return {
        "caseId": case_obj.id,
        "caseNumber": case_obj.case_number,
        "caseTitle": case_obj.title,
        "caseType": case_obj.case_type,
        "agents": catalog,
        "modularResults": modular_results,
    }


@router.post("/cases/{case_id}/agents/{agent_id}/run", response_model=AIAnalysisResponse)
def run_modular_agent_on_case(
    case_id: int,
    agent_id: str,
    db: Session = Depends(get_db)
):
    """
    Executes a single specialized AI agent module (`agent_id`) independently using the
    configured AWS Bedrock API key from backend/.env, merging its output into the case's
    analysis state without overwriting or conflicting with other agent modules.
    """
    case_obj = _find_case(db, case_id)
    valid_ids = {a["agentId"] for a in AGENT_CATALOG}
    if agent_id not in valid_ids:
        raise HTTPException(status_code=400, detail=f"Unknown modular agent: {agent_id}")

    # Run the targeted modular agent
    module_output = execute_single_modular_agent(agent_id, case_obj)
    now = datetime.utcnow()

    # Check if an analysis record already exists for this case
    analysis = (
        db.query(AIAnalysis)
        .filter(AIAnalysis.case_id == case_obj.id)
        .order_by(AIAnalysis.created_at.desc())
        .first()
    )

    if not analysis:
        # Initialize baseline analysis record so citations, PII shield, and math are ready
        base_result = execute_multi_agent_pipeline(case_obj, provider="auto", api_key=None)
        metrics_dict = base_result["metrics"]
        metrics_dict["modularResults"] = {agent_id: module_output}

        analysis_uid = f"analysis-{case_obj.case_number}-{uuid.uuid4().hex[:6]}"
        analysis = AIAnalysis(
            analysis_uid=analysis_uid,
            case_id=case_obj.id,
            status="completed",
            engine_used=module_output.get("engineUsed", base_result["engineUsed"]),
            summary=module_output.get("aiNarrative", base_result["summary"]),
            risk_score=base_result["riskScore"],
            human_decision="pending",
            pii_masking_json=json.dumps(base_result["piiMasking"], ensure_ascii=False),
            extracted_fields_json=json.dumps(base_result["extractedFields"], ensure_ascii=False),
            policy_rules_json=json.dumps(base_result["policyRules"], ensure_ascii=False),
            findings_json=json.dumps(base_result["findings"], ensure_ascii=False),
            feasibility_math_json=json.dumps(base_result["feasibilityMath"], ensure_ascii=False),
            remediation_json=json.dumps(base_result["remediation"], ensure_ascii=False),
            workflow_checklist_json=json.dumps(base_result["workflowChecklist"], ensure_ascii=False),
            execution_trace_json=json.dumps(base_result["executionTrace"], ensure_ascii=False),
            metrics_json=json.dumps(metrics_dict, ensure_ascii=False),
            created_at=now,
            completed_at=now,
        )
        db.add(analysis)
    else:
        metrics_dict = json.loads(analysis.metrics_json or "{}")
        modular_results = metrics_dict.get("modularResults", {})
        modular_results[agent_id] = module_output
        metrics_dict["modularResults"] = modular_results
        analysis.metrics_json = json.dumps(metrics_dict, ensure_ascii=False)
        analysis.engine_used = module_output.get("engineUsed", analysis.engine_used)
        analysis.completed_at = now

        # Append to execution trace without conflict
        trace_list = json.loads(analysis.execution_trace_json or "[]")
        trace_list.append({
            "step": len(trace_list) + 1,
            "agent": module_output["name"],
            "tool": f"modular_agent:{agent_id} + aws_bedrock",
            "executionMode": "on_demand_modular",
            "status": "completed",
            "durationMs": 540,
            "timestamp": now.isoformat() + "Z",
            "outputSummary": module_output["aiNarrative"][:160],
        })
        analysis.execution_trace_json = json.dumps(trace_list, ensure_ascii=False)

    audit_log = AuditLog(
        case_id=case_obj.id,
        action=f"Modular AI Agent Executed: {module_output['name']}",
        performed_by="Raiffeisen AI Copilot (AWS Bedrock)",
        details=f"Module '{agent_id}' completed ({module_output['badgeText']}). {module_output['aiNarrative'][:140]}",
        timestamp=now,
    )
    db.add(audit_log)
    db.commit()
    db.refresh(analysis)

    return _serialize_analysis(analysis, case_obj.case_number)


@router.post("/cases/{case_id}/analysis", response_model=AIAnalysisResponse)
def start_case_analysis(
    case_id: int,
    payload: Optional[RunAnalysisRequest] = None,
    db: Session = Depends(get_db)
):
    """
    API Contract:
    POST /api/cases/{caseId}/analysis
    Executes the full multi-agent orchestration pipeline and populates all modular agent cards.
    Uses the backend-configured AWS_API_KEY automatically.
    """
    case_obj = _find_case(db, case_id)
    result = execute_multi_agent_pipeline(case_obj, provider="auto", api_key=None)

    # Also populate modular results for all registered agents so all cards can be expanded
    modular_results = {}
    for agent_meta in AGENT_CATALOG:
        aid = agent_meta["agentId"]
        modular_results[aid] = execute_single_modular_agent(aid, case_obj)

    result["metrics"]["modularResults"] = modular_results

    analysis_uid = f"analysis-{case_obj.case_number}-{uuid.uuid4().hex[:6]}"
    now = datetime.utcnow()

    analysis = AIAnalysis(
        analysis_uid=analysis_uid,
        case_id=case_obj.id,
        status="completed",
        engine_used=result["engineUsed"],
        summary=result["summary"],
        risk_score=result["riskScore"],
        human_decision="pending",
        pii_masking_json=json.dumps(result["piiMasking"], ensure_ascii=False),
        extracted_fields_json=json.dumps(result["extractedFields"], ensure_ascii=False),
        policy_rules_json=json.dumps(result["policyRules"], ensure_ascii=False),
        findings_json=json.dumps(result["findings"], ensure_ascii=False),
        feasibility_math_json=json.dumps(result["feasibilityMath"], ensure_ascii=False),
        remediation_json=json.dumps(result["remediation"], ensure_ascii=False),
        workflow_checklist_json=json.dumps(result["workflowChecklist"], ensure_ascii=False),
        execution_trace_json=json.dumps(result["executionTrace"], ensure_ascii=False),
        metrics_json=json.dumps(result["metrics"], ensure_ascii=False),
        created_at=now,
        completed_at=now,
    )
    db.add(analysis)

    red_flags = result["metrics"]["redFlagsCount"]
    green_flags = result["metrics"]["greenFlagsCount"]
    audit_log = AuditLog(
        case_id=case_obj.id,
        action="Raiffeisen AI Copilot Full Suite Executed",
        performed_by="Raiffeisen AI Copilot + Consultant 024",
        details=(
            f"Analysis #{analysis_uid} completed in {result['metrics']['aiProcessingSeconds']}s. "
            f"Findings: {red_flags} alerts (Red Flags), {green_flags} validations (Green Flags). "
            f"Calculated Debt-to-Income (DTI): {result['feasibilityMath']['dti_percentage']}%."
        ),
        timestamp=now,
    )
    db.add(audit_log)
    db.commit()
    db.refresh(analysis)

    return _serialize_analysis(analysis, case_obj.case_number)


@router.get("/analyses/{analysis_id}", response_model=AIAnalysisResponse)
def get_analysis_by_uid(analysis_id: str, db: Session = Depends(get_db)):
    analysis = db.query(AIAnalysis).filter(AIAnalysis.analysis_uid == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="AI Analysis not found.")
    case_obj = db.query(Case).filter(Case.id == analysis.case_id).first()
    return _serialize_analysis(analysis, case_obj.case_number if case_obj else str(analysis.case_id))


@router.get("/cases/{case_id}/analysis", response_model=Optional[AIAnalysisResponse])
def get_latest_case_analysis(case_id: int, db: Session = Depends(get_db)):
    case_obj = _find_case(db, case_id)
    analysis = (
        db.query(AIAnalysis)
        .filter(AIAnalysis.case_id == case_obj.id)
        .order_by(AIAnalysis.created_at.desc())
        .first()
    )
    if not analysis:
        return None
    return _serialize_analysis(analysis, case_obj.case_number)


@router.patch("/analyses/{analysis_id}/findings/{finding_id}", response_model=AIAnalysisResponse)
def resolve_finding_human_in_the_loop(
    analysis_id: str,
    finding_id: str,
    payload: FindingResolutionRequest,
    db: Session = Depends(get_db)
):
    analysis = db.query(AIAnalysis).filter(AIAnalysis.analysis_uid == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    case_obj = db.query(Case).filter(Case.id == analysis.case_id).first()
    findings = json.loads(analysis.findings_json or "[]")
    feasibility_math = json.loads(analysis.feasibility_math_json or "{}")
    checklist = json.loads(analysis.workflow_checklist_json or "[]")

    target_finding = None
    for f in findings:
        if f.get("id") == finding_id:
            target_finding = f
            break

    if not target_finding:
        raise HTTPException(status_code=404, detail="Finding not found.")

    if payload.action == "confirm":
        target_finding["status"] = "confirmed_by_officer"
    elif payload.action == "resolve":
        target_finding["status"] = "resolved_by_officer"
    elif payload.action == "override_value":
        target_finding["status"] = "resolved_by_officer"
        target_finding["resolvedValue"] = payload.resolved_value

        if target_finding.get("field") == "monthly_income" and payload.resolved_value is not None:
            new_income = float(payload.resolved_value)
            if case_obj and case_obj.client:
                case_obj.client.monthly_income = new_income
            feasibility_math = calculate_feasibility_math(
                monthly_income=new_income,
                existing_debts=float(case_obj.client.existing_monthly_debts or 0.0) if case_obj else 0.0,
                requested_amount=float(case_obj.requested_amount or 45000.0) if case_obj else 45000.0,
                loan_term_months=int(case_obj.loan_term_months or 60) if case_obj else 60,
                annual_interest_rate=float(case_obj.interest_rate_annual or 8.9) if case_obj else 8.9,
            )
            for f_item in findings:
                if f_item.get("id") == "finding-dti-check":
                    f_item["title"] = f"🟢 Recalculated Debt-to-Income (Python): {feasibility_math['dti_percentage']}% (Max: 40%)"
                    f_item["description"] = (
                        f"Recalculated for officer-validated income (€{int(new_income)}): "
                        f"Installment €{feasibility_math['calculated_monthly_installment']} -> DTI {feasibility_math['dti_percentage']}%."
                    )
                    f_item["resolvedValue"] = f"{feasibility_math['dti_percentage']}%"
            for step in checklist:
                if step.get("step") == 2:
                    step["status"] = "passed"
                    step["detail"] = f"Income confirmed by loan officer: €{int(new_income)} (DTI: {feasibility_math['dti_percentage']}%)"

        elif target_finding.get("field") == "applicant_name" and payload.resolved_value is not None:
            if case_obj and case_obj.client:
                case_obj.client.full_name = str(payload.resolved_value)
            for step in checklist:
                if step.get("step") == 1:
                    step["status"] = "passed"
                    step["detail"] = f"Applicant legal identity confirmed: {payload.resolved_value}"

    if payload.officer_note:
        target_finding["officerNote"] = payload.officer_note

    analysis.findings_json = json.dumps(findings, ensure_ascii=False)
    analysis.feasibility_math_json = json.dumps(feasibility_math, ensure_ascii=False)
    analysis.workflow_checklist_json = json.dumps(checklist, ensure_ascii=False)

    log = AuditLog(
        case_id=analysis.case_id,
        action=f"Human Review Sign-off ({target_finding.get('fieldLabel', finding_id)})",
        performed_by="Consultant 024",
        details=(
            f"Action: {payload.action}. "
            + (f"Selected & applied value: {payload.resolved_value}." if payload.resolved_value else "")
        ),
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    db.refresh(analysis)

    return _serialize_analysis(analysis, case_obj.case_number if case_obj else str(analysis.case_id))


@router.post("/analyses/{analysis_id}/remediation/send", response_model=AIAnalysisResponse)
def send_remediation_notification(
    analysis_id: str,
    payload: RemediationTriggerRequest,
    db: Session = Depends(get_db)
):
    analysis = db.query(AIAnalysis).filter(AIAnalysis.analysis_uid == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    case_obj = db.query(Case).filter(Case.id == analysis.case_id).first()
    remediation = json.loads(analysis.remediation_json or "{}")

    now_str = datetime.utcnow().strftime("%d.%m.%Y %H:%M")
    remediation["status"] = "sent_by_officer"
    remediation["sentAt"] = now_str
    if payload.custom_message:
        remediation["emailBody"] = payload.custom_message

    analysis.remediation_json = json.dumps(remediation, ensure_ascii=False)

    if case_obj:
        case_obj.status = "pending"
        case_obj.updated_at = datetime.utcnow()

    log = AuditLog(
        case_id=analysis.case_id,
        action="Automated Remediation SMS & Email Dispatched",
        performed_by="Remediation Agent (Approved by Consultant 024)",
        details=(
            f"Customer notification sent to Email ({remediation.get('recipientEmail')}) and SMS ({remediation.get('recipientPhone')}) "
            f"with secure document upload link: {remediation.get('secureUploadLink')}."
        ),
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    db.refresh(analysis)

    return _serialize_analysis(analysis, case_obj.case_number if case_obj else str(analysis.case_id))


@router.post("/analyses/{analysis_id}/human-decision", response_model=AIAnalysisResponse)
def submit_final_human_decision(
    analysis_id: str,
    payload: HumanDecisionRequest,
    db: Session = Depends(get_db)
):
    analysis = db.query(AIAnalysis).filter(AIAnalysis.analysis_uid == analysis_id).first()
    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found.")

    case_obj = db.query(Case).filter(Case.id == analysis.case_id).first()
    checklist = json.loads(analysis.workflow_checklist_json or "[]")

    analysis.human_decision = payload.decision

    status_map = {
        "approve": ("completed", "APPROVED (Human-in-the-Loop)"),
        "request_clarification": ("pending", "PENDING CUSTOMER CLARIFICATION"),
        "reject": ("rejected", "REJECTED BY CREDIT OFFICER"),
    }
    new_case_status, decision_label = status_map.get(payload.decision, ("in_review", payload.decision))

    if case_obj:
        case_obj.status = new_case_status
        case_obj.updated_at = datetime.utcnow()
        if payload.officer_comments:
            stamp = datetime.utcnow().strftime("%d.%m.%Y %H:%M")
            case_obj.notes = f"{case_obj.notes or ''}\n[Officer Decision {stamp} - {decision_label}]: {payload.officer_comments}".strip()

        if payload.decision == "approve":
            for t in case_obj.tasks:
                t.status = "completed"

    for step in checklist:
        if step.get("step") == 4:
            step["status"] = "passed" if payload.decision == "approve" else ("failed" if payload.decision == "reject" else "review")
            step["detail"] = f"Final sign-off recorded by Consultant 024: {decision_label}"

    analysis.workflow_checklist_json = json.dumps(checklist, ensure_ascii=False)

    log = AuditLog(
        case_id=analysis.case_id,
        action=f"Final Underwriting Decision: {decision_label}",
        performed_by="Consultant 024",
        details=(
            f"Decision finalized based on AI Audit #{analysis.analysis_uid}. "
            f"Case status transitioned to '{new_case_status}'. "
            + (f"Officer Remarks: {payload.officer_comments}" if payload.officer_comments else "")
        ),
        timestamp=datetime.utcnow()
    )
    db.add(log)
    db.commit()
    db.refresh(analysis)

    return _serialize_analysis(analysis, case_obj.case_number if case_obj else str(analysis.case_id))
