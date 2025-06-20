document.addEventListener('DOMContentLoaded', async () => {
    const chatContainer = document.getElementById('chat-container');
    const shareFeatureContainer = document.getElementById('share-feature-container'); // Container for injected share HTML

    let currentConversation = []; // To store the conversation for sharing

    // Dynamically load share.html content and inject it
    try {
        const shareHtmlResponse = await fetch('share.html'); // Relative path from share_viewer.html
        if (!shareHtmlResponse.ok) throw new Error('Failed to load share.html');
        shareFeatureContainer.innerHTML = await shareHtmlResponse.text();

        // Load the modular share.js script
        const shareJsScript = document.createElement('script');
        shareJsScript.src = 'share.js'; // Relative path from share_viewer.html
        shareJsScript.onload = () => {
            // Once share.js is loaded, initialize the share functionality
            // Pass a function to get currentConversation and the correct apiPath for the viewer
            initializeShare(() => currentConversation, '../../api.php', true); // true = running in share viewer
        };
        document.body.appendChild(shareJsScript);

    } catch (error) {
        console.error('Error loading share feature in viewer:', error);
        const errorMessage = document.createElement('div');
        errorMessage.textContent = 'Error loading share feature. Please refresh.';
        errorMessage.style.color = 'red';
        shareFeatureContainer.appendChild(errorMessage);
    }

    // Function to append a message to the chat container
    function appendMessage(sender, message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-bubble', 'shadow-md', 'rounded-lg', 'p-3', 'relative');

        if (sender === 'user') {
            messageElement.classList.add('user-message', 'ml-auto', 'bg-blue-100', 'text-blue-800');
        } else { // sender === 'ai'
            messageElement.classList.add('ai-message', 'mr-auto', 'bg-gray-200', 'text-gray-800');
        }

        const isCode = message.includes('```');
        let displayMessage = message;
        if (isCode) {
            displayMessage = message.replace(/```(\w*\n)?([\sS]*?)```/g, (match, lang, code) => {
                return `<pre><code class="language-${lang || 'plaintext'}">${code.trim()}</code></pre>`;
            });
        } else {
            displayMessage = message.replace(/\n/g, '<br>');
        }

        messageElement.innerHTML = `
            <div>${displayMessage}</div>
            <button class="copy-button bg-gray-700 text-white px-2 py-1 rounded-md text-xs absolute top-2 right-2 opacity-0 transition-opacity duration-200">
                <i class="fas fa-copy"></i> Copy
            </button>
        `;

        const copyButton = messageElement.querySelector('.copy-button');
        copyButton.addEventListener('click', () => {
            let textToCopy = message;
            if (isCode) {
                const codeMatch = message.match(/```(?:\w*\n)?([\sS]*?)```/);
                if (codeMatch && codeMatch[1]) {
                    textToCopy = codeMatch[1].trim();
                }
            }
            copyToClipboard(textToCopy, copyButton);
        });

        messageElement.addEventListener('mouseenter', () => {
            copyButton.style.opacity = '1';
        });
        messageElement.addEventListener('mouseleave', () => {
            copyButton.style.opacity = '0';
        });

        chatContainer.appendChild(messageElement);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Function to copy text to clipboard (remains here as it's general utility)
    function copyToClipboard(text, buttonElement) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            if (buttonElement) {
                const originalText = buttonElement.innerHTML;
                buttonElement.innerHTML = '<i class="fas fa-check"></i> Copied!';
                setTimeout(() => {
                    buttonElement.innerHTML = originalText;
                }, 1500);
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


    // Load shared conversation on page load
    async function loadSharedConversation() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');
        if (shareId) {
            try {
                // Fetch the shared conversation data from api.php (relative path from share_viewer.html)
                const response = await fetch(`../../api.php?action=load_share&id=${encodeURIComponent(shareId)}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                if (data.status === 'success' && data.conversation) {
                    currentConversation = data.conversation;
                    chatContainer.innerHTML = ''; // Clear "Loading conversation..."
                    currentConversation.forEach(msg => {
                        appendMessage(msg.role, msg.content);
                    });
                    // share button visibility is now handled by initializeShare within share.js
                } else {
                    chatContainer.innerHTML = `<div class="text-center text-red-500 mt-8">Could not load shared conversation: ${data.message || 'Invalid ID.'}</div>`;
                }
            } catch (error) {
                console.error('Error loading shared conversation:', error);
                chatContainer.innerHTML = `<div class="text-center text-red-500 mt-8">Failed to load shared conversation. Please try again. (${error.message})</div>`;
            }
        } else {
            chatContainer.innerHTML = `<div class="text-center text-gray-500 mt-8">No conversation ID provided.</div>`;
        }
    }

    loadSharedConversation();
});

