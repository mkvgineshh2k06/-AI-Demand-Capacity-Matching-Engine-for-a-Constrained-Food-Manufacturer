import os
import pytest
import pandas as pd
from app.rag.document_loader import DocumentLoader
from app.rag.chunker import DocumentChunker
from app.rag.embeddings import LocalEmbeddingEngine
from app.rag.vector_store import ChromaVectorStore
from app.rag.retriever import RAGRetriever
from app.rag.intent_router import IntentRouter
from app.rag.context_builder import ContextBuilder
from app.rag.ollama_client import OllamaClient
from app.rag.grounding_validator import GroundingValidator
from app.rag.rag_chat import answer_question

KNOWLEDGE_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "knowledge")

def test_document_loader():
    loader = DocumentLoader()
    docs = loader.load_directory(KNOWLEDGE_DIR)
    assert len(docs) >= 5, "Should load at least 5 knowledge documents"
    for doc in docs:
        assert "text" in doc
        assert "source" in doc
        assert "section" in doc
        assert "document_type" in doc

def test_document_chunker():
    loader = DocumentLoader()
    docs = loader.load_directory(KNOWLEDGE_DIR)
    chunker = DocumentChunker(target_chunk_size=500, overlap_size=80)
    chunks = chunker.chunk_documents(docs)
    assert len(chunks) >= len(docs), "Should produce chunks from documents"
    for chunk in chunks:
        assert "chunk_id" in chunk
        assert "text" in chunk
        assert "source" in chunk

def test_embeddings_and_vector_store():
    loader = DocumentLoader()
    docs = loader.load_directory(KNOWLEDGE_DIR)
    chunker = DocumentChunker()
    chunks = chunker.chunk_documents(docs)

    vs = ChromaVectorStore(collection_name="test_biokraft_collection")
    added = vs.add_chunks(chunks)
    assert added > 0

    results = vs.search("What is the Balanced strategy?", top_k=3)
    assert len(results) > 0
    assert "text" in results[0]
    assert "score" in results[0]

def test_intent_router():
    assert IntentRouter.classify_intent("What is the Balanced allocation strategy?") == "KNOWLEDGE"
    assert IntentRouter.classify_intent("Why is there a capacity shortage this month?") == "CURRENT_STATE"
    assert IntentRouter.classify_intent("What happens if co-manufacturing increases by 40 kg?") == "WHAT_IF"
    assert IntentRouter.classify_intent("Can we onboard a restaurant requiring 30 kg/month?") == "B2B"
    assert IntentRouter.classify_intent("Should we increase Pune marketing spend?") == "MARKETING"
    assert IntentRouter.classify_intent("Why is current operational risk high?") == "RISK"

def test_context_builder():
    ctx = ContextBuilder.build_live_context(
        intent="CURRENT_STATE",
        query="Why is there a shortage?",
        target_period="2024-05",
        strategy="balanced"
    )
    assert "forecast_total_demand_kg" in ctx
    assert "usable_capacity_kg" in ctx
    assert "shortage_kg" in ctx
    assert ctx["forecast_total_demand_kg"] == 5160.0
    assert ctx["usable_capacity_kg"] == 3950.0
    assert ctx["shortage_kg"] == 1212.0

def test_grounding_validator():
    trusted_context = {
        "shortage_kg": 1212.0,
        "usable_capacity_kg": 3950.0,
        "fulfillment_pct": 76.5
    }
    
    # Valid answer with exact numbers
    valid_ans = "The usable capacity is 3950 kg and shortage is 1212 kg with 76.5% fulfillment."
    is_valid, unsupp = GroundingValidator.validate_answer(valid_ans, trusted_context)
    assert is_valid is True

    # Invalid answer with hallucinated number
    hallucinated_ans = "The capacity shortage is 9999 kg and fulfillment is 12.3%."
    is_valid, unsupp = GroundingValidator.validate_answer(hallucinated_ans, trusted_context)
    assert is_valid is False
    assert len(unsupp) > 0

def test_ollama_client_health():
    health = OllamaClient.check_ollama_health()
    assert "ollama_running" in health
    assert "available_models" in health
    assert "configured_model" in health

def test_full_rag_pipeline_execution():
    res = answer_question(
        message="What is the Balanced allocation strategy?",
        strategy="balanced",
        target_period="2024-05"
    )
    assert res["status"] == "success"
    assert "answer" in res
    assert len(res["answer"]) > 10
    assert res["intent"] == "KNOWLEDGE"
    assert isinstance(res["sources"], list)
    assert "operational_context_used" in res
