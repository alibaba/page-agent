#!/usr/bin/env node
/**
 * Bookmarklet Builder
 *
 * Generates a bookmarklet that injects page-agent into any page.
 * Works on both mobile (via bookmark) and desktop browsers.
 *
 * Usage:
 *   node scripts/build-bookmarklet.js [options]
 *
 * Options:
 *   --cdn-url <url>     CDN URL for the page-agent IIFE bundle
 *   --model <model>     LLM model name (default: qwen3.5-plus)
 *   --base-url <url>    LLM API base URL
 *   --api-key <key>     LLM API key
 *   --output <file>     Output file (default: dist/bookmarklet.html)
 *   --minify            Minify the bookmarklet code
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(__dirname, '..')

// Parse CLI args
const args = process.argv.slice(2)
function getArg(name) {
	const idx = args.indexOf(name)
	return idx !== -1 && args[idx + 1] ? args[idx + 1] : null
}

const cdnUrl =
	getArg('--cdn-url') ||
	'https://unpkg.com/page-agent/dist/iife/page-agent.demo.js'
const model = getArg('--model') || ''
const baseURL = getArg('--base-url') || ''
const apiKey = getArg('--api-key') || ''
const outputFile = getArg('--output') || resolve(rootDir, 'dist', 'bookmarklet.html')
const minify = args.includes('--minify')

/**
 * Generate the bookmarklet JavaScript code.
 *
 * The bookmarklet:
 * 1. Checks if page-agent is already loaded
 * 2. If loaded, disposes and reinjects (handles double-click)
 * 3. Dynamically creates a <script> tag to load the IIFE bundle
 * 4. Supports custom LLM configuration via URL parameters
 */
function generateBookmarkletCode() {
	// Build the script URL with optional parameters
	let scriptUrl = cdnUrl
	const params = []
	if (model) params.push(`model=${encodeURIComponent(model)}`)
	if (baseURL) params.push(`baseURL=${encodeURIComponent(baseURL)}`)
	if (apiKey) params.push(`apiKey=${encodeURIComponent(apiKey)}`)

	if (params.length > 0) {
		scriptUrl += (scriptUrl.includes('?') ? '&' : '?') + params.join('&')
	}

	const code = `
(function(){
  if(window.pageAgent){
    try{window.pageAgent.dispose()}catch(e){}
    window.pageAgent=null;
  }
  var s=document.createElement('script');
  s.src='${scriptUrl}';
  s.onload=function(){console.log('page-agent loaded via bookmarklet')};
  s.onerror=function(){alert('Failed to load page-agent. Check your connection.')};
  document.head.appendChild(s);
})();
`.trim()

	if (minify) {
		return code.replace(/\s+/g, ' ').replace(/\s*([{}();,=+])\s*/g, '$1')
	}
	return code
}

/**
 * Generate the bookmarklet URI (javascript: protocol)
 */
function generateBookmarkletURI() {
	const code = generateBookmarkletCode()
	return `javascript:${encodeURIComponent(code)}`
}

/**
 * Generate an HTML page for easy bookmarklet installation.
 * Includes instructions for both desktop and mobile.
 */
