// Import functions from share.js for modularity
import { generateShareUrl, copyToClipboard, shareOnWhatsApp, shareOnTelegram } from './share/share.js';

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');
    const shareButton = document.getElementById('shareButton');
    const shareModal = document.getElementById('shareModal');
    const closeShareModal = document.getElementById('closeShareModal');
    const shareLinkInput = document.getElementById('shareLinkInput');
    const copyShareLinkButton = document.getElementById('copyShareLink');
    const whatsappShareButton = document.getElementById('whatsappShare');
    const telegramShareButton = document.getElementById('telegramShare');

    let conversationHistory = []; // Stores the entire conversation (user and AI)

    /**
     * Appends a message to the chat interface.
     * @param {string} text - The message content.
     * @param {string} sender - 'user' or 'ai'.
     * @param {boolean} isTypingEffect - Whether to apply a typewriter effect (only for AI).
     */
    function appendMessage(text, sender, isTypingEffect = false) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message', `${sender}-message`);

        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble');

        if (isTypingEffect && sender === 'ai') {
            const typingSpan = document.createElement('p');
            typingSpan.classList.add('ai-typing');
            typingSpan.setAttribute('data-full-text', text);
            messageBubble.appendChild(typingSpan);
            messageDiv.classList.add('typing'); // Add class to trigger CSS
            messageDiv.appendChild(messageBubble);
            chatMessages.appendChild(messageDiv);
            typeWriterEffect(typingSpan, text, () => {
                messageDiv.classList.remove('typing'); // Remove class after typing
                scrollToBottom(); // Scroll once typing is complete
            });
        } else {
            messageBubble.innerHTML = `<p>${text}</p>`;
            messageDiv.appendChild(messageBubble);
            chatMessages.appendChild(messageDiv);
            scrollToBottom();
        }
    }

    /**
     * Implements the typewriter effect for AI messages.
     * @param {HTMLElement} element - The DOM element to apply the effect to.
     * @param {string} text - The full text to type.
     * @param {function} callback - Callback function to execute after typing is complete.
     */
    function typeWriterEffect(element, text, callback) {
        let i = 0;
        element.style.opacity = '1'; // Ensure it's visible
        element.style.width = 'fit-content'; // Allow content to dictate width

        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                requestAnimationFrame(type); // Use requestAnimationFrame for smoother animation
            } else {
                if (callback) callback();
            }
        }
        type();
    }

    /**
     * Scrolls the chat messages area to the bottom.
     */
    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    /**
     * Adjusts the height of the textarea based on its content.
     */
    function adjustTextareaHeight() {
        userInput.style.height = 'auto'; // Reset height
        userInput.style.height = userInput.scrollHeight + 'px'; // Set to scroll height
    }

    /**
     * Handles sending a message to the LLM (via a PHP proxy).
     * @param {string} message - The user's message.
     */
    async function sendMessage(message) {
        if (message.trim() === '') return;

        // Add user message to history and display
        conversationHistory.push({ role: 'user', content: message });
        appendMessage(message, 'user');
        userInput.value = ''; // Clear input
        adjustTextareaHeight(); // Reset textarea height

        sendButton.disabled = true;
        sendButton.classList.add('sending'); // Add animation class

        try {
            // Placeholder for API call to your PHP backend
            // Your PHP backend (api.php) will then call OpenRouter API.
            const response = await fetch('api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    messages: conversationHistory, // Send the full conversation history
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const aiResponse = data.reply; // Assuming your PHP returns { reply: "..." }

            // Add AI response to history and display with typing effect
            conversationHistory.push({ role: 'ai', content: aiResponse });
            appendMessage(aiResponse, 'ai', true);

        } catch (error) {
            console.error('Error sending message:', error);
            appendMessage(`Sorry, an error occurred: ${error.message}. Please try again.`, 'ai');
        } finally {
            sendButton.disabled = false;
            sendButton.classList.remove('sending'); // Remove animation class
            scrollToBottom(); // Final scroll to ensure visibility
        }
    }

    /**
     * Initializes the chat, checks for shared conversation URL.
     */
    function initializeChat() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');

        if (shareId) {
            // If a share ID is present, load the conversation
            // This part is actually handled by share-viewer.js now for a dedicated page.
            // On index.html, we just show the welcome message if no share ID.
            // This 'if' block primarily ensures the initial message appears only on a fresh start.
        }

        // Show the initial AI welcome message with typing effect
        const initialAiMessageElement = document.querySelector('.ai-message .ai-typing');
        if (initialAiMessageElement) {
            const fullText = initialAiMessageElement.getAttribute('data-full-text');
            initialAiMessageElement.textContent = ''; // Clear content for typing effect
            typeWriterEffect(initialAiMessageElement, fullText, () => {
                // Do nothing or maybe enable input after welcome
            });
        }
    }


    // Event Listeners
    sendButton.addEventListener('click', () => {
        sendMessage(userInput.value);
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, new line on Shift+Enter
            e.preventDefault(); // Prevent default new line
            sendMessage(userInput.value);
        }
    });

    userInput.addEventListener('input', adjustTextareaHeight);

    // Share button click
    shareButton.addEventListener('click', async () => {
        const conversationToShare = conversationHistory;

        // Make sure conversation history is not empty before attempting to share
        if (conversationToShare.length === 0 || (conversationToShare.length === 1 && conversationToShare[0].role === 'ai' && conversationToShare[0].content.includes("Hello! I'm CosmoMate"))) {
            alert("Start a conversation first before sharing!");
            return;
        }

        let shareId;
        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'save_conversation',
                    conversation: conversationToShare
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Failed to save conversation for sharing. Status: ${response.status}`);
            }
            const data = await response.json();
            shareId = data.shareId; // Assuming PHP returns { shareId: "..." }

        } catch (error) {
            console.error("Error saving conversation for sharing:", error);
            alert("Could not save conversation for sharing. Please try again.");
            return; // Stop if saving failed
        }


        if (shareId) {
            // IMPORTANT: The share-viewer.html is in the 'share' subdirectory.
            // Adjust this URL to point to your deployed share-viewer.html.
            const shareViewerBaseUrl = `${window.location.origin}/chat/share/share-viewer.html`;
            const shareUrl = generateShareUrl(shareViewerBaseUrl, shareId);
            shareLinkInput.value = shareUrl;

            // Set social share links
            whatsappShareButton.href = shareOnWhatsApp(shareUrl);
            telegramShareButton.href = shareOnTelegram(shareUrl);

            shareModal.style.display = 'flex'; // Show modal
        }
    });

    // Close share modal
    closeShareModal.addEventListener('click', () => {
        shareModal.style.display = 'none';
    });

    // Copy share link to clipboard
    copyShareLinkButton.addEventListener('click', () => {
        copyToClipboard(shareLinkInput.value);
        copyShareLinkButton.textContent = 'Copied!';
        setTimeout(() => {
            copyShareLinkButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
        }, 2000);
    });

    // Close modal if clicked outside
    window.addEventListener('click', (event) => {
        if (event.target === shareModal) {
            shareModal.style.display = 'none';
        }
    });

    // Initialize chat on page load
    initializeChat();
});
