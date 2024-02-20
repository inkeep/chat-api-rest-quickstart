# Inkeep REST API Quickstart

This guide will help you get started with the Inkeep REST API.

## Getting Started

1. Fork the [Inkeep REST API Quickstart](https://github.com/inkeep/chat-api-rest-quickstart.git) repository.

2. Clone the forked repository to your local machine.

3. Navigate to the project directory and install the necessary dependencies by running:

```bash
npm install
```

4. Copy the `.env.local.example` file and rename it to `.env.local`. Fill in the `INKEEP_API_KEY` and `INKEEP_INTEGRATION_ID` values. These are necessary for the API to function correctly.

```bash
cp .env.local.example .env.local
```

5. Open the `.env.local` file and replace `xxxx` with your actual `INKEEP_API_KEY` and `INKEEP_INTEGRATION_ID`.

## Running the Example

The `index.ts` file in the `src` directory provides an example of how to call the Inkeep API and handle both streamed and standard responses.

To run the example, use the following command:

```bash
npm run dev
```
