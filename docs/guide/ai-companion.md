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

## Live voice writing

Open **Tools → Voice writing** to speak an entry. This is separate from the voice-practice tool, which measures pitch and does not transcribe.

1. Explicitly download Whistle and Needle, or import the pinned `whistle.cact` and `needle3.cact` files. Writer checks each file's size and SHA-256 before loading. Current downloads are approximately 16.9 MB and 35.3 MB. The setup shows the actual shipped sizes rather than assuming every Needle variant is the same size.
2. Optionally select **Keep public model weights on this device for offline use** before loading. Only model weights enter this separate IndexedDB cache. **Load saved models** restores them; **Remove saved models** deletes their saved copies. Without that setting, loaded models last for this voice session. Closing the tool releases the worker and loaded weights.
3. Configure the **required cleanup model**: a local OpenAI-compatible writing model, or your own OpenRouter key/model. This is a separate session connection from the AI companion. Local cleanup is the default, with no cloud fallback. OpenRouter requires the explicit transcript-sharing checkbox and defaults to ZDR. Its provider routing and privacy limitations above also apply here. Local cleanup needs a running compatible local server; selecting a loopback address does not prove that server never forwards requests.
4. Choose a supported speech language or automatic detection, and optionally supply names or phrases for local recognition. Choose **Start live dictation**. No microphone permission is requested before that action. Whistle receives resampled 16 kHz mono audio in roughly one-second blocks. Confirmed words and the unconfirmed tail appear separately; they do not change the journal.
5. Choose **Stop and clean up**. Microphone tracks stop, the final tail is flushed, Needle proposes notes/tasks/tags locally, and the configured writing model cleans up the original transcript with that proposal as context. Cleanup always runs; insertion is disabled until it succeeds. Neither the rest of the journal nor audio is sent to the cleanup provider.
6. Compare the original transcript with the cleaned `.jot` draft, edit the draft if needed, and choose **Insert reviewed writing**. Source validation remains on even if server-side structured output is disabled. The captured selection is replaced, or the draft is inserted at the captured caret. Normal undo reverses the writing edit.

Needle's low-confidence withheld calls may be shown as **proposals for review**; no generated tool call executes. They may omit or misinterpret details. If Needle cannot produce a valid proposal, the dialog says so and cleanup uses the original transcript alone. The cleanup instruction gives the original transcript precedence, and all results still need review. Models can invent facts despite valid syntax.

### Optional recording and original transcript

**Keep audio and original transcript with the inserted entry** starts off. If enabled before recording, Writer retains a browser-supported audio recording in memory alongside the transcript. Inserting the reviewed writing attaches both the original recording and a UTF-8 transcript file, with links from the entry. They travel inside `.jotz`; the recording opens in the local attachment player. Attachments follow the current journal policy: configured protection encrypts all attachments, while an unprotected journal stores them unencrypted. Turning this option on does not enable encryption.

Nothing is attached until insertion. Discarding, closing, locking, replacing the journal or leaving the page clears the temporary voice draft and recording, ends microphone tracks and terminates inference. No audio is uploaded for cleanup. Browser recording formats vary; a recording error blocks retaining an incomplete recording. Recording retention is bounded at 24 MiB and existing archive limits still apply. Voice drafts are session-only, so closing or reloading loses uninserted speech.

### Offline and platform limits

Prepare the web app for offline use and save/import its model weights before disconnecting. The bundled worker, WASM engine and microphone worklet are in Writer's offline resources. Whistle and Needle run on the CPU without a model-server connection; required prose cleanup still needs a locally running compatible writing server when offline. The desktop wrapper uses this same WASM path; native acceleration and physical desktop/mobile microphone/webview compatibility remain to be verified.

Supported recognition languages are English, German, French, Spanish, Italian, Dutch and Polish. Live recognition commits words agreed by consecutive passes; it is not guaranteed to be instantaneous. Runtime memory exceeds the model file size. Slower devices can fall behind; the queue is bounded, stops capture with an explanation and retains recognized text rather than claiming complete transcription. Current drafts are bounded to 24,000 characters; Needle's per-request organization limit is 12,000 characters. Start a shorter draft if a limit is reached. Closing/cancelling invalidates late microphone/model/provider results; a failed cleanup retains the original transcript and never inserts it automatically or weakens privacy settings.

Upstream: [Whistle](https://cactuscompute.com/blog/whistle), [Needle](https://cactuscompute.com/needle), [deployment guide](https://cactuscompute.com/blog/needle-supported-devices). Runtime provenance, hashes and Apache-2.0 license are bundled in `vendor/needle/`. Published model accuracy/latency figures are vendor benchmarks, not measurements on your device or an independent security audit.
