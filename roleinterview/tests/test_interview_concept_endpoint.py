import unittest
from unittest.mock import patch

from app import main


class ConceptQuestionsEndpointTests(unittest.TestCase):
    def test_forwards_concept_separately_from_skill(self):
        request = main.ConceptQuestionsRequest(
            role="Backend Developer",
            skill="Python",
            concept="Asynchronous IO",
        )
        generated = {"questions": [{"question": "How does an event loop schedule tasks?"}]}

        with patch.object(main, "generate_concept_questions", return_value=generated) as generator:
            response = main.generate_concept_interview_questions(request)

        generator.assert_called_once_with(
            role="Backend Developer",
            skill="Python",
            concept="Asynchronous IO",
        )
        self.assertEqual(response["skill"], "Python")
        self.assertEqual(response["concept"], "Asynchronous IO")
        self.assertEqual(response["questions"], generated["questions"])


if __name__ == "__main__":
    unittest.main()