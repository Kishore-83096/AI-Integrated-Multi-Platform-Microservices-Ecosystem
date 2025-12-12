import logging
import subprocess
import sys
from pathlib import Path
import requests

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

_model = None

# Model config
MODEL_NAME = "Mistral-7B-Instruct-v0.2"
MODEL_FILE = "mistral-7b-instruct-v0.2.Q4_K_M.gguf"
MODEL_FOLDER = Path("AIChat/llm")
MODEL_PATH = MODEL_FOLDER / MODEL_FILE
MODEL_URL = f"https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/{MODEL_FILE}"

# Ensure model folder exists
MODEL_FOLDER.mkdir(parents=True, exist_ok=True)

def install(package):
    subprocess.check_call([sys.executable, "-m", "pip", "install", package])

def download_model():
    """Download model from Hugging Face if not present."""
    if MODEL_PATH.exists():
        logger.info(f"Model already exists at {MODEL_PATH}")
        return

    logger.info(f"Downloading model from {MODEL_URL} ...")
    response = requests.get(MODEL_URL, stream=True)
    if response.status_code != 200:
        raise RuntimeError(f"Failed to download model: {response.status_code} {response.reason}")

    with open(MODEL_PATH, "wb") as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    logger.info(f"Model downloaded successfully to {MODEL_PATH}")

def get_model():
    """Lazy load the Mistral model."""
    global _model
    if _model is not None:
        return _model

    try:
        # Lazy install ctransformers
        try:
            from ctransformers import AutoModelForCausalLM
        except ImportError:
            logger.info("Installing ctransformers...")
            install("ctransformers")
            from ctransformers import AutoModelForCausalLM

        # Ensure model is downloaded
        download_model()

        logger.info(f"Loading Mistral 7B model from {MODEL_PATH} ...")
        _model = AutoModelForCausalLM.from_pretrained(
            str(MODEL_PATH),
            model_type="mistral",
            gpu_layers=0  # change >0 to use GPU layers if available
        )
        logger.info("Mistral 7B model loaded successfully!")
        return _model

    except Exception as e:
        logger.error(f"Failed to load model: {e}")
        raise

def generate_ai_response(user_message: str, max_tokens: int = 256) -> str:
    """Generate response from the AI model."""
    try:
        model = get_model()
        prompt = f"You are a helpful AI assistant.\nUser: {user_message}\nAI:"

        response = model(
            prompt,
            max_new_tokens=max_tokens,
            temperature=0.7,
            stop=["\nUser:", "\nAI:"]
        )

        if isinstance(response, dict):
            return response.get("outputs", "").strip()
        return str(response).strip()

    except Exception as e:
        logger.error(f"AI generation error: {e}")
        return "Sorry, I encountered an error generating a response."
