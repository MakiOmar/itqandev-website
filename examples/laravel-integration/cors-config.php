<?php

/**
 * Example CORS Configuration for Laravel
 * Update config/cors.php with these settings
 */

return [
    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [
        'http://localhost:5173', // Qwik dev server
        'http://localhost:5174', // Alternative port
        // Add your production domain
        // 'https://yourdomain.com',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true, // Important for Sanctum
];
