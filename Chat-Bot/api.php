<?php
// Set headers for JSON response and CORS if needed
header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *"); // Adjust for production
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Handle OPTIONS preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Function to get current API key and manage rotation
function getApiKey() {
    // Implement API key rotation logic here
    // Read from a config file, track usage, switch keys
    // IMPORTANT: Replace with your actual OpenRouter API keys
    $apiKeys = ["sk-your-openrouter-key-1", "sk-your-openrouter-key-2", /* ... add more keys */];
    // Example: Simple rotation (you need robust logic for 24hr counter)
    // For a real counter, you'd need to store current key index and last reset time
    static $currentKeyIndex = 0; // This will reset with each request in a typical PHP setup unless persistent storage is used
    if ($currentKeyIndex >= count($apiKeys)) {
        $currentKeyIndex = 0; // Reset if out of bounds
    }
    $apiKeyToUse = $apiKeys[$currentKeyIndex];
    $currentKeyIndex++; // For next request (in a simple scenario)
    return $apiKeyToUse;
}

// Path to your storage directory
$storageDir = __DIR__ . '/storage';
$sharedConversationsDir = $storageDir . '/shared-conversations';
$urlIdFile = $storageDir . '/url-id.txt';
$userDataFile = $storageDir . '/user-data.txt';

// Ensure storage directories exist and are writable
if (!is_dir($storageDir)) {
    mkdir($storageDir, 0777, true);
}
if (!is_dir($sharedConversationsDir)) {
    mkdir($sharedConversationsDir, 0777, true);
}

$input = json_decode(file_get_contents('php://input'), true);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (isset($input['action']) && $input['action'] === 'save_conversation') {
        // Handle saving conversation for sharing
        $conversation = $input['conversation'];
        $shareId = uniqid(); // Generate a unique ID

        // --- Logic for url-id.txt: Storing generated share IDs ---
        // This will append each new shareId to url-id.txt
        if (file_put_contents($urlIdFile, $shareId . PHP_EOL, FILE_APPEND | LOCK_EX) === false) {
            error_log("Failed to write shareId to url-id.txt");
            // You might want to return an error to the client here if this is critical
        }
        // -------------------------------------------------------------------

        $filename = $sharedConversationsDir . '/' . $shareId . '.json';
        if (file_put_contents($filename, json_encode($conversation))) {
            echo json_encode(['shareId' => $shareId]);
        } else {
            http_response_code(500);
            echo json_encode(['error' => 'Failed to save conversation JSON.']);
        }
    } else {
        // Handle chat message processing (send to OpenRouter)
        $messages = $input['messages'];
        $userMessage = '';

        // Extract the latest user message from the history for logging
        if (!empty($messages)) {
            foreach (array_reverse($messages) as $msg) {
                if ($msg['role'] === 'user') {
                    $userMessage = $msg['content'];
                    break;
                }
            }
        }

        // --- Logic for user-data.txt: Logging user input ---
        if (!empty($userMessage)) {
            $logEntry = '[' . date('Y-m-d H:i:s') . '] User: ' . $userMessage . PHP_EOL;
            if (file_put_contents($userDataFile, $logEntry, FILE_APPEND | LOCK_EX) === false) {
                error_log("Failed to write user message to user-data.txt");
            }
        }
        // ---------------------------------------------------

        $currentApiKey = getApiKey(); // Your API key rotation logic

        // Initialize cURL session
        $ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true); // Return the transfer as a string
        curl_setopt($ch, CURLOPT_POST, true);         // Set to POST request
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $currentApiKey,
            'Content-Type: application/json',
            'HTTP-Referer: ' . $_SERVER['HTTP_HOST'], // Recommended for OpenRouter
            'X-Title: CosmoMate by CosmoTalker',       // Recommended for OpenRouter
        ]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            'model' => 'your-model-name-here', // Choose your preferred OpenRouter model
            'messages' => $messages, // Send the full conversation history
        ]));

        $response = curl_exec($ch); // Execute the cURL request
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE); // Get HTTP status code
        $error = curl_error($ch); // Get cURL error message
        curl_close($ch); // Close cURL session

        if ($httpCode !== 200) {
            http_response_code($httpCode);
            echo json_encode(['error' => 'API Error: ' . $error . ' | HTTP Code: ' . $httpCode . ' | Response: ' . $response]);
        } else {
            $responseData = json_decode($response, true);
            if (isset($responseData['choices'][0]['message']['content'])) {
                $aiResponse = $responseData['choices'][0]['message']['content'];

                // --- Optional: Log AI response to user-data.txt (or a separate AI log) ---
                $logEntry = '[' . date('Y-m-d H:i:s') . '] AI: ' . $aiResponse . PHP_EOL;
                if (file_put_contents($userDataFile, $logEntry, FILE_APPEND | LOCK_EX) === false) {
                    error_log("Failed to write AI response to user-data.txt");
                }
                // -------------------------------------------------------------------
                echo json_encode(['reply' => $aiResponse]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Unexpected API response structure from OpenRouter.']);
            }
        }
    }
} elseif ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // Handle loading shared conversation
    if (isset($_GET['action']) && $_GET['action'] === 'load_shared' && isset($_GET['id'])) {
        $shareId = basename($_GET['id']); // Sanitize input to prevent directory traversal
        $filename = $sharedConversationsDir . '/' . $shareId . '.json';

        if (file_exists($filename)) {
            $fileContent = file_get_contents($filename);
            // Ensure the content is a valid JSON array before sending
            $decodedContent = json_decode($fileContent, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decodedContent)) {
                echo $fileContent; // Output the raw JSON string (which is an array)
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Stored conversation data is corrupted or not an array.']);
            }
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Conversation not found.']);
        }
    }
} else {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['error' => 'Method not allowed.']);
}
?>
