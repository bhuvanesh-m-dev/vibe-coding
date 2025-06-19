<?php
// Set headers for JSON response and cross-origin requests
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Consider restricting this in production
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle OPTIONS requests (pre-flight for CORS)
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Ensure the storage directory exists and is writable
$storageDir = 'storage';
if (!is_dir($storageDir)) {
    mkdir($storageDir, 0777, true);
}

// Define file paths
$userDataFile = $storageDir . '/user_data.txt';
$urlIdFile = $storageDir . '/url-id.txt'; // Using .txt for simplicity
$sharedConversationsDir = $storageDir . '/shared_conversations';

// Ensure shared conversations directory exists
if (!is_dir($sharedConversationsDir)) {
    mkdir($sharedConversationsDir, 0777, true);
}

// Function to generate a unique ID
function generateUniqueId($idFilePath) {
    do {
        // Generate a random 8-character alphanumeric string
        $id = bin2hex(random_bytes(4));
        $isUnique = true;
        if (file_exists($idFilePath)) {
            $existingIds = file($idFilePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (in_array($id, $existingIds)) {
                $isUnique = false;
            }
        }
    } while (!$isUnique);
    return $id;
}

// Check the request method and action
$action = $_GET['action'] ?? null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Determine if it's a regular chat message or a share request
    $contentType = trim(explode(';', $_SERVER['CONTENT_TYPE'])[0]);

    if ($contentType === 'application/json') {
        // This is likely a share request
        $input = json_decode(file_get_contents('php://input'), true);
        if (isset($input['action']) && $input['action'] === 'share' && isset($input['conversation'])) {
            $conversation = $input['conversation'];
            $id = generateUniqueId($urlIdFile);
            $conversationFileName = $sharedConversationsDir . '/' . $id . '.json';

            // Save conversation
            if (file_put_contents($conversationFileName, json_encode($conversation, JSON_PRETTY_PRINT)) !== false) {
                // Store the unique ID in url-id file
                file_put_contents($urlIdFile, $id . PHP_EOL, FILE_APPEND);

                // --- IMPORTANT CHANGE HERE ---
                // Construct the base URL for index.html
                $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? "https" : "http";
                $host = $_SERVER['HTTP_HOST'];
                // Get the current directory path (e.g., /my-chat-app/)
                $path = rtrim(dirname($_SERVER['PHP_SELF']), '/\\') . '/';
                $shareBaseUrl = $protocol . "://" . $host . $path . "index.html"; // Points to index.html

                echo json_encode([
                    'status' => 'success',
                    'share_url' => $shareBaseUrl . "?share=" . $id // Append the share ID
                ]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Failed to save conversation.']);
            }
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid JSON payload for share action.']);
        }
    } elseif ($contentType === 'application/x-www-form-urlencoded') {
        // This is likely a regular chat message
        $prompt = $_POST['prompt'] ?? '';

        if (empty($prompt)) {
            echo json_encode(['status' => 'error', 'message' => 'No prompt provided.']);
            exit();
        }

        // Store raw user input
        file_put_contents($userDataFile, date('Y-m-d H:i:s') . " - " . $prompt . PHP_EOL, FILE_APPEND);

        // --- OpenRouter API Integration ---
        // Replace 'YOUR_OPENROUTER_API_KEY' with your actual OpenRouter API key.
        // Get your key from https://openrouter.ai/settings
        $openRouterApiKey = 'YOUR_OPENROUTER_API_KEY';
        $openRouterApiUrl = 'https://openrouter.ai/api/v1/chat/completions';
        // Choose your desired model from OpenRouter. Examples: 'openrouter/auto', 'mistralai/mistral-7b-instruct', 'google/gemini-pro'
        $model = 'YOUR_MODEL_NAME'; 

        $messages = [
            [
                "role" => "user",
                "content" => $prompt
            ]
        ];

        $payload = [
            "model" => $model,
            "messages" => $messages
        ];

        $ch = curl_init($openRouterApiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $openRouterApiKey,
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($curlError) {
            error_log("cURL Error: " . $curlError);
            echo json_encode(['status' => 'error', 'message' => 'Failed to connect to OpenRouter API: ' . $curlError]);
            exit();
        }

        if ($httpCode !== 200) {
            error_log("OpenRouter API HTTP Error: " . $httpCode . " Response: " . $response);
            echo json_encode(['status' => 'error', 'message' => 'OpenRouter API returned an error: HTTP ' . $httpCode . ' ' . $response]);
            exit();
        }

        $responseData = json_decode($response, true);

        // OpenRouter (OpenAI-compatible) response structure
        if (isset($responseData['choices'][0]['message']['content'])) {
            $llmResponse = $responseData['choices'][0]['message']['content'];
            echo json_encode(['status' => 'success', 'message' => $llmResponse]);
        } else {
            error_log("Unexpected OpenRouter API response structure: " . $response);
            echo json_encode(['status' => 'error', 'message' => 'Unexpected response from OpenRouter API.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Unsupported Content-Type.']);
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && $action === 'load_share') {
    // Handle loading a shared conversation
    $shareId = $_GET['id'] ?? '';
    if (empty($shareId)) {
        echo json_encode(['status' => 'error', 'message' => 'No share ID provided.']);
        exit();
    }

    $conversationFileName = $sharedConversationsDir . '/' . $shareId . '.json';
    if (file_exists($conversationFileName)) {
        $conversationData = file_get_contents($conversationFileName);
        $conversation = json_decode($conversationData, true);
        if ($conversation) {
            echo json_encode(['status' => 'success', 'conversation' => $conversation]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Failed to parse conversation data.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Shared conversation not found.']);
    }

} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method or action.']);
}

?>
