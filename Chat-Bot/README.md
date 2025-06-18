# 🌌 VibeChat: AI Chatbot via OpenRouter API

A chill coding journey guided by **Google Gemini ⚡**, deploying a custom AI chatbot for seamless conversations.

This project embodies the spirit of *"Vibe Coding"* – creating something cool and functional with focused, enjoyable development. It showcases how easily a powerful AI can be integrated into a simple web application using the **OpenRouter API**, all hosted efficiently on a shared environment.

---

## ✨ Features

- **Responsive Chat Interface**  
  A clean, modern, and intuitive chat UI that adapts to different screen sizes.

- **Real-time AI Responses**  
  Powered by advanced Large Language Models accessed via the OpenRouter API.

- **Secure API Key Handling**  
  Utilizes a lightweight PHP proxy to securely manage the OpenRouter API key on the server-side.

- **Cross-Origin Request Handling**  
  Properly configured for seamless communication between your frontend and the API proxy.

- **Effortless Deployment**  
  Designed for easy setup on standard shared hosting environments like Hostinger.

---

## 🚀 Technologies Used

### Frontend

- **HTML5**: Core structure of the chat interface  
- **CSS3**: Modern, clean, and responsive styling  
- **JavaScript (ES6+)**: Dynamic chat functionality, user interaction, and API communication

### Backend Proxy

- **PHP**: Robust server-side language used to create a secure proxy for handling API requests

### AI Integration

- **OpenRouter API**: Unified API platform providing access to various cutting-edge LLMs (e.g., DeepSeek, Mistral)

### Development Assistant

- **Google Gemini**: Provided conceptual guidance, code generation, and debugging support

---

## 🛠️ Setup & Deployment

This project is designed for deployment on a **shared hosting environment** (like Hostinger) that supports PHP.

### 1. Obtain OpenRouter API Key

- Visit [https://openrouter.ai](https://openrouter.ai) and sign up
- Go to **Dashboard > Keys** and generate a new API key
- Copy the model ID string from the **Models** page (e.g., `deepseek-ai/deepseek-chat`)

### 2. Configure PHP Proxy (`openrouter_proxy.php`)

- Create a file named `openrouter_proxy.php`
- In this file:
  - Replace `'YOUR_OPENROUTER_API_KEY_HERE'` with your actual API key
  - Set `$defaultModelId` to your selected model ID
  - Replace `https://your-hostinger-domain.com` with your actual domain (e.g., `https://bhuvaneshm.in`)

### 3. Frontend Files (`index.html`, `style.css`, `script.js`)

- Ensure `script.js` has:
  ```js
  const OPENROUTER_PROXY_URL = 'openrouter_proxy.php';
