# Lexino.ai

Lexino.ai is a sophisticated, web-based AI chat interface designed for a seamless and customizable user experience. It features persistent chat history, multi-modal input support, and a responsive design that works across devices.

## 🚀 Features

### Core Functionality
- **Persistent Chat History**: Conversations are automatically saved and organized by time (Today, Yesterday, Previous 7 Days, Older).
- **Search**: Instantly filter through your chat history to find specific discussions.
- **Temporary Mode**: Toggle "Temp Mode" for ephemeral conversations that aren't saved to history.
- **Markdown Support**: AI responses are rendered with Markdown, supporting code blocks and formatting.

### Multi-Modal Inputs
- **File Attachments**: Upload images and text files (up to 50 files, 100MB limit) to analyze with the AI.
- **Voice Input**: Built-in speech-to-text functionality using the Web Speech API.

### Customization & UI
- **Dynamic Wallpapers**: Choose from visual themes like Aurora, Neon, Mesh, Galaxy, and Sunset.
- **Profile Settings**: Customize your display name, email, and bio.
- **Branding**: Upload a custom brand image for the sidebar.
- **Responsive Design**: Collapsible sidebar and mobile-friendly layout.

## 🛠️ Technical Overview

The project is built with vanilla JavaScript and relies on LocalStorage for client-side persistence.

- **`script.js`**: Manages the UI state, event handling, chat session management (`lexino_chat_sessions_v2`), and user preferences.
- **`api.js`**: Handles communication with the backend LLM service. It intelligently switches between local (`http://127.0.0.1:3000`) and production endpoints.

## 📦 Installation & Usage

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Lexino.ai.git
   ```

2. **Backend Setup**
   Ensure you have a compatible backend server running. The frontend expects a POST endpoint at `/api/chat` (or `http://127.0.0.1:3000/api/chat` for local development) that accepts JSON bodies with `content`, `history`, `selectedModel`, and `maxTokens`.

3. **Launch**
   Open the `index.html` file in your preferred web browser.

## ⚙️ Configuration

### API Configuration
The `api.js` file contains logic to determine the API endpoint based on the window's hostname.

### Models
The application defaults to `meta-llama/Meta-Llama-3-8B-Instruct` but supports model selection if a `<select id="modelSelect">` element is present in the DOM.

## 📄 License

[Add License Information Here]