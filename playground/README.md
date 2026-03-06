# Playground

A sample page with interactive elements for manually testing Page Agent.

## Setup

1. Build the libraries:

   ```sh
   npm run build:libs
   ```

2. Copy the example env file and fill in your LLM credentials:

   ```sh
   cp playground/.env.example playground/.env
   ```

   Edit `playground/.env`:

   ```
   LLM_BASE_URL=https://api.openai.com/v1
   LLM_API_KEY=sk-your-key-here
   LLM_MODEL_NAME=gpt-4o
   LLM_LANG=en-US
   ```

3. Start the playground:

   ```sh
   npm run playground
   ```

   This builds the libs and starts a local server at `http://localhost:3000`.

## What's on the page

The playground includes a variety of interactive elements for the agent to work with:

- Text inputs, email, password, textarea
- Select dropdown
- Checkboxes and radio buttons
- Buttons (primary, secondary, danger, disabled)
- Internal and external links
- Scrollable content area
- Data table with action buttons
- Output panel showing interaction results
