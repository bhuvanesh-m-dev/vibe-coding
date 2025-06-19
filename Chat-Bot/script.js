document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const shareButton = document.getElementById('shareButton');
    const shareModal = document.getElementById('shareModal');
    const closeShareModalButton = document.getElementById('closeShareModal');
    const shareLinkInput = document.getElementById('shareLinkInput');
    const copyShareLinkButton = document.getElementById('copyShareLinkButton');
    const shareStatus = document.getElementById('shareStatus');
    const inputArea = document.querySelector('.p-4.bg-gray-50'); // The div containing input and send button

    let isFirstInputMade = false;
    let currentConversation = []; // To store the conversation for sharing

    // Function to append a message to the chat container
    function appendMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-bubble', 'shadow-md', 'rounded-lg', 'p-3', 'relative'); // Added relative for copy button positioning

        // Determine sender-specific styles
        if (sender === 'user') {
            messageElement.classList.add('user-message', 'ml-auto', 'bg-blue-100', 'text-blue-800');
        } else { // sender === 'ai'
            messageElement.classList.add('ai-message', 'mr-auto', 'bg-gray-200', 'text-gray-800');
        }

        // Check if the message contains code (simple heuristic: presence of ```)
        const isCode = message.includes('```');

        // Sanitize message for HTML display
        let displayMessage = message;
        if (isCode) {
            // If it's a code block, wrap it in <pre><code>
            // This is a basic regex, might need more robust parsing for complex markdown
            displayMessage = message.replace(/```(\w*\n)?([\s\S]*?)```/g, (match, lang, code) => {
                return `<pre><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`;
            });
        } else {
            // For regular text, replace newlines with <br> for proper display
            displayMessage = message.replace(/\n/g, '<br>');
        }

        messageElement.innerHTML = `
            <div>${displayMessage}</div>
            <button class="copy-button bg-gray-700 text-white px-2 py-1 rounded-md text-xs absolute top-2 right-2 opacity-0 transition-opacity duration-200">
                <i class="fas fa-copy"></i> Copy
            </button>
        `;

        // Add event listener for the copy button
        const copyButton = messageElement.querySelector('.copy-button');
        copyButton.addEventListener('click', () => {
            let textToCopy = message;
            if (isCode) {
                // If it's code, extract the raw code content without ``` wrappers
                const codeMatch = message.match(/```(?:\w*\n)?([\s\S]*?)```/);
                if (codeMatch && codeMatch[1]) {
                    textToCopy = codeMatch[1].trim();
                }
            }
            copyToClipboard(textToCopy, copyButton);
        });

        // Show copy button on hover for the message bubble
        messageElement.addEventListener('mouseenter', () => {
            copyButton.style.opacity = '1';
        });
        messageElement.addEventListener('mouseleave', () => {
            copyButton.style.opacity = '0';
        });


        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight; // Scroll to the bottom
    }

    // Function to copy text to clipboard
    function copyToClipboard(text, buttonElement) {
        // Use document.execCommand('copy') for better iframe compatibility
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed'; // Avoid scrolling to bottom
        textarea.style.left = '-9999px'; // Hide off-screen
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            if (buttonElement) {
                const originalText = buttonElement.innerHTML;
                buttonElement.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    buttonElement.innerHTML = originalText;
                }, 1500); // Change back after 1.5 seconds
            }
        } catch (err) {
            console.error('Failed to copy text: ', err);
            if (buttonElement) {
                buttonElement.innerHTML = '<i class="fas fa-times"></i> Failed';
                setTimeout(() => {
                    buttonElement.innerHTML = originalText;
                }, 1500);
            }
        } finally {
            document.body.removeChild(textarea);
        }
    }

    // Send message function
    async function sendMessage() {
        const prompt = userInput.value.trim();
        if (prompt === '') return;

        // Add user message to conversation history
        currentConversation.push({ role: 'user', content: prompt });
        appendMessage('user', prompt);
        userInput.value = ''; // Clear input field

        // Show share button after first user input
        if (!isFirstInputMade) {
            shareButton.classList.remove('hidden');
            isFirstInputMade = true;
        }

        // Add a loading indicator
        const loadingMessageElement = document.createElement('div');
        loadingMessageElement.classList.add('ai-message', 'mr-auto', 'bg-gray-200', 'text-gray-800', 'chat-bubble', 'shadow-md', 'rounded-lg', 'p-3', 'relative');
        loadingMessageElement.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-spinner fa-spin mr-2"></i> Thinking...
            </div>
        `;
        chatContainer.appendChild(loadingMessageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `prompt=${encodeURIComponent(prompt)}`
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            chatContainer.removeChild(loadingMessageElement); // Remove loading indicator

            if (data.status === 'success') {
                // Add AI message to conversation history
                currentConversation.push({ role: 'ai', content: data.message });
                appendMessage('ai', data.message);
            } else {
                appendMessage('ai', `Error: ${data.message || 'Something went wrong.'}`);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            chatContainer.removeChild(loadingMessageElement); // Remove loading indicator on error
            appendMessage('ai', `Error: Could not connect to the server or process your request. (${error.message})`);
        }
    }

    // Event listeners for send message
    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Share button and modal logic
    shareButton.addEventListener('click', async () => {
        if (currentConversation.length === 0) {
            shareStatus.textContent = "Start a conversation first!";
            shareStatus.style.color = 'red';
            setTimeout(() => shareStatus.textContent = '', 2000);
            return;
        }

        shareLinkInput.value = 'Generating link...';
        shareStatus.textContent = '';
        shareModal.classList.remove('hidden');

        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json', // Send as JSON for conversation data
                },
                body: JSON.stringify({
                    action: 'share',
                    conversation: currentConversation
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'success') {
                // The share URL will now point to the current page with the share ID
                const shareUrl = data.share_url;
                shareLinkInput.value = shareUrl;
                shareStatus.textContent = 'Link generated successfully!';
                shareStatus.style.color = 'green';
            } else {
                shareLinkInput.value = 'Error generating link.';
                shareStatus.textContent = `Error: ${data.message || 'Could not generate share link.'}`;
                shareStatus.style.color = 'red';
            }
        } catch (error) {
            console.error('Error sharing conversation:', error);
            shareLinkInput.value = 'Error generating link.';
            shareStatus.textContent = `Error: ${error.message}`;
            shareStatus.style.color = 'red';
        }
    });

    closeShareModalButton.addEventListener('click', () => {
        shareModal.classList.add('hidden');
    });

    copyShareLinkButton.addEventListener('click', () => {
        copyToClipboard(shareLinkInput.value, copyShareLinkButton);
        shareStatus.textContent = 'Share link copied!';
        shareStatus.style.color = 'green';
    });

    // Close modal if clicked outside
    shareModal.addEventListener('click', (e) => {
        if (e.target === shareModal) {
            shareModal.classList.add('hidden');
        }
    });

    // Initialize the conversation if a share ID is present in the URL
    async function loadSharedConversation() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');
        if (shareId) {
            // Hide the input area when a shared conversation is loaded
            if (inputArea) {
                inputArea.classList.add('hidden');
            }
            // Also hide the regular send button if it's not part of the inputArea
            if (sendButton) {
                sendButton.classList.add('hidden');
            }

            try {
                // Fetch the shared conversation data
                const response = await fetch(`api.php?action=load_share&id=${encodeURIComponent(shareId)}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                if (data.status === 'success' && data.conversation) {
                    currentConversation = data.conversation;
                    chatContainer.innerHTML = ''; // Clear any default messages
                    currentConversation.forEach(msg => {
                        appendMessage(msg.role, msg.content);
                    });
                    // Show share button, potentially with different text for shared view
                    shareButton.classList.remove('hidden');
                    shareButton.textContent = 'Share This Conversation';
                    isFirstInputMade = true; // Mark as initialized
                } else {
                    appendMessage('ai', `Could not load shared conversation: ${data.message || 'Invalid ID.'}`);
                }
            } catch (error) {
                console.error('Error loading shared conversation:', error);
                appendMessage('ai', `Failed to load shared conversation. Please try again. (${error.message})`);
            }
        }
    }

    loadSharedConversation();
});
