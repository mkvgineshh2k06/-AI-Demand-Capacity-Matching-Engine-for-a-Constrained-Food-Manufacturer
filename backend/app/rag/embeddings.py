import os
from typing import List
from sentence_transformers import SentenceTransformer

DEFAULT_EMBEDDING_MODEL = os.getenv("RAG_EMBEDDING_MODEL", "all-MiniLM-L6-v2")

class LocalEmbeddingEngine:
    """
    Local embedding generator powered by sentence-transformers.
    Runs 100% locally without external API dependencies.
    """

    def __init__(self, model_name: str = DEFAULT_EMBEDDING_MODEL):
        self.model_name = model_name
        self.model = SentenceTransformer(model_name)

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        embeddings = self.model.encode(texts, show_progress_bar=False, convert_to_numpy=True)
        return embeddings.tolist()

    def embed_query(self, query: str) -> List[float]:
        embedding = self.model.encode([query], show_progress_bar=False, convert_to_numpy=True)
        return embedding[0].tolist()
