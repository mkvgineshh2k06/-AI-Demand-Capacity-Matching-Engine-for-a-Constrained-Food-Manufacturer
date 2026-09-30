import os
from typing import Dict, Any, List, Optional

from app.rag.intent_router import IntentRouter
from app.rag.retriever import RAGRetriever
from app.rag.context_builder import ContextBuilder
from app.rag.ollama_client import OllamaClient
from app.rag.grounding_validator import GroundingValidator

# Bounded conversation memory across sessions (last 4-6 turns)
SESSION_MEMORY: Dict[str, List[Dict[str, str]]] = {}

SYSTEM_PROMPT = """You are the BioKraft Operations Copilot — a grounded AI assistant for BioKraft Foods Private Limited.

Answer the user's question using ONLY the supplied RETRIEVED KNOWLEDGE and LIVE OPERATIONAL CONTEXT below.

CRITICAL NON-NEGOTIABLE RULES:
1. DO NOT INVENT OR CALCULATE ANY BUSINESS NUMBERS.
2. DO NOT perform your own math or change numeric values.
3. Every single metric (forecast demand, usable capacity, shortage gap, fulfillment %, revenue, cost, SLA score) MUST come directly from the LIVE OPERATIONAL CONTEXT.
4. If the question cannot be answered using the provided context, state clearly: "I do not have enough grounded information to answer this reliably."
5. Be concise, operational, professional, and explain reasoning in plain language.
6. Clearly distinguish between documented policies, live system outputs, and operational assumptions.
"""

def answer_question(
    message: str,
    session_id: Optional[str] = "default_session",
    strategy: Optional[str] = "balanced",
    risk_mode: Optional[str] = "balanced",
    target_period: Optional[str] = "2024-05",
    current_scenario: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    """
    Main RAG Chat entry point executing the 7-step pipeline:
    1. Detect intent
    2. Retrieve relevant documents
    3. Gather live backend context
    4. Construct grounded prompt
    5. Call local Ollama LLM
    6. Validate grounding (numeric check)
    7. Return structured response payload
    """
    session_key = session_id or "default_session"
    history = SESSION_MEMORY.get(session_key, [])

    # 1. Intent Detection
    intent = IntentRouter.classify_intent(message)

    # 2. RAG Knowledge Retrieval
    retriever = RAGRetriever(relevance_threshold=0.20)
    retrieved_chunks = retriever.retrieve_context(query=message, top_k=4)

    sources = []
    seen_sources = set()
    retrieved_text_block = []

    for chunk in retrieved_chunks:
        src = chunk.get("source", "unknown")
        pg = chunk.get("page", 1)
        sec = chunk.get("section", "General")
        retrieved_text_block.append(f"Source [{src} | Page {pg} | Section {sec}]:\n{chunk['text']}")
        
        src_key = f"{src}_p{pg}_{sec}"
        if src_key not in seen_sources:
            seen_sources.add(src_key)
            sources.append({
                "source": src,
                "page": pg,
                "section": sec
            })

    # 3. Live Operational Context Gathering
    live_context = ContextBuilder.build_live_context(
        intent=intent,
        query=message,
        target_period=target_period or "2024-05",
        strategy=strategy or "balanced",
        risk_mode=risk_mode or "balanced",
        current_scenario=current_scenario
    )

    # 4. Construct Grounded Prompt
    context_str = f"LIVE OPERATIONAL CONTEXT ({target_period} | Strategy: {strategy.upper()} | Risk: {risk_mode.upper()}):\n"
    context_str += f"- Forecast Demand: {live_context.get('forecast_total_demand_kg', 5160.0):,.0f} kg\n"
    context_str += f"- Usable Capacity: {live_context.get('usable_capacity_kg', 3950.0):,.0f} kg\n"
    context_str += f"- Shortage Deficit Gap: {live_context.get('shortage_kg', 1212.0):,.0f} kg\n"
    context_str += f"- System Fulfillment Rate: {live_context.get('fulfillment_pct', 76.5):.1f}%\n"
    context_str += f"- B2B Contract Fulfillment: {live_context.get('b2b_fulfillment_pct', 92.4):.1f}%\n"
    context_str += f"- D2C Consumer Fulfillment: {live_context.get('d2c_fulfillment_pct', 52.6):.1f}%\n"
    context_str += f"- Projected Revenue: ₹{(live_context.get('projected_revenue_inr', 1673168.0) / 100000):.2f}L\n"
    context_str += f"- Risk Level: {live_context.get('risk_level', 'HIGH')}\n"

    if "what_if_simulation" in live_context:
        sim = live_context["what_if_simulation"]
        context_str += f"\nWHAT-IF SCENARIO SIMULATION:\n"
        context_str += f"- Original Shortage: {sim['original_shortage_kg']} kg → New Shortage: {sim['new_shortage_kg']} kg\n"
        context_str += f"- New Usable Capacity: {sim['new_usable_capacity_kg']} kg\n"
        context_str += f"- New System Fulfillment: {sim['new_fulfillment_pct']:.1f}%\n"

    if "b2b_evaluation" in live_context:
        b2b = live_context["b2b_evaluation"]
        context_str += f"\nB2B CONTRACT EVALUATION:\n"
        context_str += f"- Requested Volume: {b2b['requested_monthly_quantity_kg']} kg/month\n"
        context_str += f"- Feasible: {b2b['feasible']} | Recommendation: {b2b['recommendation']}\n"
        context_str += f"- SLA Breach Risk Score: {b2b['sla_breach_risk_score']:.1f}/100\n"

    knowledge_str = "\n".join(retrieved_text_block) if retrieved_text_block else "No specific document chunks retrieved."

    user_prompt = f"""{context_str}

RETRIEVED DOCUMENT KNOWLEDGE:
{knowledge_str}

USER QUESTION: {message}

Please provide a concise, grounded explanation:"""

    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
    ]

    # Append recent turns (bounded history: last 4 turns)
    for turn in history[-4:]:
        messages.append(turn)

    messages.append({"role": "user", "content": user_prompt})

    # 5. Call Local Ollama LLM
    ollama = OllamaClient()
    success, llm_response = ollama.chat_with_ollama(messages, temperature=0.1)

    warnings = []
    ollama_used = True

    if not success:
        # Fallback to deterministic grounded answer if Ollama is offline or fails
        warnings.append(llm_response)
        ollama_used = False
        llm_response = _generate_deterministic_fallback(intent, message, live_context, retrieved_chunks)

    else:
        # 6. Grounding Validation
        valid, unsupported_nums = GroundingValidator.validate_answer(llm_response, live_context)
        if not valid:
            warnings.append(f"Grounding validator flagged unsupported numeric values: {unsupported_nums}. Regenerating with strict correction...")
            # Single retry with explicit correction instruction
            retry_messages = messages + [
                {"role": "assistant", "content": llm_response},
                {"role": "user", "content": f"STRICT CORRECTION: You introduced unsupported numbers: {unsupported_nums}. Rewrite your answer using ONLY exact numbers from the LIVE OPERATIONAL CONTEXT above."}
            ]
            retry_success, retry_ans = ollama.chat_with_ollama(retry_messages, temperature=0.0)
            if retry_success and GroundingValidator.validate_answer(retry_ans, live_context)[0]:
                llm_response = retry_ans
            else:
                warnings.append("Retry validation failed. Falling back to deterministic grounded response.")
                llm_response = _generate_deterministic_fallback(intent, message, live_context, retrieved_chunks)

    # Update session memory
    history.append({"role": "user", "content": message})
    history.append({"role": "assistant", "content": llm_response})
    SESSION_MEMORY[session_key] = history[-6:]

    confidence = "HIGH" if (retrieved_chunks or "summary" in live_context) else "MEDIUM"
    if not ollama_used:
        confidence = "HIGH (Deterministic Grounded Engine)"

    return {
        "status": "success",
        "answer": llm_response,
        "intent": intent,
        "sources": sources,
        "operational_context_used": live_context.get("operational_context_used", []),
        "confidence": confidence,
        "warnings": warnings,
        "ollama_used": ollama_used
    }

