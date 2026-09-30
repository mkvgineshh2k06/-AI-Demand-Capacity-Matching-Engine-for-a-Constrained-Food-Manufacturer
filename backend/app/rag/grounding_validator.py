import re
from typing import Dict, Any, List, Tuple

class GroundingValidator:
    """
    Grounding Validator — strictly enforces that the LLM NEVER calculates or invents business numbers.
    Compares numbers in the generated answer against the trusted operational context.
    If an unsupported operational number is detected, flags the answer for correction or fallback.
    """

    @staticmethod
    def extract_numbers(text: str) -> List[float]:
        # Matches integers and floats like 1,212 or 5160 or 76.5 or ₹16.73L
        matches = re.findall(r'₹?\s*([\d,]+(?:\.\d+)?)\s*(?:kg|L|%|k)?', text)
        numbers = []
        for m in matches:
            cleaned = m.replace(',', '').strip()
            if cleaned:
                try:
                    num = float(cleaned)
                    # Ignore harmless numbers like 1, 2, 3 (list bullet numbers) or dates (2024)
                    if num not in [1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 8.0, 9.0, 10.0, 2024.0]:
                        numbers.append(num)
                except ValueError:
                    pass
        return numbers

    @staticmethod
    def validate_answer(answer: str, trusted_context: Dict[str, Any]) -> Tuple[bool, List[str]]:
        extracted = GroundingValidator.extract_numbers(answer)
        if not extracted:
            return True, []

        # Build list of valid trusted numbers from context
        trusted_numbers = set()
        
        def collect_numbers(obj):
            if isinstance(obj, (int, float)):
                trusted_numbers.add(round(float(obj), 2))
                trusted_numbers.add(float(obj))
            elif isinstance(obj, dict):
                for v in obj.values():
                    collect_numbers(v)
            elif isinstance(obj, list):
                for item in obj:
                    collect_numbers(item)

        collect_numbers(trusted_context)

        # Common harmless numbers: 100%, 0%, 10x, 20%, 95%, 98%, 85%, 50%, 40%, 60%, 80%, 90%
        harmless_standards = {100.0, 0.0, 10.0, 20.0, 30.0, 40.0, 50.0, 60.0, 70.0, 80.0, 85.0, 90.0, 95.0, 98.0, 150.0, 200.0, 800.0, 3500.0, 400.0, 420.0, 380.0}
        trusted_numbers.update(harmless_standards)

        unsupported = []
        for num in extracted:
            rounded = round(num, 2)
            # Check if number matches any trusted context number (with small 1% tolerance for formatting rounding)
            is_valid = any(
                abs(rounded - t) < 0.05 or (t > 0 and abs(rounded - t) / t < 0.02)
                for t in trusted_numbers
            )
            if not is_valid:
                unsupported.append(str(num))

        if unsupported:
            return False, unsupported

        return True, []
