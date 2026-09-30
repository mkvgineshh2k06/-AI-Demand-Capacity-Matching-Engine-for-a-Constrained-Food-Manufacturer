import re
from typing import List, Dict, Any

class DocumentChunker:
    """
    Chunks document text into ~500-800 token blocks with ~80-120 token overlap.
    Preserves headings with each chunk where possible and avoids splitting tables or lists.
    Each chunk contains metadata: chunk_id, source, page, section, document_type.
    """

    def __init__(self, target_chunk_size: int = 600, overlap_size: int = 100):
        # Using character approximation: ~4 chars per token
        self.target_chars = target_chunk_size * 4
        self.overlap_chars = overlap_size * 4

    def chunk_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        chunks = []
        chunk_counter = 0

        for doc in documents:
            text = doc.get("text", "")
            source = doc.get("source", "unknown")
            page = doc.get("page", 1)
            section = doc.get("section", "General")
            doc_type = doc.get("document_type", "general")

            doc_chunks = self._chunk_single_text(text, source, page, section, doc_type, chunk_counter)
            chunks.extend(doc_chunks)
            chunk_counter += len(doc_chunks)

        return chunks

    def _chunk_single_text(
        self, text: str, source: str, page: int, section: str, doc_type: str, start_id: int
    ) -> List[Dict[str, Any]]:
        if len(text) <= self.target_chars:
            return [{
                "chunk_id": f"{source}_p{page}_{start_id}",
                "text": text,
                "source": source,
                "page": page,
                "section": section,
                "document_type": doc_type
            }]

        # Split by paragraphs / headings to preserve semantic boundaries
        paragraphs = re.split(r'\n\s*\n', text)
        chunks = []
        current_chunk = []
        current_length = 0
        local_id = start_id

        for para in paragraphs:
            para = para.strip()
            if not para:
                continue

            para_len = len(para)

            if current_length + para_len > self.target_chars and current_chunk:
                chunk_text = "\n\n".join(current_chunk)
                # Prepend section heading context if not already at start
                if section and section != "General" and not chunk_text.startswith(section):
                    chunk_text = f"[{section}]\n{chunk_text}"

                chunks.append({
                    "chunk_id": f"{source}_p{page}_{local_id}",
                    "text": chunk_text,
                    "source": source,
                    "page": page,
                    "section": section,
                    "document_type": doc_type
                })
                local_id += 1

                # Maintain overlap from trailing paragraphs
                overlap_text = []
                accumulated = 0
                for p in reversed(current_chunk):
                    if accumulated + len(p) <= self.overlap_chars:
                        overlap_text.insert(0, p)
                        accumulated += len(p)
                    else:
                        break

                current_chunk = overlap_text
                current_length = accumulated

            current_chunk.append(para)
            current_length += para_len

        if current_chunk:
            chunk_text = "\n\n".join(current_chunk)
            if section and section != "General" and not chunk_text.startswith(section):
                chunk_text = f"[{section}]\n{chunk_text}"

            chunks.append({
                "chunk_id": f"{source}_p{page}_{local_id}",
                "text": chunk_text,
                "source": source,
                "page": page,
                "section": section,
                "document_type": doc_type
            })

        return chunks
