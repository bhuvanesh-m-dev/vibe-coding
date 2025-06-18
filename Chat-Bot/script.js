const chatLog = document.getElementById('chatLog');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');

// URL for your PHP proxy file on Hostinger
const OPENROUTER_PROXY_URL = 'openrouter_proxy.php'; 

// Store chat history to maintain conversation context
let chatHistory = []; 

async function sendMessage() {
    const message = userInput.value.trim();
    if (message === '') return;

    appendMessage(message, 'user-message');
    chatHistory.push({ role: "user", content: message }); // Add user message to history

    userInput.value = '';
    sendButton.disabled = true; // Disable button to prevent multiple rapid requests
    userInput.disabled = true; // Disable input too

    // Append a "typing" indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.classList.add('message', 'bot-message', 'typing-indicator');
    typingIndicator.textContent = 'AI is typing...';
    chatLog.appendChild(typingIndicator);
    chatLog.scrollTop = chatLog.scrollHeight; // Scroll to show typing indicator

    try {
        const response = await fetch(OPENROUTER_PROXY_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                prompt: message,
                history: chatHistory // Send the full history for context
                // You don't need to send modelId here if it's hardcoded in the PHP proxy
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Proxy Error: ${response.status} - ${errorData.message || 'Unknown error from proxy.'}`);
        }

        const data = await response.json();
        const botResponse = data.response; 

        // Remove typing indicator before appending actual response
        if (typingIndicator.parentNode) {
            chatLog.removeChild(typingIndicator);
        }
        
        appendMessage(botResponse, 'bot-message');
        chatHistory.push({ role: "assistant", content: botResponse }); // Add bot message to history

    } catch (error) {
        console.error("Error generating response:", error);
        // Remove typing indicator even on error
        if (typingIndicator.parentNode) {
            chatLog.removeChild(typingIndicator);
        }
        appendMessage("Sorry, I'm having trouble connecting right now. Please try again later.", 'bot-message');
    } finally {
        sendButton.disabled = false; // Re-enable button
        userInput.disabled = false; // Re-enable input
        userInput.focus(); // Put focus back on input field
        chatLog.scrollTop = chatLog.scrollHeight; // Ensure scrolled to bottom
    }
}

function appendMessage(text, className) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', className);
    messageDiv.textContent = text;
    chatLog.appendChild(messageDiv);
}

// Event listeners
sendButton.addEventListener('click', sendMessage);
userInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Initial greeting message when the page loads
appendMessage("Hello! I'm your AI chat assistant, powered by OpenRouter. Ask me anything!", 'bot-message');

// Optional: Limit chatHistory length for very long conversations
// function manageChatHistory() {
//     const maxHistoryTurns = 5; // Keep last 5 user-bot message pairs
//     if (chatHistory.length > maxHistoryTurns * 2) {
//         chatHistory = chatHistory.slice(chatHistory.length - (maxHistoryTurns * 2));
//     }
// }
// Call manageChatHistory() after each push to chatHistory in sendMessage()
