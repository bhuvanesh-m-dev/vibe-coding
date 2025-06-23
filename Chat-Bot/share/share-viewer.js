// Import functions from share.js for modularity
import { generateShareUrl, copyToClipboard, shareOnWhatsApp, shareOnTelegram } from './share.js';

document.addEventListener('DOMContentLoaded', () => {
    const chatMessages = document.getElementById('chatMessages');
    const userInput = document.getElementById('userInput');
    const sendButton = document.getElementById('sendButton');

    // New elements for the share functionality on share-viewer page
    const shareButton = document.getElementById('shareButton');
    const shareModal = document.getElementById('shareModal');
    const closeShareModal = document.getElementById('closeShareModal');
    const shareLinkInput = document.getElementById('shareLinkInput');
    const copyShareLinkButton = document.getElementById('copyShareLink');
    const whatsappShareButton = document.getElementById('whatsappShare');
    const telegramShareButton = document.getElementById('telegramShare');

    let conversationHistory = []; // Stores the loaded conversation and new messages

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
        element.style.opacity = '1';
        element.style.width = 'fit-content';

        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                requestAnimationFrame(type);
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
            // This will call the same api.php endpoint as the main index.html
            const response = await fetch('../api.php', { // Note the '../' to go up one directory
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
            scrollToBottom(); // Final scroll
        }
    }

    /**
     * Initializes the share viewer by loading the conversation from the URL parameter.
     */
    async function initializeShareViewer() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');

        if (!shareId) {
            chatMessages.innerHTML = ''; // Clear "Loading..."
            appendMessage("No conversation ID found. This link might be broken.", 'ai');
            return;
        }

        chatMessages.innerHTML = ''; // Clear initial "Loading..." message
        appendMessage('Loading shared conversation...', 'ai');

        try {
            // Fetch the conversation from your api.php or directly from storage/shared-conversations
            // Using api.php is safer and allows for server-side validation/logging.
            const response = await fetch(`../api.php?action=load_shared&id=${shareId}`); // Adjust path as needed

            if (!response.ok) {
                throw new Error(`Could not load shared conversation. Status: ${response.status}`);
            }

            const sharedData = await response.json();

            // --- IMPORTANT FIX: Validate sharedData is an array ---
            if (!Array.isArray(sharedData)) {
                throw new Error("Invalid shared conversation data format. Expected an array.");
            }
            // ---------------------------------------------------

            conversationHistory = sharedData; // The API should return the conversation array directly

            // Re-render conversation
            chatMessages.innerHTML = ''; // Clear loading message
            conversationHistory.forEach(msg => {
                appendMessage(msg.content, msg.role, false); // No typing effect for loaded messages
            });
            scrollToBottom();
            appendMessage("You can continue this conversation!", 'ai');

        } catch (error) {
            console.error('Error loading shared conversation:', error);
            chatMessages.innerHTML = ''; // Clear any previous messages
            appendMessage(`Failed to load shared conversation: ${error.message}.`, 'ai');
            appendMessage("Please check the link or start a new conversation.", 'ai');
        }
    }

    // Event Listeners for continuing the conversation
    sendButton.addEventListener('click', () => {
        sendMessage(userInput.value);
    });

    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage(userInput.value);
        }
    });

    userInput.addEventListener('input', adjustTextareaHeight);

    // New Share button click handler for the share-viewer page
    if (shareButton) {
        shareButton.addEventListener('click', async () => {
            // Ensure there's actual conversation to share beyond just the initial loaded one
            if (conversationHistory.length === 0) {
                alert("Nothing to share yet! Start typing to add to the conversation.");
                return;
            }

            let shareId;
            try {
                const response = await fetch('../api.php', { // Path to api.php from share/ folder
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'save_conversation',
                        conversation: conversationHistory // Send the current (potentially modified) history
                    }),
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || `Failed to save new conversation for sharing. Status: ${response.status}`);
                }
                const data = await response.json();
                shareId = data.shareId; // Assuming PHP returns { shareId: "..." }

            } catch (error) {
                console.error("Error saving new conversation for sharing:", error);
                alert("Could not save new conversation for sharing. Please try again.");
                return; // Stop if saving failed
            }


            if (shareId) {
                // The share URL for this page will still be share-viewer.html
                const shareViewerBaseUrl = `${window.location.origin}/chat/share/share-viewer.html`;
                const shareUrl = generateShareUrl(shareViewerBaseUrl, shareId);
                shareLinkInput.value = shareUrl;

                // Set social share links
                whatsappShareButton.href = shareOnWhatsApp(shareUrl);
                telegramShareButton.href = shareOnTelegram(shareUrl);

                // Show the modal
                if (shareModal) {
                    shareModal.style.display = 'flex';
                    console.log('Share modal displayed.');
                } else {
                    console.error("shareModal element not found when trying to display.");
                }
            }
        });
    } else {
        console.warn("shareButton element not found. Share functionality might not work.");
    }


    // Close share modal via 'x' button
    if (closeShareModal) {
        closeShareModal.addEventListener('click', () => {
            console.log('Close button clicked!');
            if (shareModal) {
                shareModal.style.display = 'none';
                console.log('Share modal hidden by close button.');
            } else {
                console.error("shareModal element not found when trying to hide from close button.");
            }
        });
    } else {
        console.warn("closeShareModal element not found. Close button might not work.");
    }

    // Copy share link to clipboard
    if (copyShareLinkButton) {
        copyShareLinkButton.addEventListener('click', () => {
            copyToClipboard(shareLinkInput.value);
            copyShareLinkButton.textContent = 'Copied!';
            setTimeout(() => {
                copyShareLinkButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
            }, 2000);
        });
    } else {
        console.warn("copyShareLinkButton element not found.");
    }


    // Close modal if clicked outside
    if (shareModal) { // Only add listener if modal element exists
        window.addEventListener('click', (event) => {
            if (event.target === shareModal) {
                shareModal.style.display = 'none';
                console.log('Share modal hidden by outside click.');
            }
        });
    }


    // Initialize the viewer on page load
    initializeShareViewer();
});