def _generate_deterministic_fallback(
    intent: str, query: str, live_context: Dict[str, Any], retrieved_chunks: List[Dict[str, Any]]
) -> str:
    """Deterministic grounded response fallback when Ollama is offline or fails validation."""
    summary = live_context.get("summary", {})
    rev_l = (live_context.get("projected_revenue_inr", 1673168.0) / 100000)

    if intent == "WHAT_IF" and "what_if_simulation" in live_context:
        sim = live_context["what_if_simulation"]
        return f"**Scenario Simulation Result** for {live_context.get('target_period')}:\n\n" \
               f"• **Original Shortage**: {sim['original_shortage_kg']:.0f} kg → **New Shortage**: {sim['new_shortage_kg']:.0f} kg\n" \
               f"• **New Usable Capacity**: {sim['new_usable_capacity_kg']:.0f} kg\n" \
               f"• **New Fulfillment Rate**: {sim['new_fulfillment_pct']:.1f}%\n\n" \
               f"Expanding co-manufacturing capacity directly reduces the shortage deficit and boosts system fulfillment."

    if intent == "B2B" and "b2b_evaluation" in live_context:
        b2b = live_context["b2b_evaluation"]
        return f"**B2B Account Feasibility Evaluation**:\n\n" \
               f"• **Requested Contract Volume**: {b2b['requested_monthly_quantity_kg']} kg/month\n" \
               f"• **Feasibility Status**: {b2b['recommendation']} ({'Feasible' if b2b['feasible'] else 'Requires Capacity Expansion'})\n" \
               f"• **SLA Breach Risk Score**: {b2b['sla_breach_risk_score']:.1f}/100\n\n" \
               f"The B2B engine recommends accepting the contract provided co-manufacturing expansion or unallocated headroom is active."

    if intent == "KNOWLEDGE" and retrieved_chunks:
        doc = retrieved_chunks[0]
        return f"**BioKraft Operational Knowledge** (Source: {doc.get('source')} | Section: {doc.get('section')}):\n\n" \
               f"{doc['text'][:400]}..."

    return f"**BioKraft Live Operational Context — {live_context.get('target_period')}**:\n\n" \
           f"• **Forecast Demand**: {live_context.get('forecast_total_demand_kg', 5160):,.0f} kg\n" \
           f"• **Usable Capacity**: {live_context.get('usable_capacity_kg', 3950):,.0f} kg\n" \
           f"• **Shortage Deficit**: {live_context.get('shortage_kg', 1212):,.0f} kg\n" \
           f"• **Fulfillment Rate**: {live_context.get('fulfillment_pct', 76.5):.1f}% (B2B: {live_context.get('b2b_fulfillment_pct', 92.4):.1f}% | D2C: {live_context.get('d2c_fulfillment_pct', 52.6):.1f}%)\n" \
           f"• **Projected Revenue**: ₹{rev_l:.2f}L\n" \
           f"• **Active Strategy**: {live_context.get('strategy', 'balanced').upper()}"
