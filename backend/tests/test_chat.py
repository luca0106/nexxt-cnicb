import json
import unittest

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.agentic import chat_with_case
from app.agentic.chat import CaseIndex, build_sources
from app.agentic.llm import ScriptedLLM, text_response, tool_response
from app.database import Base
from app.models import Case
from app.seed import seed_database

ANALYSIS = {
    "summary": "Income differs between the application and the salary certificate.",
    "riskScore": "medium",
    "findings": [{"id": "finding-income-mismatch", "flagType": "red_flag", "severity": "high",
                  "status": "action_required", "field": "monthly_income", "title": "Income mismatch",
                  "description": "Declared net salary differs from the employer certificate.", "values": []}],
    "policyRules": [],
    "feasibilityMath": {"monthly_income_used": 5200, "dti_percentage": 31.5, "is_feasible": True},
    "metrics": {},
}


def _last_results(request):
    return [b for b in request["messages"][-1]["content"] if isinstance(b, dict) and b.get("type") == "tool_result"]


class CopilotChatTest(unittest.TestCase):
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

    def test_index_finds_finding_and_document_lines(self):
        index = CaseIndex(build_sources(self.case, ANALYSIS))
        hits = index.search("income mismatch salary")
        self.assertTrue(any(h.source_id == "finding:finding-income-mismatch" for h in hits))
        self.assertTrue(index.search("Tech Solutions", ["document"]))

    def test_answer_cites_retrieved_sources(self):
        llm = ScriptedLLM([
            tool_response(("search_case", {"query": "employer Tech Solutions", "sources": ["document"]})),
            lambda params: tool_response(("answer", {
                "text": "The certificate was issued by Tech Solutions Ltd [1].",
                "citations": [json.loads(_last_results(params)[0]["content"])["hits"][0]["source_id"]]})),
        ])
        out = chat_with_case(self.case, ANALYSIS, "Who issued the salary certificate?", llm=llm)

        self.assertEqual(out["mode"], "agentic_rag")
        self.assertEqual(len(out["citations"]), 1)
        cite = out["citations"][0]
        self.assertEqual(cite["kind"], "document")
        self.assertIn("lineNumber", cite)
        self.assertIn("Tech Solutions", cite["quote"])
        sent = json.dumps([r["messages"] for r in llm.requests], default=str)
        self.assertNotIn("1920514410023", sent, "national ID must be masked before reaching the LLM")

    def test_citation_that_was_not_retrieved_is_rejected(self):
        llm = ScriptedLLM([
            tool_response(("answer", {"text": "Approved [1].", "citations": ["doc-1:L1"]})),
            lambda params: (self.assertTrue(_last_results(params)[0]["is_error"]),
                            text_response("I cannot answer that from the case."))[1],
        ])
        out = chat_with_case(self.case, ANALYSIS, "Is it approved?", llm=llm)
        self.assertEqual(out["citations"], [])
        self.assertEqual(out["steps"][0]["status"], "rejected")

    def test_small_talk_is_answered_without_llm(self):
        llm = ScriptedLLM([])  # any call would fail: no responses prepared
        for message, word in (("what's up?", "Hey"), ("Salut, ce faci?", "Salut"), ("mersi!", "plăcere"),
                              ("thanks", "welcome")):
            out = chat_with_case(self.case, ANALYSIS, message, llm=llm)
            self.assertEqual(out["mode"], "small_talk", message)
            self.assertIn(word, out["answer"])
            self.assertEqual(out["citations"], [])
        self.assertEqual(llm.requests, [])

    def test_greeting_with_a_question_goes_to_the_agent(self):
        llm = ScriptedLLM([tool_response(("answer", {"text": "The DTI is 31.5%.", "citations": []}))])
        out = chat_with_case(self.case, ANALYSIS, "hey, what's the DTI?", llm=llm)
        self.assertEqual(out["mode"], "agentic_rag")
        self.assertEqual(len(llm.requests), 1)

    def test_what_if_is_deterministic_and_hypothetical(self):
        llm = ScriptedLLM([
            tool_response(("what_if_dti", {"monthly_income": 8000})),
            lambda params: tool_response(("answer", {
                "text": "With 8000 the DTI would be lower [1].",
                "citations": [json.loads(_last_results(params)[0]["content"])["source_id"]]})),
        ])
        out = chat_with_case(self.case, ANALYSIS, "What if income were 8000?", llm=llm)
        self.assertEqual(out["citations"][0]["kind"], "what_if")
        self.assertIn('"hypothetical": true', out["citations"][0]["quote"])

    def test_retrieval_only_without_llm(self):
        import app.agentic.chat as chat
        original = chat._safe_llm
        chat._safe_llm = lambda: None
        try:
            out = chat_with_case(self.case, ANALYSIS, "income mismatch")
        finally:
            chat._safe_llm = original
        self.assertEqual(out["mode"], "retrieval_only")
        self.assertTrue(out["citations"])


if __name__ == "__main__":
    unittest.main()
