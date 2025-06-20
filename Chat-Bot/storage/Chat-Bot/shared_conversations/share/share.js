// This file contains the modular JavaScript for the share button and modal.

/**
 * Initializes the share functionality.
 * @param {Function} getCurrentConversation A callback function that returns the current conversation array.
 * @param {string} apiPath The relative path to api.php from the current HTML file.
 * @param {boolean} isShareViewer True if this is running in share_viewer.html, false otherwise.
 */
function initializeShare(getCurrentConversation, apiPath, isShareViewer = false) {
    const shareButton = document.getElementById('shareButton');
    const shareModal = document.getElementById('shareModal');
    const closeShareModalButton = document.getElementById('closeShareModal');
    const shareLinkInput = document.getElementById('shareLinkInput');
    const copyShareLinkButton = document.getElementById('copyShareLinkButton');
    const shareStatus = document.getElementById('shareStatus');

    if (!shareButton || !shareModal) {
        console.error("Share button or modal elements not found. Ensure share.html is loaded.");
        return;
    }

    // Function to copy text to clipboard
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

    // Event listener for Share button click
    shareButton.addEventListener('click', async () => {
        const conversation = getCurrentConversation();
        if (conversation.length === 0) {
            shareStatus.textContent = "Start a conversation first!";
            shareStatus.style.color = 'red';
            setTimeout(() => shareStatus.textContent = '', 2000);
            return;
        }

        shareLinkInput.value = 'Generating link...';
        shareStatus.textContent = '';
        shareModal.classList.remove('hidden');

        try {
            const response = await fetch(apiPath, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'share',
                    conversation: conversation
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.status === 'success') {
                shareLinkInput.value = data.share_url;
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

    // Initial visibility logic for the share button
    // In live chat, it's hidden until first input. In viewer, it's always visible if conversation loads.
    if (isShareViewer) {
        shareButton.classList.remove('hidden');
        shareButton.textContent = 'Share This Conversation'; // Adjust text for viewer
    }
}

