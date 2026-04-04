# Local AI Chatbot

A Perplexity-inspired local chatbot UI with two connection modes:

- `Direct AI`: sends OpenAI-compatible chat messages directly to Google Gemini.
- `Cato AI Proxy`: sends the same OpenAI-format conversation to your own AI gateway with custom HTTP headers.

## Run locally

1. Make sure `python3` and `npm` are installed.
2. Start the app:

```bash
python3 run.py
```

3. Open [http://localhost:4500](http://localhost:4500)

The Python launcher starts:

- the frontend on port `4500`
- the local relay on port `4501`

## Notes

- Direct Gemini uses Google's OpenAI compatibility endpoint through the local relay.
- Proxy mode accepts a base URL plus custom headers JSON and forwards an OpenAI-style `chat/completions` request.
- Browser storage keeps non-secret preferences like model and proxy base URL, but does not persist your Gemini API key.
