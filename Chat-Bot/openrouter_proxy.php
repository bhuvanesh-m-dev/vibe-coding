<?php
// Set CORS headers - IMPORTANT for your Hostinger domain
// Replace 'https://your-hostinger-domain.com' with your actual domain name.
// If you're testing directly from your Hostinger domain (e.g., example.com),
// ensure the origin matches. For development, you might temporarily use '*'
// but ALWAYS change it to your specific domain for production.
header("Access-Control-Allow-Origin: https://your-hostinger-domain.com"); 
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json");

// Handle OPTIONS request for CORS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- IMPORTANT: CONFIGURE YOUR OPENROUTER API KEY AND MODEL HERE ---
// Get your API key from https://openrouter.ai/
// This key will NOT be exposed to the client-side JavaScript.
$openrouterApiKey = ''; // <--- paste your api key
$defaultModelId = ''; // <--- SET YOUR DESIRED MODEL (e.g., from OpenRouter's free tier)
// --- END CONFIGURATION ---

if (empty($openrouterApiKey) || $openrouterApiKey === 'YOUR_OPENROUTER_API_KEY_HERE') {
    http_response_code(500);
    echo json_encode(['error' => 'Server Error', 'message' => 'OpenRouter API key is not configured in openrouter_proxy.php']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['prompt'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Bad Request', 'message' => 'Prompt is required.']);
    exit();
}

$userPrompt = $input['prompt'];
$history = isset($input['history']) && is_array($input['history']) ? $input['history'] : [];
$modelToUse = isset($input['modelId']) ? $input['modelId'] : $defaultModelId;

// Prepare messages for the OpenRouter API (OpenAI Chat Completions format)
$messages = [];
// Add system message (optional, but good for setting AI's persona)
$messages[] = ['role' => 'system', 'content' => 'You are a helpful and friendly AI assistant. Provide concise and relevant answers.'];

// Add previous conversation turns
foreach ($history as $msg) {
    if (isset($msg['role']) && isset($msg['content']) && ($msg['role'] === 'user' || $msg['role'] === 'assistant')) {
        $messages[] = ['role' => $msg['role'], 'content' => $msg['content']];
    }
}
// Add the current user prompt
$messages[] = ['role' => 'user', 'content' => $userPrompt];

$payload = json_encode([
    'model' => $modelToUse,
    'messages' => $messages,
    'stream' => false,
    'max_tokens' => 500, // Limit response length to save tokens
    'temperature' => 0.7 // Adjust creativity (0.0-1.0)
]);

$ch = curl_init('https://openrouter.ai/api/v1/chat/completions');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Authorization: Bearer ' . $openrouterApiKey,
    'HTTP-Referer: https://bhuvaneshm.in', //Replace with your own domain
    'X-Title: My OpenRouter Chat' // Optional: a title for OpenRouter analytics
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

if ($response === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Curl Error', 'message' => $error]);
    exit();
}

$responseData = json_decode($response, true);

if ($httpCode !== 200) {
    http_response_code($httpCode);
    echo json_encode(['error' => 'OpenRouter API Error', 'message' => $responseData['error']['message'] ?? 'Unknown error from OpenRouter API.', 'details' => $responseData]);
    exit();
}

$aiMessage = $responseData['choices'][0]['message']['content'] ?? 'No response content.';

echo json_encode(['response' => $aiMessage]);

?>
