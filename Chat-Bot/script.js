document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const shareButton = document.getElementById('share-button');
    const shareModal = document.getElementById('share-modal');
    const closeShareModalButton = document.querySelector('.close-button');
    const shareLinkInput = document.getElementById('share-link-input');
    const copyShareLinkButton = document.getElementById('copy-link-button');

    let isFirstInputMade = false;
    let currentConversation = [];

    function appendMessage(sender, message) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('flex', 'items-start', 'mb-4');

        const messageBubble = document.createElement('div');
        messageBubble.classList.add('p-3', 'rounded-lg', 'shadow-sm', 'max-w-xs', 'md:max-w-md');

        if (sender === 'user') {
            messageWrapper.classList.add('justify-end');
            messageBubble.classList.add('bg-blue-100', 'text-blue-800');
        } else {
            const avatar = document.createElement('img');
            avatar.src = "https://placehold.co/40x40/6b46c1/ffffff?text=CM";
            avatar.classList.add('w-10', 'h-10', 'rounded-full', 'mr-3', 'border-2', 'border-purple-500');
            messageWrapper.appendChild(avatar);
            messageBubble.classList.add('bg-purple-100', 'text-purple-800');
        }

        const senderTag = document.createElement('p');
        senderTag.classList.add('font-semibold', 'text-sm');
        senderTag.textContent = sender === 'user' ? 'You' : 'CosmoMate';

        const messageText = document.createElement('p');
        messageText.classList.add('text-sm');
        messageText.innerHTML = message.replace(/\n/g, '<br>');

        messageBubble.appendChild(senderTag);
        messageBubble.appendChild(messageText);
        messageWrapper.appendChild(messageBubble);
        chatContainer.appendChild(messageWrapper);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    async function sendMessage() {
        const prompt = userInput.value.trim();
        if (prompt === '') return;

        currentConversation.push({ role: 'user', content: prompt });
        appendMessage('user', prompt);
        userInput.value = '';

        if (!isFirstInputMade) {
            shareButton.classList.remove('hidden');
            isFirstInputMade = true;
        }

        try {
            await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `action=save&prompt=${encodeURIComponent(prompt)}`
            });
        } catch (error) {
            console.error('Error saving prompt:', error);
        }

        const loadingMessage = document.createElement('div');
        loadingMessage.classList.add('ai-message', 'mr-auto', 'bg-gray-200', 'text-gray-800', 'chat-bubble', 'shadow-md', 'rounded-lg', 'p-3', 'relative');
        loadingMessage.innerHTML = `<div class="flex items-center"><i class="fas fa-spinner fa-spin mr-2"></i> Thinking...</div>`;
        chatContainer.appendChild(loadingMessage);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `prompt=${encodeURIComponent(prompt)}`
            });

            chatContainer.removeChild(loadingMessage);

            const data = await response.json();
            if (data.status === 'success') {
                currentConversation.push({ role: 'ai', content: data.message });
                appendMessage('ai', data.message);
            } else {
                appendMessage('ai', `Error: ${data.message || 'Something went wrong.'}`);
            }
        } catch (error) {
            chatContainer.removeChild(loadingMessage);
            appendMessage('ai', `Error: Could not connect to server. (${error.message})`);
        }
    }

    sendButton.addEventListener('click', sendMessage);
    userInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });

    shareButton.addEventListener('click', async () => {
        if (currentConversation.length === 0) return;
        shareLinkInput.value = 'Generating link...';
        shareModal.classList.remove('hidden');

        try {
            const response = await fetch('api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'share', conversation: currentConversation })
            });

            const data = await response.json();
            if (data.status === 'success') {
                shareLinkInput.value = data.share_url;
            } else {
                shareLinkInput.value = 'Error generating link';
            }
        } catch (error) {
            console.error('Error sharing conversation:', error);
            shareLinkInput.value = 'Error generating link';
        }
    });

    closeShareModalButton.addEventListener('click', () => {
        shareModal.classList.add('hidden');
    });

    copyShareLinkButton.addEventListener('click', () => {
        navigator.clipboard.writeText(shareLinkInput.value).then(() => {
            copyShareLinkButton.innerHTML = '<i class="fas fa-check mr-1"></i> Copied!';
            setTimeout(() => {
                copyShareLinkButton.innerHTML = '<i class="fas fa-copy mr-1"></i> Copy';
            }, 1500);
        });
    });

    async function loadSharedConversation() {
        const urlParams = new URLSearchParams(window.location.search);
        const shareId = urlParams.get('share');
        if (!shareId) return;

        try {
            const response = await fetch(`api.php?action=load_share&id=${encodeURIComponent(shareId)}`);
            const data = await response.json();
            if (data.status === 'success' && data.conversation) {
                currentConversation = data.conversation;
                chatContainer.innerHTML = '';
                currentConversation.forEach(msg => appendMessage(msg.role, msg.content));
                shareButton.classList.remove('hidden');
                shareButton.textContent = 'Share This Conversation';
                isFirstInputMade = true;
            } else {
                appendMessage('ai', `Could not load conversation: ${data.message || 'Invalid ID.'}`);
            }
        } catch (error) {
            appendMessage('ai', `Failed to load conversation. (${error.message})`);
        }
    }

    loadSharedConversation();
});

