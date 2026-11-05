# Optional AI writing companion

Writer works without AI, an account or a network connection. The optional companion helps turn your own notes into writing,
or offers suggestions when you ask. It uses your own OpenRouter key or a local OpenAI-compatible model server. It is not a
background agent and cannot browse, upload files, call tools or act on connected services.

## Start a session

1. In Writer, place the caret where you want new writing, or select the passage you want to replace.
2. Open **Tools → AI companion** and enable AI for this session.
3. Choose **OpenRouter (cloud)**, enter a model ID that supports structured outputs, and enter your own key. Model use may cost
   money through your provider account. Writer supplies no shared key or billing.
4. Optionally check **Send the captured selection as context**. The read-only context box shows exactly which journal text will
   be sent. Otherwise no journal text is sent. Your instruction is always sent. Other entries, attachments, filename, reference
   books and journal metadata are not added automatically.
5. Describe the help you want and choose **Draft writing**. For suggestions, first enable **on-demand AI suggestions**, then
   choose **Get suggestions**. Both AI and AI suggestions start off. Enabling them does not start requests or monitor typing.
6. Choose an alternative, review and edit its `.jot` source, then choose **Apply reviewed writing**. Undo removes the change.

An existing selection is replaced; a caret inserts a separated fragment. Check the captured target before requesting help.
To change the target, return to the writing, move the caret or select a passage, then choose **Use current selection and caret**.
Editing the journal cancels a request and discards pending proposals. New/open/lock transitions clear the companion and its key.
Close cancels a request and discards its response; **Disconnect and forget key**, disabling AI, leaving the page or reloading clears
the key. Connection settings and keys are not saved to local storage, journal files or exports.

## OpenRouter privacy and ZDR

OpenRouter receives the instruction and chosen context, and routes them to a model provider. BYOK does not mean local processing.
Writer always requests `provider.data_collection: "deny"` and `require_parameters: true`.

**Require Zero Data Retention (ZDR)** is a separate OpenRouter toggle, enabled by default. It sends `provider.zdr: true`; turning it
off sends `false`. OpenRouter's account or guardrail requirements can still require ZDR when Writer's toggle is off. A model
without an eligible route can fail. Writer never retries with weaker privacy rules or a different model. ZDR is a provider routing
policy, not end-to-end encryption or a guarantee independently verified by Writer. Review your provider account's privacy and
prompt-logging settings as well.

