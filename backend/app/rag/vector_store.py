import os
from typing import List, Dict, Any, Optional
import chromadb
from chromadb.config import Settings
from app.rag.embeddings import LocalEmbeddingEngine

CHROMA_DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "chroma")

class ChromaVectorStore:
    """
    Persistent ChromaDB vector database manager for BioKraft knowledge chunks.
    Supports document addition, index rebuild, similarity search, metadata filtering, and source listing.
    """

    def __init__(
        self,
        persist_dir: str = CHROMA_DATA_PATH,
        collection_name: str = "biokraft_knowledge",
        embedding_engine: Optional[LocalEmbeddingEngine] = None
    ):
        self.persist_dir = persist_dir
        self.collection_name = collection_name
        os.makedirs(self.persist_dir, exist_ok=True)

        self.client = chromadb.PersistentClient(path=self.persist_dir)
        self.embedding_engine = embedding_engine or LocalEmbeddingEngine()
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def add_chunks(self, chunks: List[Dict[str, Any]]) -> int:
        if not chunks:
            return 0

        ids = [c["chunk_id"] for c in chunks]
        texts = [c["text"] for c in chunks]
        metadatas = [
            {
                "source": c.get("source", "unknown"),
                "page": int(c.get("page", 1)),
                "section": str(c.get("section", "General")),
                "document_type": str(c.get("document_type", "general"))
            }
            for c in chunks
        ]

        embeddings = self.embedding_engine.embed_documents(texts)

        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas
        )

        return len(chunks)

    def search(
        self,
        query: str,
        top_k: int = 5,
        filters: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        if self.collection.count() == 0:
            return []

        query_embedding = self.embedding_engine.embed_query(query)

        where_filter = filters if filters else None

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=min(top_k, self.collection.count()),
            where=where_filter
        )

        documents = results.get("documents", [[]])[0]
        metadatas = results.get("metadatas", [[]])[0]
        distances = results.get("distances", [[]])[0]
        ids = results.get("ids", [[]])[0]

        matched = []
        for i in range(len(documents)):
            # Cosine distance to similarity score
            score = max(0.0, 1.0 - float(distances[i])) if i < len(distances) else 0.5
            matched.append({
                "chunk_id": ids[i],
                "text": documents[i],
                "source": metadatas[i].get("source", "unknown"),
                "page": metadatas[i].get("page", 1),
                "section": metadatas[i].get("section", "General"),
                "document_type": metadatas[i].get("document_type", "general"),
                "score": round(score, 4)
            })

        return matched

    def reset_index(self):
        try:
            self.client.delete_collection(self.collection_name)
        except Exception:
            pass
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def list_sources(self) -> List[Dict[str, Any]]:
        count = self.collection.count()
        if count == 0:
            return []

        all_records = self.collection.get(include=["metadatas"])
        sources_set = {}

        for meta in all_records.get("metadatas", []):
            src = meta.get("source", "unknown")
            doc_type = meta.get("document_type", "general")
            if src not in sources_set:
                sources_set[src] = {"source": src, "document_type": doc_type, "chunks": 0}
            sources_set[src]["chunks"] += 1

        return list(sources_set.values())

    def get_stats(self) -> Dict[str, Any]:
        return {
            "total_chunks": self.collection.count(),
            "sources_count": len(self.list_sources()),
            "collection_name": self.collection_name,
            "persist_dir": self.persist_dir
        }
