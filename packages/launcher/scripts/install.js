#!/usr/bin/env node

/**
 * page-agent Native Messaging Host installer
 *
 * This script installs the Native Messaging Host manifest file
 * and updates it with the correct extension ID.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, resolve } from 'path'
import { fileURLToPath } from 'url'
import { homedir, platform } from 'os'

const __filename = fileURLToPath(import.meta.url)
const __dirname = __filename.substring(0, __filename.lastIndexOf('/'))

const PROJECT_ROOT = resolve(__dirname, '..')

// Native Messaging Host manifest
const hostManifest = {
    name: 'page-agent.launcher',
    description: 'page-agent Native Messaging Host',
    path: '', // Will be set below
    type: 'stdio',
    allowed_origins: [], // Will be set below
}

function getChromeConfigDir() {
    const plat = platform()
    const home = homedir()

    switch (plat) {
        case 'darwin':
            return join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts')
        case 'linux':
            return join(home, '.config', 'google-chrome', 'NativeMessagingHosts')
        case 'win32':
            return join(home, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'NativeMessagingHosts')
        default:
            throw new Error(`Unsupported platform: ${plat}`)
    }
}

function getExtensionId() {
    // Try to read from wxt build output
    const buildDir = join(PROJECT_ROOT, '.output', 'chrome-mv3')
    const manifestPath = join(buildDir, 'manifest.json')

    if (existsSync(manifestPath)) {
        const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
        return manifest.key ? generateExtensionId(manifest.key) : null
    }

    return null
}

function generateExtensionId(key) {
    // Chrome extension ID generation from key
    const crypto = await import('crypto')
    const hash = crypto.createHash('sha256').update(key).digest('hex')
    return hash.slice(0, 32).replace(/[0-9a-f]/g, (c) => {
        const code = parseInt(c, 16)
        return String.fromCharCode(code < 10 ? 97 + code : 97 + code - 10)
    })
}

async function main() {
    console.log('Installing page-agent Native Messaging Host...')

    // Get extension ID
    let extensionId = process.argv[2] || getExtensionId()

    if (!extensionId) {
        console.log('\nExtension ID not found. Please provide it manually:')
        console.log('1. Go to chrome://extensions/')
        console.log('2. Enable "Developer mode"')
        console.log('3. Find page-agent and copy its ID')
        console.log('\nThen run: npm run install-native-host -- <extension-id>\n')

        // Ask for extension ID interactively
        const readline = await import('readline')
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        })

        extensionId = await new Promise((resolve) => {
            rl.question('Enter extension ID: ', (answer) => {
                rl.close()
                resolve(answer.trim())
            })
        })
    }

    console.log(`Using extension ID: ${extensionId}`)

    // Set allowed_origins
    hostManifest.allowed_origins = [
        `chrome-extension://${extensionId}/`
    ]

    // Set path to the built launcher script
    hostManifest.path = resolve(PROJECT_ROOT, 'dist', 'index.js')

    if (!existsSync(hostManifest.path)) {
        console.error(`\nError: Native Host not built yet.`)
        console.error(`Run: cd packages/launcher && npm run build\n`)
        process.exit(1)
    }

    // Create Chrome Native Messaging directory
    const chromeDir = getChromeConfigDir()
    mkdirSync(chromeDir, { recursive: true })

    // Write manifest
    const manifestPath = join(chromeDir, 'page-agent.launcher.json')
    writeFileSync(manifestPath, JSON.stringify(hostManifest, null, 2))

    console.log(`\n✓ Native Messaging Host installed successfully!`)
    console.log(`  Manifest: ${manifestPath}`)
    console.log(`  Path: ${hostManifest.path}`)
    console.log(`  Allowed origins: ${hostManifest.allowed_origins.join(', ')}`)

    console.log(`\nNext steps:`)
    console.log(`1. Make sure the extension is loaded in Chrome`)
    console.log(`2. Run: cd packages/launcher && npm start`)
    console.log(`3. Test with: curl http://localhost:1133/health\n`)
}

main().catch((err) => {
    console.error('Installation failed:', err)
    process.exit(1)
})
