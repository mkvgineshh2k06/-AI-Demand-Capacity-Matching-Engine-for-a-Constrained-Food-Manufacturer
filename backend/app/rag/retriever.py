from typing import List, Dict, Any, Optional
from app.rag.vector_store import ChromaVectorStore

class RAGRetriever:
    """
    RAG Retriever with relevance thresholding.
    Filters out weak chunks to prevent hallucination from low-quality hits.
    """

    def __init__(self, vector_store: Optional[ChromaVectorStore] = None, relevance_threshold: float = 0.25):
        self.vector_store = vector_store or ChromaVectorStore()
        self.relevance_threshold = relevance_threshold

    def retrieve_context(
        self,
        query: str,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        results = self.vector_store.search(query=query, top_k=top_k, filters=filters)

        # Apply relevance threshold
        filtered = [doc for doc in results if doc.get("score", 0.0) >= self.relevance_threshold]

        return filtered