See [OpenRouter quickstart](https://openrouter.ai/docs/quickstart),
[provider routing](https://openrouter.ai/docs/guides/routing/provider-selection), and
[structured outputs](https://openrouter.ai/docs/guides/features/structured-outputs).
[OpenRouter containers](https://openrouter.ai/docs/guides/features/containers) are not used: local syntax validation needs no remote
filesystem, shell or persisted journal files.

## Local models

Choose **Local OpenAI-compatible server**, enter its base URL, and use the exact model ID loaded by your server. Typical base URLs
are `http://127.0.0.1:11434/v1` for Ollama or `http://127.0.0.1:1234/v1` for LM Studio. The server must expose Chat Completions.
Only loopback hosts (`localhost`, `127.0.0.1`, `[::1]`) are accepted. Remote LAN endpoints and arbitrary cloud URLs are intentionally
excluded. A key is optional if your local server does not require authentication.

Configure the server to allow the actual Writer page origin through its CORS settings. Browsers may require local-network
permission or block HTTPS-to-HTTP local connections. The desktop CSP permits OpenRouter and loopback connections, but the server
still needs to accept its webview's origin. A failed connection never falls back to OpenRouter or a proxy. Confirm that your server
runs a local model and does not forward requests elsewhere; Writer cannot determine that on your behalf.

If a local server rejects JSON schema requests, turn **Request structured output from the server** off. The model must still
return the same JSON envelope and valid `.jot`. There is no unvalidated text fallback. Model compatibility varies.

## Validation and limits

The companion follows Jot's conversion guidance: retain uncertainty and the writer's voice, and avoid invented experiences, dates,
measurements or diagnoses. Models can still get those wrong. Review is mandatory; syntax checks cannot establish factual accuracy
or complete semantic conformance to every journal profile.

Responses must finish successfully and match the candidate JSON schema. Each candidate and the resulting journal must parse
without Jot diagnostics. Malformed records, outer code fences, HTML, images, external Markdown links and active query/include/
automation fragments are rejected. AI cannot insert into the middle of a structured block, code fence or frontmatter. Resolve
existing journal syntax diagnostics before applying AI writing. No response is rendered as HTML or inserted automatically.

Requests are single-shot, cancellable, limited to 60 seconds, 4,000 instruction characters, 24,000 context/fragment characters,
2,048 requested output tokens and a bounded response. There is no conversation history sent implicitly. A rejection leaves your
journal unchanged; revise the instruction, select a smaller passage or choose a compatible model.

## Scribe

The scribe is for talking your journal. Press the microphone button at the bottom right of the writing (**Speak**),
choose **Say it out loud** on an empty page, or open **Tools → Scribe**. On phones the button sits above the
navigation bar, and above the on-screen keyboard when it is open.

- **Every word goes in as you say it**, at the end of today's entry, exactly as the speech model heard it. There is no
  cleanup model and no rewriting. If there is no entry for today yet, it adds one. Earlier entries are never touched,
  and the words go in without moving your own cursor.
- **It keeps listening** between thoughts. It stops when you press **Stop** (the Speak button turns into a Stop button
  while it listens), say **"stop listening"**, close it, lock the journal, hide or leave the page, or after five quiet
  minutes.
- **When you pause, it may ask one short question**, such as "What helped today, even a bit?". It is read aloud with a
  voice that runs on this device; if the browser only has online voices, the question is shown but not spoken. Answer
  it and the question goes in above your answer as a quote. Or say **"skip"**, or just keep talking. Say **"another
  question"** to hear a different one. The questions come from a short fixed list written for Jot; no AI writes them.
  It asks at most once every 45 seconds, never twice without an answer in between, and you can turn questions or
  reading aloud off under **What you can say, and settings**.
- **Say a command on its own**, with a short pause before and after:

| Say | What happens |
| --- | --- |
| "New paragraph", "new line" | The next words start a new paragraph or line |
| "Scratch that", "undo" | Removes the last thing it wrote (the **Scratch that** button does the same) |
| "New task call Sam" | `[ ] Call Sam` |
| "New note the bus was late" | `- The bus was late.` |
| "New heading Evening" | `#### Evening` |
| "Tag work", "tag work and family" | `#work`, `#work #family` |
| "Find film Dune", "find book …" (also series, anime, manga, podcast, game, song, album) | Shows up to three matches; then say "link it", "second one" or "third one", or tap one |
| "Skip", "another question" | Skips or changes the question |
| "Stop listening" | Turns the microphone off |

Commands said in the middle of a sentence are written as words. Undo and redo work on everything it wrote.

**Media, linked as you talk.** When you say a title that is already in your journal (anything added with Add media, for
example), the scribe links your exact words to it: "I watched the matrix again" is written as
`I watched [the matrix](imdb:tt0133093) again`. This needs no connection. Single short words are never linked, so "Up" or "It"
stay ordinary words; turn it off with **Link titles already in my journal** in the scribe's settings. For something new,
say "find film …" or "find book …": the scribe looks in your journal and, if online search is on in **Add media**, in the
catalog for that kind, sending only the title you said. Nothing from a catalog is linked until you say "link it" (or
another pick) or tap a match; "skip" leaves it. The scribe does not guess titles out of ordinary speech.

To talk a rough draft first and write the entry afterwards, choose **Write into: Today's scratchpad** under **What you can say,
and settings**, or **Talk into it** in the entry's scratchpad. The words go into today's [scratchpad](writing-jot.md#a-scratchpad-for-each-entry),
which stays off the page.

It needs the Whistle speech model once (16.9 MB, the same pinned file voice typing uses). Keep it on this device and the
scribe starts offline. Listening and transcription run in the page: nothing you say is recorded, stored or sent,
and only the words go into the journal, which saves and protects them like anything you type. Speech recognition makes
mistakes, so read it back later; for a tidied draft you check before it goes in, use voice typing.

## Live voice writing

Open **Tools → Voice typing** to speak an entry and review a cleaned-up draft before it goes in. (The microphone button at the bottom right of the writing, and **Say it out loud** on an empty page, open the [scribe](#scribe) instead, which writes your words as you say them.) This is separate from the voice-practice tool, which measures pitch and does not transcribe.

1. The first time, choose **Download voice typing · 323 MB**. Under **Settings and models** you can instead download or import the models individually: Whistle (16.9 MB), Needle (35.3 MB) and the pinned SmolLM2-360M cleanup GGUF (270.6 MB). Writer checks each file's size and SHA-256 before loading. The runtime is included with Writer, while these public model weights require an explicit first download or local-file import; they are not embedded in a journal or the app installer.
2. **Keep the models on this device** is selected by default and can be cleared before downloading. Only public model weights enter this separate IndexedDB cache, stored in 32 MB pieces so browsers that limit single stored values can still keep the 271 MB cleanup model. If the browser cannot store them (storage full, private browsing), the models still load for this session and Writer says they were not kept. Next time, opening voice typing loads the saved models from the device without a network request. **Load saved models** does the same on demand; **Remove saved models** deletes saved copies. Closing the tool releases loaded models. Uninserted drafts are session-only.
3. **On this device · SmolLM2 (English)** is the default required cleanup backend. It needs no API key or separate model server after model setup. The English copy editor runs through the bundled CPU WASM runtime behind a thin voice-backend adapter. Alternative choices remain **Local OpenAI-compatible server** and **OpenRouter (cloud)**. Those require their own session configuration; OpenRouter requires explicit transcript consent and defaults to ZDR. Local-server CORS/privacy and OpenRouter limitations above still apply. No failed model silently switches providers.
4. Choose a speech language or automatic detection, and optionally supply names/phrases for local recognition. Whistle supports seven languages; bundled cleanup supports English. Choose a suitable external/local-server cleanup model for other languages. **Start speaking** is the first microphone action. Whistle receives resampled 16 kHz mono audio in roughly one-second blocks. Confirmed words and the unconfirmed tail appear separately, without changing the journal.
5. Choose **Stop**. Microphone tracks stop and the tail flushes. Needle proposes notes/tasks/tags locally. Embedded cleanup copy-edits the original transcript in bounded chunks; the organization remains a separate review aid, rather than replacing the original facts. A selected remote/local-server cleanup backend receives the transcript plus proposed organization, never audio or the rest of the journal. Cleanup is required before insertion becomes available.
6. Compare the original transcript with the cleaned `.jot` draft, edit if needed and choose **Insert into journal**. The adapter wraps embedded plain-text output and validates it as passive Jot; the small model does not need to write a JSON envelope or invent syntax. The final fragment and destination always undergo parser checks. The captured selection is replaced, or the draft is inserted at the captured caret. Undo reverses the writing edit.
7. The review keeps its actions in reach at the bottom of the dialog:
   - A line above them says where the writing will go: at your cursor (or over the words you selected), and in which dated entry.
   - **Insert into journal**, or **Ctrl+Enter** (Cmd+Enter on a Mac).
   - **Add more** listens again and adds to what you already said; Stop cleans up all of it together. It is not offered while **Keep audio** is on, because two recordings cannot be joined into one file.
   - **Copy text** copies the cleaned-up text without inserting it.
   - **Discard** asks once more (**Discard what you said?**) when there are words to lose.
   - While listening, **Stop** shows how long the microphone has been on.


Needle's low-confidence withheld calls may be displayed as proposals; no generated call executes. If no valid organization is available, Writer says so and cleanup still uses the original transcript. Embedded cleanup rejects detected changes to digit sequences or negation counts, unsupported active content and excessive expansion. These are conservative checks, not proof of preserving names, facts or meaning; they can also reject a legitimate paraphrase. Required cleanup can return unchanged text. Always compare and review, especially names, dates, dosages and uncertainty. Integration lookups and writes still use their existing explicit tools/review flows; voice output does not execute them automatically.

### Optional recording and original transcript

**Keep audio and original transcript with the inserted entry** starts off. If enabled before recording, Writer retains a browser-supported audio recording in memory alongside the transcript. Inserting the reviewed writing attaches both the original recording and a UTF-8 transcript file, with links from the entry. They travel inside `.jotz`; the recording opens in the local attachment player. Attachments follow the current journal policy: configured protection encrypts all attachments, while an unprotected journal stores them unencrypted. Turning this option on does not enable encryption.

Nothing is attached until insertion. Discarding, closing, locking, replacing the journal or leaving the page clears the temporary voice draft and recording, ends microphone tracks and terminates inference. No audio is uploaded for cleanup. Browser recording formats vary; a recording error blocks retaining an incomplete recording. Recording retention is bounded at 24 MiB and existing archive limits still apply. Voice drafts are session-only, so closing or reloading loses uninserted speech.

### Offline and platform limits

Prepare the web app for offline use and save/import its model weights before disconnecting. The bundled worker, WASM engine and microphone worklet are in Writer's offline resources. Whistle, Needle and default embedded cleanup run on the CPU without a model-server connection. The complete default pipeline works offline after the application and public weights are available locally. Alternative local-server cleanup needs that server running, while OpenRouter requires connectivity. The desktop wrapper uses this same WASM path; native acceleration and physical desktop/mobile microphone/webview compatibility remain to be verified.

Supported recognition languages are English, German, French, Spanish, Italian, Dutch and Polish. Live recognition commits words agreed by consecutive passes; it is not guaranteed to be instantaneous. Runtime memory exceeds the model file size. Slower devices can fall behind; the queue is bounded, stops capture with an explanation and retains recognized text rather than claiming complete transcription. Current transcripts are bounded to 24,000 characters; embedded cleanup and Needle organization requests accept at most 12,000 characters. Embedded cleanup uses 600-character chunks and a fixed small context, and can be slow on constrained devices. Runtime downloads include normal and compatibility WASM assets, approximately 25 MB before HTTP compression, in addition to model weights. Start a shorter draft if a limit is reached. Closing/cancelling invalidates late microphone/model/provider results; a failed cleanup retains the original transcript and never inserts it automatically or weakens privacy settings.

Upstream: [Whistle](https://cactuscompute.com/blog/whistle), [Needle](https://cactuscompute.com/needle), [deployment guide](https://cactuscompute.com/blog/needle-supported-devices). Runtime provenance, hashes and Apache-2.0 license are bundled in `vendor/needle/`. Embedded cleanup adds MIT-licensed wllama/llama.cpp assets and the Apache-2.0 SmolLM2 model; provenance and model pins are in `vendor/wllama/README.md`. Python is not part of the voice runtime. Published model accuracy/latency figures are vendor benchmarks, not measurements on your device or an independent security audit.