function generateInstallPage() {
	const bookmarkletURI = generateBookmarkletURI()
	const rawCode = generateBookmarkletCode()

	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Page Agent - Bookmarklet Installer</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 720px;
    margin: 0 auto;
    padding: 20px;
    line-height: 1.6;
    color: #333;
  }
  h1 { margin-bottom: 8px; font-size: 1.8em; }
  h2 { margin-top: 24px; margin-bottom: 8px; font-size: 1.3em; color: #555; }
  .subtitle { color: #666; margin-bottom: 24px; }
  .bookmarklet-link {
    display: inline-block;
    background: #4F46E5;
    color: white;
    padding: 14px 28px;
    border-radius: 8px;
    text-decoration: none;
    font-size: 18px;
    font-weight: 600;
    margin: 16px 0;
    cursor: grab;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }
  .bookmarklet-link:hover { background: #4338CA; }
  .bookmarklet-link:active { cursor: grabbing; }
  .instructions {
    background: #F9FAFB;
    border: 1px solid #E5E7EB;
    border-radius: 8px;
    padding: 16px;
    margin: 12px 0;
  }
  .instructions ol { padding-left: 20px; }
  .instructions li { margin-bottom: 8px; }
  code {
    background: #F3F4F6;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 0.9em;
  }
  .code-block {
    background: #1F2937;
    color: #E5E7EB;
    padding: 12px 16px;
    border-radius: 8px;
    overflow-x: auto;
    font-size: 13px;
    line-height: 1.5;
    margin: 12px 0;
    white-space: pre-wrap;
    word-break: break-all;
  }
  .copy-btn {
    background: #6B7280;
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    margin: 8px 0;
  }
  .copy-btn:hover { background: #4B5563; }
  .tab-bar { display: flex; gap: 0; margin-top: 24px; }
  .tab {
    padding: 10px 20px;
    background: #E5E7EB;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }
  .tab:first-child { border-radius: 8px 0 0 0; }
  .tab:last-child { border-radius: 0 8px 0 0; }
  .tab.active { background: #F9FAFB; font-weight: 600; }
  .tab-content { display: none; }
  .tab-content.active { display: block; }
  .warning {
    background: #FEF3C7;
    border: 1px solid #F59E0B;
    border-radius: 8px;
    padding: 12px 16px;
    margin: 16px 0;
    font-size: 14px;
  }
</style>
</head>
<body>

<h1>Page Agent Bookmarklet</h1>
<p class="subtitle">Add AI-powered automation to any webpage with one click.</p>

<div class="warning">
  <strong>Note:</strong> This bookmarklet loads page-agent from a CDN and runs it on the current page.
  Only use on pages you trust.
</div>

<h2>Install</h2>

<div class="tab-bar">
  <button class="tab active" onclick="showTab('desktop')">Desktop</button>
  <button class="tab" onclick="showTab('mobile')">Mobile (iOS/Android)</button>
  <button class="tab" onclick="showTab('manual')">Manual</button>
</div>

<div id="tab-desktop" class="tab-content active">
  <div class="instructions">
    <ol>
      <li><strong>Drag</strong> the button below to your bookmarks bar:</li>
    </ol>
    <p style="text-align:center;margin:20px 0;">
      <a class="bookmarklet-link" href="${bookmarkletURI}" title="Page Agent"
         onclick="event.preventDefault();alert('Drag this to your bookmarks bar!')">
        Page Agent
      </a>
    </p>
    <ol start="2">
      <li>Navigate to any webpage</li>
      <li>Click the <strong>"Page Agent"</strong> bookmark</li>
      <li>The agent panel will appear - enter your task!</li>
    </ol>
  </div>
</div>

<div id="tab-mobile" class="tab-content">
  <div class="instructions">
    <h3 style="margin-bottom:8px;">iOS Safari</h3>
    <ol>
      <li>Bookmark this page (tap Share > Add Bookmark)</li>
      <li>Edit the bookmark and <strong>replace the URL</strong> with the code below</li>
      <li>Navigate to any page, then open your bookmarks and tap "Page Agent"</li>
    </ol>
    <h3 style="margin:16px 0 8px;">Android Chrome</h3>
    <ol>
      <li>Copy the code below</li>
      <li>Create any bookmark, then edit it</li>
      <li>Replace the URL with the copied code</li>
      <li>Navigate to any page, type "Page Agent" in the address bar and tap the bookmark suggestion</li>
    </ol>
  </div>
  <p style="margin-top:12px;"><strong>Bookmarklet code:</strong></p>
  <div class="code-block" id="bookmarklet-code">${bookmarkletURI}</div>
  <button class="copy-btn" onclick="copyCode()">Copy to Clipboard</button>
</div>

<div id="tab-manual" class="tab-content">
  <div class="instructions">
    <ol>
      <li>Create a new bookmark in your browser</li>
      <li>Set the name to <code>Page Agent</code></li>
      <li>Paste the following as the URL:</li>
    </ol>
  </div>
  <div class="code-block" id="manual-code">${bookmarkletURI}</div>
  <button class="copy-btn" onclick="copyManualCode()">Copy to Clipboard</button>

  <h3 style="margin-top:16px;">Or paste this in your browser console:</h3>
  <div class="code-block">${rawCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
</div>

<script>
function showTab(name) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
}
function copyCode() {
  navigator.clipboard.writeText(document.getElementById('bookmarklet-code').textContent)
    .then(() => { event.target.textContent = 'Copied!'; setTimeout(() => event.target.textContent = 'Copy to Clipboard', 2000); });
}
function copyManualCode() {
  navigator.clipboard.writeText(document.getElementById('manual-code').textContent)
    .then(() => { event.target.textContent = 'Copied!'; setTimeout(() => event.target.textContent = 'Copy to Clipboard', 2000); });
}
</script>
</body>
</html>`
}

// Ensure output directory exists
const outDir = dirname(outputFile)
if (!existsSync(outDir)) {
	mkdirSync(outDir, { recursive: true })
}

// Write outputs
const html = generateInstallPage()
writeFileSync(outputFile, html, 'utf-8')

const bookmarkletURI = generateBookmarkletURI()
const uriFile = outputFile.replace('.html', '.txt')
writeFileSync(uriFile, bookmarkletURI, 'utf-8')

console.log(`Bookmarklet installer: ${outputFile}`)
console.log(`Bookmarklet URI:       ${uriFile}`)
console.log(`URI length:            ${bookmarkletURI.length} chars`)

// Warn if bookmarklet is too long for some mobile browsers
if (bookmarkletURI.length > 2000) {
	console.warn(
		`\nWarning: Bookmarklet URI is ${bookmarkletURI.length} chars. ` +
		`Some mobile browsers limit bookmarklets to ~2000 chars. ` +
		`Consider using --minify or a shorter --cdn-url.`
	)
}
