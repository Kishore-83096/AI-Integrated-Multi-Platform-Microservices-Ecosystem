import requests

# -----------------------------
# Configuration
# -----------------------------
AUTH_BASE_URL = "http://localhost:8000/api/auth/"  # Auth microservice URL


# -----------------------------
# Register User
# -----------------------------
def auth_register(username, password):
    """
    Register a new user via Auth microservice.
    Returns JSON response.
    """
    url = f"{AUTH_BASE_URL}register/"
    payload = {
        "username": username,
        "password": password
    }
    try:
        response = requests.post(url, json=payload, timeout=10)
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": f"Auth service unreachable: {str(e)}"}


# -----------------------------
# Login User
# -----------------------------
def auth_login(username, password):
    """
    Login user via Auth microservice.
    Returns JSON response with access & refresh tokens.
    """
    url = f"{AUTH_BASE_URL}login/"
    payload = {
        "username": username,
        "password": password
    }
    try:
        response = requests.post(url, json=payload, timeout=10)
        return response.json()
    except requests.exceptions.RequestException as e:
        return {"error": f"Auth service unreachable: {str(e)}"}
