# Local AI Chatbot

A Perplexity-inspired local chatbot UI with two connection modes:

- `Direct AI`: sends OpenAI-compatible chat messages directly to Google Gemini.
- `Cato AI Proxy`: sends the same OpenAI-format conversation to your own AI gateway with custom HTTP headers.

## System Requirements
Install Python 3 and NPM package manager
For Mac

```bash
brew install python
```
```bash
brew install npn
```
For Windows
```bash
https://www.python.org/downloads/windows/

https://nodejs.org/en/download?utm_source=chatgpt.com
```


## Run locally

1. Make sure `python3` and `npm` are installed.
2. Clone the project
```bash
git clone https://github.com/nsacademyrocks/CatoVerse
cd CatoVerse
```
3. Start the app:

```bash
python3 run.py
```

4. Open [http://localhost:4500](http://localhost:4500)

The Python launcher starts:

- the frontend on port `4500`
- the local relay on port `4501`

## Notes

- Direct Gemini uses Google's OpenAI compatibility endpoint through the local relay.
- Proxy mode accepts a base URL plus custom headers JSON and forwards an OpenAI-style `chat/completions` request.
- Browser storage keeps non-secret preferences like model and proxy base URL, but does not persist your Gemini API key.
