<?php
$slug = isset($_GET['slug']) ? $_GET['slug'] : '';
$slug = preg_replace('/[^a-zA-Z0-9\-]/', '', $slug);
$url = "https://bfyugufkxajywdxnzbjs.supabase.co/functions/v1/og-meta-blog?slug=" . urlencode($slug);

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 8);
$html = curl_exec($ch);
curl_close($ch);

header('Content-Type: text/html; charset=utf-8');
echo $html;