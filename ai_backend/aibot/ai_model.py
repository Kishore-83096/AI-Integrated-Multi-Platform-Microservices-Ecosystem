# aibot/model.py
import logging
import requests
from pathlib import Path
from typing import Optional, Dict

# ======================================================
# LOGGING
# ======================================================
logger = logging.getLogger("aibot.model")
logger.setLevel(logging.INFO)

# ======================================================
# AI MODEL CONFIGURATION
# ======================================================
MODEL_DIR = Path("AIChat/llm")
MODEL_DIR.mkdir(parents=True, exist_ok=True)

# Multi-model support: define available models
AVAILABLE_MODELS = {
    "mistral": {
        "name": "Mistral-7B-Instruct-v0.2",
        "file": "mistral-7b-instruct-v0.2.Q4_K_M.gguf",
        "model_type": "mistral",
        "url": "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf",
        "config": {
            "gpu_layers": 30,           # stable for 4GB VRAM
            "threads": 12,              # CPU threads
            "context_length": 768,      # faster than 1024
            "temperature": 0.6,
            "top_p": 0.85,
            "top_k": 40,
        }
    },
    "tinyllama": {
        "name": "TinyLlama-1.1B-Chat-v1.0",
        "file": "tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
        "model_type": "llama",
        "url": "https://huggingface.co/TheBloke/TinyLlama-1.1B-Chat-v1.0-GGUF/resolve/main/tinyllama-1.1b-chat-v1.0.Q4_K_M.gguf",
        "config": {
            "gpu_layers": 50,           # TinyLlama is smaller, can use more layers
            "threads": 12,              # CPU threads
            "context_length": 1024,     # TinyLlama supports 1024
            "temperature": 0.6,
            "top_p": 0.85,
            "top_k": 40,
        }
    }
}

# Default model and name
DEFAULT_MODEL = "mistral"
MODEL_NAME = AVAILABLE_MODELS[DEFAULT_MODEL]["name"]

# Singleton model instances (one per model type)
_MODELS: Dict[str, Optional[object]] = {key: None for key in AVAILABLE_MODELS.keys()}


# ======================================================
# UTILITY: DOWNLOAD MODELS
# ======================================================
def download_model(model_type: str = DEFAULT_MODEL):
    """
    Downloads a model from Hugging Face if it doesn't exist locally.
    
    Args:
        model_type (str): Which model to download ('mistral' or 'tinyllama').
    """
    if model_type not in AVAILABLE_MODELS:
        raise ValueError(f"Unsupported model type: {model_type}")
    
    model_info = AVAILABLE_MODELS[model_type]
    model_path = MODEL_DIR / model_info["file"]
    
    # Skip if already exists
    if model_path.exists():
        logger.info(f"✓ Model file already exists: {model_path}")
        return
    
    logger.info(f"📥 Downloading {model_info['name']} from Hugging Face...")
    logger.info(f"   Source: {model_info['url']}")
    
    try:
        response = requests.get(model_info['url'], stream=True, timeout=300)
        response.raise_for_status()
        
        total_size = int(response.headers.get('content-length', 0))
        downloaded = 0
        chunk_size = 8192
        
        with open(model_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=chunk_size):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        percent = (downloaded / total_size) * 100
                        logger.info(f"   Progress: {percent:.1f}% ({downloaded / (1024*1024):.1f} MB)")
        
        logger.info(f"✅ Model downloaded successfully to {model_path}")
        
    except Exception as e:
        logger.error(f"Failed to download model: {e}")
        # Clean up partial file if download failed
        if model_path.exists():
            model_path.unlink()
        raise


