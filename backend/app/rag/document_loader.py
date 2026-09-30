import os
import re
from typing import List, Dict, Any

try:
    import pymupdf  # PyMuPDF
except ImportError:
    try:
        import fitz as pymupdf
    except ImportError:
        pymupdf = None

try:
    import docx
except ImportError:
    docx = None

class DocumentLoader:
    """
    Standardized document loader for PDF, DOCX, TXT, and Markdown files.
    Extracts text, source filename, page number (where applicable), section/heading, and document_type.
    """

    @staticmethod
    def load_document(file_path: str) -> List[Dict[str, Any]]:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Document file not found: {file_path}")

        ext = os.path.splitext(file_path)[1].lower()
        source_name = os.path.basename(file_path)
        doc_type = os.path.basename(os.path.dirname(file_path)) or "general"

        if ext == ".pdf":
            return DocumentLoader._load_pdf(file_path, source_name, doc_type)
        elif ext == ".docx":
            return DocumentLoader._load_docx(file_path, source_name, doc_type)
        elif ext in [".txt", ".md", ".markdown"]:
            return DocumentLoader._load_text(file_path, source_name, doc_type)
        else:
            raise ValueError(f"Unsupported document extension: {ext}")

    @staticmethod
    def _load_pdf(file_path: str, source: str, doc_type: str) -> List[Dict[str, Any]]:
        documents = []
        if pymupdf is None:
            # Fallback text reading if pymupdf is missing
            with open(file_path, 'rb') as f:
                content = f.read().decode('utf-8', errors='ignore')
            return [{
                "text": content,
                "source": source,
                "page": 1,
                "section": "Main",
                "document_type": doc_type
            }]

        doc = pymupdf.open(file_path)
        for page_idx in range(len(doc)):
            page = doc[page_idx]
            text = page.get_text()
            if not text.strip():
                continue
            
            # Simple heading extraction heuristics
            first_line = text.strip().split('\n')[0] if text.strip() else "Section"
            section = first_line[:60] if len(first_line) <= 60 else "General"

            documents.append({
                "text": text.strip(),
                "source": source,
                "page": page_idx + 1,
                "section": section,
                "document_type": doc_type
            })
        return documents

    @staticmethod
    def _load_docx(file_path: str, source: str, doc_type: str) -> List[Dict[str, Any]]:
        if docx is None:
            raise ImportError("python-docx is required to load .docx files")

        doc = docx.Document(file_path)
        documents = []
        current_section = "General"
        current_text = []

        for p in doc.paragraphs:
            text = p.text.strip()
            if not text:
                continue

            if p.style.name.startswith('Heading') or text.startswith('#'):
                if current_text:
                    documents.append({
                        "text": "\n".join(current_text),
                        "source": source,
                        "page": 1,
                        "section": current_section,
                        "document_type": doc_type
                    })
                    current_text = []
                current_section = text
            else:
                current_text.append(text)

        if current_text:
            documents.append({
                "text": "\n".join(current_text),
                "source": source,
                "page": 1,
                "section": current_section,
                "document_type": doc_type
            })

        return documents

    @staticmethod
    def _load_text(file_path: str, source: str, doc_type: str) -> List[Dict[str, Any]]:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read()

        documents = []
        # Split by Markdown H1/H2 headers (# or ##) if present
        sections = re.split(r'\n(?=#{1,3}\s+)', content)
        
        for idx, sec in enumerate(sections):
            sec_text = sec.strip()
            if not sec_text:
                continue

            lines = sec_text.split('\n')
            heading_match = re.match(r'^(#{1,3}\s+)?(.+)', lines[0])
            section_title = heading_match.group(2).strip() if heading_match else f"Section {idx+1}"

            documents.append({
                "text": sec_text,
                "source": source,
                "page": 1,
                "section": section_title,
                "document_type": doc_type
            })

        return documents

    @classmethod
    def load_directory(cls, dir_path: str) -> List[Dict[str, Any]]:
        all_docs = []
        if not os.path.exists(dir_path):
            return all_docs

        for root, _, files in os.walk(dir_path):
            for file in files:
                ext = os.path.splitext(file)[1].lower()
                if ext in [".pdf", ".docx", ".txt", ".md", ".markdown"]:
                    full_path = os.path.join(root, file)
                    try:
                        docs = cls.load_document(full_path)
                        all_docs.extend(docs)
                    except Exception as e:
                        print(f"Error loading {full_path}: {e}")

        return all_docs
