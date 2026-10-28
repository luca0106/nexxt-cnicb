import json
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.agentic import LLMError, run_agentic_review
from app.agentic.llm import ScriptedLLM, tool_response
from app.database import Base
from app.models import Case
from app.seed import seed_database

R = {"reason": "test"}


def _tool_results(request):
    """tool_result blocks the agent sent back in its last user message."""
    last = request["messages"][-1]["content"]
    return [b for b in last if isinstance(b, dict) and b.get("type") == "tool_result"]


class AgenticReviewTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine("sqlite://")
        Base.metadata.create_all(cls.engine)
        with Session(cls.engine) as db:
            seed_database(db)

    def setUp(self):
        self.db = Session(self.engine)
        self.case = self.db.query(Case).filter(Case.case_number == "10482").one()

    def tearDown(self):
        self.db.close()

    def test_full_review_with_cited_finding(self):
        llm = ScriptedLLM([
            tool_response(("read_documents", R), ("extract_fields", R)),
            tool_response(("calculate_dti", {**R, "monthly_income": 5200, "alternative_income": 5700}),
                          ("run_cross_check", R)),
            tool_response(("record_finding", {**R, "flag_type": "red_flag", "severity": "medium",
                                              "field": "employer_name", "title": "Employer check pending",
                                              "description": "Certificate issued by Tech Solutions Ltd.",
                                              "citations": [{"doc_code": "doc-2", "line": 2}]})),
            tool_response(("finish", {**R, "summary": "Income and name differ across documents.",
                                      "risk_level": "medium", "checklist": ["Confirm the income with the client"]})),
        ])
        result = run_agentic_review(self.case, llm=llm)

        sent = json.dumps([r["messages"] for r in llm.requests])
        self.assertNotIn("1920514410023", sent, "national ID must be masked before reaching the LLM")
        self.assertIn("[NAT_ID_1]", sent)

        agent_finding = next(f for f in result["findings"] if f["id"] == "finding-agent-1")
        self.assertEqual(agent_finding["values"][0]["quote"], "Line 2: Issued by: Tech Solutions Ltd, Commercial Reg. FN38921104")
        self.assertTrue(any(f["id"] == "finding-income-mismatch" for f in result["findings"]))
        self.assertEqual(result["feasibilityMath"]["monthly_income_used"], 5200)
        self.assertEqual(result["riskScore"], "medium")
        self.assertEqual(result["summary"], "Income and name differ across documents.")
        self.assertEqual(result["metrics"]["agentToolCalls"], 6)
        self.assertEqual(result["workflowChecklist"][-1]["title"], "Confirm the income with the client")
        tool_steps = [s for s in result["executionTrace"] if s["executionMode"] == "agent_selected"]
        self.assertTrue(all(s["reason"] == "test" for s in tool_steps))
        self.assertFalse(any(s["executionMode"] == "post_agent_safety_net" for s in result["executionTrace"]))

    def test_citation_to_missing_line_is_rejected(self):
        llm = ScriptedLLM([
            tool_response(("record_finding", {**R, "flag_type": "red_flag", "severity": "low", "field": "x",
                                              "title": "t", "description": "d",
                                              "citations": [{"doc_code": "doc-2", "line": 99}]})),
            tool_response(("finish", {**R, "summary": "s", "risk_level": "low", "checklist": []})),
        ])
        result = run_agentic_review(self.case, llm=llm)
        rejected = _tool_results(llm.requests[1])[0]
        self.assertTrue(rejected["is_error"])
        self.assertIn("line 99 does not exist", rejected["content"])
        self.assertFalse(any(f["id"].startswith("finding-agent") for f in result["findings"]))

    def test_safety_net_runs_skipped_checks(self):
        llm = ScriptedLLM([tool_response(("finish", {**R, "summary": "s", "risk_level": "low", "checklist": []}))])
        result = run_agentic_review(self.case, llm=llm)
        nets = [s["tool"] for s in result["executionTrace"] if s["executionMode"] == "post_agent_safety_net"]
        self.assertEqual(nets, ["extract_fields", "calculate_dti", "run_cross_check"])
        self.assertTrue(result["findings"])

    def test_step_limit_forces_finish(self):
        llm = ScriptedLLM([tool_response(("extract_fields", R))] * 5)
        result = run_agentic_review(self.case, llm=llm, max_steps=2)
        self.assertEqual(result["metrics"]["agentToolCalls"], 2)
        self.assertIn("step limit", result["summary"])

    def test_model_unreachable_before_any_step_raises(self):
        def fail(_params):
            raise LLMError("no network")
        with self.assertRaises(LLMError):
            run_agentic_review(self.case, llm=ScriptedLLM([fail]))


if __name__ == "__main__":
    unittest.main()