# ======================================================
# AI MODEL LOADER (LAZY + SINGLETON PER MODEL)
# ======================================================
def get_model(model_type: str = DEFAULT_MODEL):
    """
    Loads an AI model only once (lazy loading per model type).
    Subsequent calls with same model_type reuse the cached model.
    
    Args:
        model_type (str): Which model to load ('mistral' or 'tinyllama').
        
    Returns:
        The loaded model instance.
        
    Raises:
        ValueError: If model_type is not supported.
    """
    global _MODELS
    
    if model_type not in AVAILABLE_MODELS:
        raise ValueError(
            f"Unsupported model type: {model_type}. "
            f"Available models: {list(AVAILABLE_MODELS.keys())}"
        )
    
    # Return cached model if already loaded
    if _MODELS[model_type] is not None:
        return _MODELS[model_type]
    
    model_info = AVAILABLE_MODELS[model_type]
    model_path = MODEL_DIR / model_info["file"]
    
    logger.info(f"🚀 Loading {model_info['name']} model (first request only)...")
    
    # Auto-download if missing
    if not model_path.exists():
        logger.info(f"⏳ Model not found. Auto-downloading...")
        download_model(model_type)
    
    # Note: Import inside the function to keep 'ctransformers' out of global scope
    from ctransformers import AutoModelForCausalLM
    
    config = model_info["config"]
    _MODELS[model_type] = AutoModelForCausalLM.from_pretrained(
        str(model_path),
        model_type=model_info["model_type"],
        gpu_layers=config["gpu_layers"],
        threads=config["threads"],
        context_length=config["context_length"],
    )
    
    logger.info(f"✅ {model_info['name']} loaded successfully")
    return _MODELS[model_type]


def generate_ai_response(message: str, max_tokens: int = 256, model_type: str = DEFAULT_MODEL) -> str:
    """
    Generate an AI response using the specified model.
    
    Args:
        message (str): The user's message.
        max_tokens (int): The maximum number of tokens to generate.
        model_type (str): Which model to use ('mistral' or 'tinyllama').

    Returns:
        str: The AI's generated response.
    """
    try:
        model = get_model(model_type)
        model_info = AVAILABLE_MODELS[model_type]
        config = model_info["config"]
        
        prompt = (
            "You are a helpful, accurate, and concise AI assistant.\n\n"
            f"User: {message}\n"
            "Assistant:"
        )

        output = model(
            prompt,
            max_new_tokens=max_tokens,
            temperature=config["temperature"],
            top_p=config["top_p"],
            top_k=config["top_k"],
            repetition_penalty=1.05,
            stop=["User:", "Assistant:"]
        )

        return str(output).strip()

    except Exception as e:
        logger.error(f"AI response generation failed with {model_type}", exc_info=True)
        return "Sorry, I couldn't generate a response right now."


# ======================================================
# UTILITY: FORMAT TIME FOR DISPLAY
# ======================================================
def format_time_duration(seconds: float) -> str:
    """
    Convert seconds to human-readable time format.
    
    Examples:
        - 5 seconds -> "5 seconds"
        - 120 seconds -> "2 minutes"
        - 4800 seconds -> "1hr 20mins"
        - 7325 seconds -> "2hrs 2mins"
    
    Args:
        seconds (float): Duration in seconds.
        
    Returns:
        str: Human-readable time duration.
    """
    if seconds < 60:
        # Less than a minute: show seconds
        return f"{int(round(seconds))} seconds"
    
    elif seconds < 3600:
        # Less than an hour: show minutes
        minutes = seconds / 60
        if minutes == int(minutes):
            return f"{int(minutes)} minute" if minutes == 1 else f"{int(minutes)} minutes"
        else:
            return f"{minutes:.1f} minutes"
    
    else:
        # An hour or more: show hours and minutes
        hours = int(seconds // 3600)
        remaining_seconds = seconds % 3600
        minutes = int(remaining_seconds // 60)
        
        hour_str = f"{hours}hr" if hours == 1 else f"{hours}hrs"
        
        if minutes == 0:
            return hour_str
        else:
            min_str = f"{minutes}min" if minutes == 1 else f"{minutes}mins"
            return f"{hour_str} {min_str}"


# Optionally, expose useful exports
__all__ = ["generate_ai_response", "get_model", "MODEL_NAME", "AVAILABLE_MODELS", "DEFAULT_MODEL", "format_time_duration"]
