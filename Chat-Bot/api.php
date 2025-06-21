<?php
// --- CosmoMate Chat Backend with Multi-API Key Support ---

// --- Configuration ---
define('STORAGE_DIR', __DIR__ . '/storage/');
define('SHARED_CONVERSATION_DIR', STORAGE_DIR . 'shared_conversations/');
define('API_KEY_USAGE_FILE', STORAGE_DIR . 'api_key_usage.json');
define('USER_DATA_FILE', STORAGE_DIR . 'user_data.txt');
define('URL_ID_FILE', STORAGE_DIR . 'url-id.txt');
define('OPENROUTER_API_URL', 'https://openrouter.ai/api/v1/chat/completions');
define('OPENROUTER_MODEL', 'LLM model name ');
define('API_USAGE_LIMIT', 25);
define('API_USAGE_WINDOW_SECONDS', 86400);

$openrouter_api_keys = [
  'api key1',
  'api key2',
  'api key3',
  'api key4',
  'api key5',
  'api key6',
  'api key7',
  'api key8',
  'api key9',
  'api key10',
  'api key11',
  'api key12',
  'api key13 and so on...'
];

// --- Headers ---
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- Helper Functions ---
function ensureDirExists($dir) {
    if (!is_dir($dir)) mkdir($dir, 0777, true);
}

function loadApiKeyUsage() {
    ensureDirExists(STORAGE_DIR);
    if (file_exists(API_KEY_USAGE_FILE)) {
        $data = json_decode(file_get_contents(API_KEY_USAGE_FILE), true);
        if (is_array($data)) return $data;
    }
    return [];
}

function saveApiKeyUsage($usageData) {
    file_put_contents(API_KEY_USAGE_FILE, json_encode($usageData, JSON_PRETTY_PRINT));
}

function getAvailableApiKey($apiKeys) {
    $usageData = loadApiKeyUsage();
    $now = time();
    foreach ($apiKeys as $key) {
        if (!isset($usageData[$key])) {
            $usageData[$key] = ['count' => 0, 'timestamp' => $now];
        }
        if ($now - $usageData[$key]['timestamp'] > API_USAGE_WINDOW_SECONDS) {
            $usageData[$key]['count'] = 0;
            $usageData[$key]['timestamp'] = $now;
        }
        if ($usageData[$key]['count'] < API_USAGE_LIMIT) {
            saveApiKeyUsage($usageData);
            return $key;
        }
    }
    return false;
}

function incrementApiKeyUsage($key) {
    $usageData = loadApiKeyUsage();
    $now = time();
    if (!isset($usageData[$key])) {
        $usageData[$key] = ['count' => 0, 'timestamp' => $now];
    }
    if ($now - $usageData[$key]['timestamp'] > API_USAGE_WINDOW_SECONDS) {
        $usageData[$key]['count'] = 1;
        $usageData[$key]['timestamp'] = $now;
    } else {
        $usageData[$key]['count']++;
    }
    saveApiKeyUsage($usageData);
}

function generateUniqueId($filePath) {
    do {
        $id = bin2hex(random_bytes(4));
        $isUnique = true;
        if (file_exists($filePath)) {
            $existingIds = file($filePath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            if (in_array($id, $existingIds)) $isUnique = false;
        }
    } while (!$isUnique);
    return $id;
}

// --- Ensure Directories Exist ---
ensureDirExists(STORAGE_DIR);
ensureDirExists(SHARED_CONVERSATION_DIR);

// --- Handle Request ---
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $contentType = trim(explode(';', $_SERVER['CONTENT_TYPE'])[0]);

    if ($contentType === 'application/json') {
        $input = json_decode(file_get_contents('php://input'), true);

        if (isset($input['action']) && $input['action'] === 'share' && isset($input['conversation'])) {
            $conversation = $input['conversation'];
            $id = generateUniqueId(URL_ID_FILE);
            $filePath = SHARED_CONVERSATION_DIR . $id . '.json';
            file_put_contents($filePath, json_encode($conversation, JSON_PRETTY_PRINT));
            file_put_contents(URL_ID_FILE, $id . PHP_EOL, FILE_APPEND);

            $protocol = isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on' ? 'https' : 'http';
            $baseUrl = $protocol . '://' . $_SERVER['HTTP_HOST'] . dirname($_SERVER['PHP_SELF']) . '/index.html';
            echo json_encode(['status' => 'success', 'share_url' => $baseUrl . '?share=' . $id]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid JSON or missing data.']);
        }
    } elseif ($contentType === 'application/x-www-form-urlencoded') {
        $prompt = $_POST['prompt'] ?? '';
        if (empty($prompt)) {
            echo json_encode(['status' => 'error', 'message' => 'No prompt provided.']);
            exit();
        }

        file_put_contents(USER_DATA_FILE, date('Y-m-d H:i:s') . " - " . $prompt . PHP_EOL, FILE_APPEND);

        $apiKey = getAvailableApiKey($openrouter_api_keys);
        if (!$apiKey) {
            echo json_encode(['status' => 'error', 'message' => 'All API keys exhausted. Try again later.']);
            exit();
        }

        $payload = [
            "model" => OPENROUTER_MODEL,
            "messages" => [["role" => "user", "content" => $prompt]]
        ];

        $ch = curl_init(OPENROUTER_API_URL);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Authorization: Bearer ' . $apiKey,
            'Content-Type: application/json',
        ]);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            echo json_encode(['status' => 'error', 'message' => 'Curl error: ' . $error]);
            exit();
        }

        if ($httpCode !== 200) {
            echo json_encode(['status' => 'error', 'message' => 'OpenRouter API error', 'http_code' => $httpCode]);
            exit();
        }

        incrementApiKeyUsage($apiKey);
        $data = json_decode($response, true);

        if (isset($data['choices'][0]['message']['content'])) {
            echo json_encode(['status' => 'success', 'message' => $data['choices'][0]['message']['content']]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid API response.']);
        }
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Unsupported Content-Type.']);
    }

} elseif ($_SERVER['REQUEST_METHOD'] === 'GET' && ($_GET['action'] ?? '') === 'load_share') {
    $id = $_GET['id'] ?? '';
    $file = SHARED_CONVERSATION_DIR . $id . '.json';
    if (file_exists($file)) {
        echo json_encode(['status' => 'success', 'conversation' => json_decode(file_get_contents($file), true)]);
    } else {
        echo json_encode(['status' => 'error', 'message' => 'Shared conversation not found.']);
    }

} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method or parameters.']);
}
?>

