import os
import json
import urllib.request
import urllib.error
from typing import List, Dict, Any, Tuple

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
OLLAMA_DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:latest")

class OllamaClient:
    """
    Local Ollama REST API Client (`http://localhost:11434`).
    Provides health checking (`/api/tags`) and model chat (`/api/chat`).
    Gracefully handles offline states or missing models without crashing FastAPI.
    """

    def __init__(self, base_url: str = OLLAMA_BASE_URL, model: str = OLLAMA_DEFAULT_MODEL):
        self.base_url = base_url
        self.model = model

    @staticmethod
    def check_ollama_health() -> Dict[str, Any]:
        url = f"{OLLAMA_BASE_URL}/api/tags"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "BioKraft-RAG-Client"})
            with urllib.request.urlopen(req, timeout=3) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode('utf-8'))
                    models = [m.get("name") for m in data.get("models", [])]
                    return {
                        "ollama_running": True,
                        "base_url": OLLAMA_BASE_URL,
                        "available_models": models,
                        "configured_model": OLLAMA_DEFAULT_MODEL,
                        "model_installed": any(OLLAMA_DEFAULT_MODEL in m for m in models)
                    }
        except Exception as e:
            pass

        return {
            "ollama_running": False,
            "base_url": OLLAMA_BASE_URL,
            "available_models": [],
            "configured_model": OLLAMA_DEFAULT_MODEL,
            "model_installed": False,
            "error": "Ollama is not running. Start Ollama before using the Operations Copilot."
        }

    def chat_with_ollama(
        self,
        messages: List[Dict[str, str]],
        model_override: str = None,
        temperature: float = 0.2
    ) -> Tuple[bool, str]:
        model = model_override or self.model
        health = self.check_ollama_health()

        if not health["ollama_running"]:
            return False, "Ollama is not running. Start Ollama before using the Operations Copilot."

        if not health["available_models"]:
            return False, "Ollama is running, but no models are installed. Please pull a model using `ollama pull llama3.2:latest`."

        # If configured model isn't exact match, pick first available model as safe fallback
        if not health["model_installed"]:
            model = health["available_models"][0]

        url = f"{self.base_url}/api/chat"
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature,
                "top_p": 0.9
            }
        }

        try:
            req_data = json.dumps(payload).encode('utf-8')
            req = urllib.request.Request(
                url,
                data=req_data,
                headers={"Content-Type": "application/json", "User-Agent": "BioKraft-RAG-Client"}
            )

            with urllib.request.urlopen(req, timeout=30) as resp:
                if resp.status == 200:
                    resp_body = json.loads(resp.read().decode('utf-8'))
                    ans = resp_body.get("message", {}).get("content", "")
                    return True, ans.strip()
                else:
                    return False, f"Ollama HTTP {resp.status} error."
        except urllib.error.URLError as e:
            return False, f"Connection to Ollama failed: {str(e.reason)}"
        except Exception as e:
            return False, f"Ollama execution error: {str(e)}"
