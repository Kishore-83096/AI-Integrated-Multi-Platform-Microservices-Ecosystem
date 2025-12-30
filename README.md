# AI-Integrated Multi-Platform Microservices Ecosystem

A distributed microservices ecosystem where all applications communicate through secure REST APIs and share a centralized user identity system. All microservices use **JWT-based authentication** for trusted and secure cross-service communication.

---

## Key Technologies

**Frontend:** HTML5, CSS3, JavaScript (ES6+), React.js  
**Backend:** Python, Django, Django REST Framework, JWT Authentication, REST APIs, llama-cpp-python, LLMs (Mistral-7B, TinyLlama-1.1B)  
**Database:** MySQL  

---

## Microservices Overview

### 1. Central User Management Microservice
- Standalone Authentication & Profile Service acting as the core identity provider (SSO) for all applications.  
- Handles **registration, login, profile management**, and issues JWT tokens consumed by all microservices for authorization.

### 2. AI Chatbot Microservice
- LLM-powered AI assistant with **dynamic model switching**:  
  - **TinyLlama-1.1B** → guest users  
  - **Mistral-7B-Instruct (Q4_K_M)** → authenticated users  
- Supports **chat history** and an **AI orchestration layer** capable of performing actions across other microservices using authenticated API calls.

### 3. E-commerce Microservice
- Modular electronics-focused e-commerce service with **product catalog, search, cart, checkout, and order history**.  
- Integrated with the **user service** using JWT validation for securing user-specific operations.

### 4. Additional Services in Development
- Music Service microservice for **playlists, recommendations, and user preferences**.  
- Fully integrated with the AI assistant and JWT-secured communication.

---

## Project Highlights
- **Secure communication** between services using JWT.  
- **Modular architecture** enabling independent microservice deployment and scalability.  
- **AI integration** for personalized assistance and orchestration across services.  
- **Database-driven** backend with Django ORM and MySQL.

---

## Getting Started

### Clone the repository
```bash
git clone https://github.com/Kishore-83096/AI-Integrated-Multi-Platform-Microservices-Ecosystem.git
cd AI-Integrated-Multi-Platform-Microservices-Ecosystem

# Example for Django services
cd <service-folder>
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver

cd <frontend-folder>
npm install
npm start


---