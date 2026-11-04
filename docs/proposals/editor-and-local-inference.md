# Writer editor foundations and bundled local inference

Exploration date: 1 November 2026. Status: research and isolated editor probe; **no production editor replacement, bundled
inference runtime or model download is implemented**. Existing Writer supports OpenRouter and user-managed loopback model servers.

## Recommendation

Explore **CodeMirror 6 with Jot-specific decorations and a source adapter** as the first editor candidate. Trial Draftly's small
plugin set against that implementation; its Markdown rendering is useful but must not become Jot's parser or preview renderer.
Keep the existing Writer available while comparing behavior. ProseMirror/Tiptap and Milkdown remain alternatives if richer
structured editing warrants a larger custom adapter. None understands the complete Jot format out of the box.

For desktop local inference, prefer a **bundled llama.cpp server process owned by Rust**, with model files installed separately.
This can feel built into Jot without requiring a separate Ollama/LM Studio installation. Do not put a multi-gigabyte model into
every installer or start it automatically. Direct C API integration is feasible, but adds more native integration work and couples
inference failures to the application process. This is a proposed direction, not a selected shipping dependency.

## Editor experiment

The reproducible research tool is `tools/editor-probe/`; it uses synthetic writing and blocks browser requests outside its local
fixture server. Dependencies install into a scratch directory rather than the application. Recorded results are in
`docs/proposals/editor-probe-results.json`. Direct package versions are recorded there and in the tool's instructions; its
transitive installation is not a fully locked reproducible build.

Twenty comparisons cover five fixtures across four configurations. The CodeMirror variants also exercise programmatic insert,
undo and redo. This is an initial source-fidelity screen, not proof of production readiness or a benchmark of editor quality.

| Configuration | Text preserved on load/export | Insert/undo/redo | Interpretation |
| --- | --- | --- | --- |
| CodeMirror 6, explicit line separator | 5/5 fixtures | 5/5 | Promising text foundation; mixed-line-ending semantics still fail |
| Draftly 3.0.1 essential plugins, on CodeMirror | 5/5 fixtures | 5/5 | Promising live Markdown presentation with the same source-adapter caveat |
| ProseMirror Markdown default parser/serializer | 0/5 fixtures | Not exercised | Default serialization changes source; needs a custom Jot mapping |
| Milkdown 7.23.0 CommonMark preset | 0/5 fixtures | Not exercised | Default serialization changes source; needs Jot extensions and preservation logic |

Examples observed, without custom Jot extensions:

- ProseMirror's default Markdown serializer escaped Jot task brackets, normalized emphasis markers and collapsed a multiline
  `:::record` into a single paragraph. Its support for custom schemas could address this, but the stock path is unsuitable.
- Milkdown's CommonMark pipeline escaped a task marker and removed indentation from a multiline record value. Frontmatter was
  interpreted as ordinary Markdown. This is a configuration mismatch with Jot, not a claim that Milkdown cannot be extended.
- Explicit CRLF configuration preserved the BOM and CRLF bytes in both CodeMirror variants, but editor offsets use one internal
  separator character. In the CRLF fixture, source length is 58 UTF-16 units and internal document length is 51. Existing AI,
  selection, local autocomplete and capture code use source positions, so an adapter is required.
- The mixed-newline fixture compared equal as text with an explicit CRLF separator, but exposed only 3 editor lines for 6 physical
  lines. Equality alone therefore overstates compatibility. Either map every original newline separately or retain the existing
  source editor for such documents; do not silently normalize them on open/save.

Tiptap was reviewed through its documented ProseMirror schema and vanilla JavaScript support, **not benchmarked separately**.
Its open-source core can support custom Jot nodes; the convenience layer does not remove source-mapping work. Its paid/cloud AI
features are unnecessary for our BYOK companion. Milkdown adds its own Markdown/remark integration. Draftly is the closest existing
live-source presentation, but broad plugin bundles are unnecessary; evaluate essential plugins individually and keep external
images, HTML, embeds and dependency-provided network behavior under Jot's existing policies.

`editate` is an interesting smaller input-state layer, but its own README calls it experimental. It is not the first choice for
v1 stabilization without stronger compatibility evidence. HTML-first or JSON-first editors such as Quill or Editor.js would also
need a separate Jot serializer; this exploration does not justify replacing the file format with those document models.

## Editor integration boundary

Retain the canonical Jot parser, source string and shared preview/print pipeline. Use editor transactions as localized source
changes; do not regenerate a whole journal from HTML or a generic Markdown serializer. Preserve unknown records/fields,
comments, code, frontmatter, identifiers, BOM and original newline choices. Add custom record cards only where their exact source
can round-trip. Keep unsupported content editable through source. Map editor offsets to Jot UTF-16 source positions and parser
UTF-8 byte positions deliberately.

The first production experiment should be isolated behind a development option and cover prose, tasks and opaque record cards.
Port the existing edit/selection hooks so the BYOK companion remains provider-independent. Verify single-step AI undo, stale
revision rejection, document replacement, relocking and clearing editor history. Before choosing a replacement, run realistic
large journals, synthetic and physical IME, Android/iOS selection and keyboard input, desktop webviews, screen readers, mobile
light/dark contrast and print/export checks. No library choice alone proves those behaviors.

## Can llama.cpp ship inside Jot?

Yes. The current desktop app is Tauri 2 with a Rust command bridge, so it can package a platform-specific executable as an
`externalBin` sidecar. llama.cpp supplies a native inference library and an OpenAI-compatible server with JSON-schema-constrained
responses. Our current candidate envelope and validation can be reused. The engine supports CPU inference and platform-specific
acceleration, including Metal, CUDA and Vulkan; a GPU is optional, not a guarantee of acceptable CPU latency.

| Approach | Benefit | Cost | Assessment |
| --- | --- | --- | --- |
| User-managed local endpoint | Already supported by Writer | User installs and manages the model server | Keep as an advanced option |
| Bundled llama.cpp helper | Jot owns setup/lifecycle; inference crashes can be isolated | Per-platform binaries, packaging, model management and IPC | Best first built-in desktop experiment |
| Direct llama C API through Rust/FFI | No HTTP listener; tight resource control | Native linking, chat templates, sampling/grammar integration, binding upkeep and crash coupling | Consider after the helper proves useful |

No Python, Node server, Docker, Ollama or LM Studio is required for a packaged native helper. A GGUF model and its compatible chat
template/tokenizer are still required. llama.cpp's MIT license covers the engine; each model and bundled third-party component
has its own terms and notices to verify before redistribution. No particular model is approved or selected by this exploration.

## Proposed desktop boundary

1. A user chooses **Built-in local AI** and imports a compatible GGUF, or explicitly downloads a listed model after seeing its
   size, license and approximate requirements. Journal text is never part of downloading a model. Keep model files outside
   portable journals and offer removal. Verify pinned download digests, handle cancellation/resume and insufficient disk space;
   model downloads must not fetch executables or execute templates as system commands.
2. Narrow Rust commands own model selection, starting, status, generation, cancellation and stopping. The webview gets no general
   shell capability, arbitrary executable arguments, unrestricted filesystem access or arbitrary HTTP proxy. Pass opaque model
   handles instead of accepting arbitrary paths from the page. This extends the existing native-dialog/command approach.
3. Rust launches a verified, pinned helper on loopback with a fresh session credential, a bounded context and one generation slot.
   Rust proxies only the owned inference operation; its port and credential need not be exposed to the webview. Detect readiness,
   port collisions, timeouts and crashes; never attach blindly to an unrelated listener. Use a controlled argument list and
   sanitized environment. Keep the credential out of command-line arguments, logs, journals and exports; the server documents
   an environment-based key option. This reduces exposure, not protection from other processes with equivalent OS privileges.
4. Launch offline with a local model path. Disable tools/agent mode, MCP/proxy features, web UI, public slot/metrics endpoints,
   prompt logging and persistent slot caches; do not inherit environment flags that can re-enable them. Limit the helper's
   network access where supported. A helper process is crash isolation, **not an OS security sandbox**. Loopback binding and an
   offline argument alone are not proof that all dependencies and future code can never contact the network.
5. Keep contextual processing and AI suggestions off until explicitly requested. Send the same bounded instruction/selected
   context as today. Apply model-specific input token budgeting: 24,000 characters can exceed a small model's context. Do not
   silently truncate selected writing. The existing 60-second deadline and 2,048-output-token cap need CPU measurements; start
   experiments with shorter answers rather than promising that every machine completes the maximum request.
6. Constrain the candidate JSON envelope, then run the existing local envelope, fragment and resulting-document checks. llama.cpp
   supports a subset of JSON Schema; unsupported features can be skipped. Grammar-constrained JSON does not validate the `.jot`
   string's contents or facts. Review, source-revision checks and undo stay mandatory. Local mode never falls back to OpenRouter.
7. Cancel and discard pending results on writing changes. Stop the owned process on journal lock/replacement, AI disconnect,
   application exit and a chosen idle timeout, releasing its model and journal-bearing inference caches. Do not rely on a slot
   erase API to clear every RAM cache. Disable disk cache saves; verify logs, crash reports and system-level retention separately.
   Local inference is not encryption of RAM/swap or protection from a compromised device.

ZDR remains an **OpenRouter-only routing setting**. Built-in local inference needs an honest local-processing status, not a ZDR
badge implying a cloud-provider guarantee.

## Accessibility, packaging and model size

Beginner experience: choose local AI, see whether a model is installed, choose import/download, then request help in the existing
companion. Hide server URLs, ports and launch flags from this path. AI remains optional; ordinary journaling works before a model
is installed, while it loads, when memory is insufficient or when generation fails. Provide cancel, unload and delete controls.

Start evaluating quantized instruction models around 1–3 billion parameters. At four bits per parameter, raw weights alone are
roughly 0.5–1.5 GB; actual GGUF files and runtime RAM are larger because of other tensors, quantization overhead, KV cache and
compute buffers. This is arithmetic for planning, **not a benchmark or an 8 GB machine compatibility guarantee**. Measure actual
peak memory, first-token delay, response time, battery/heat and instruction-following before recommending a model. Larger models
remain an explicit option for more capable machines. Do not claim all local models produce equally useful journal assistance.

Build/sign/test the helper and its required libraries per operating system and architecture. Tauri requires target-specific
sidecar filenames; simply adding `externalBin` does not package every GPU runtime/DLL automatically. Use portable CPU builds,
optional appropriate acceleration, and installer tests on clean systems. Desktop and mobile packaging are separate; this finding
does not establish Android/iOS inference support. No local model, inference binary or GPU runtime was downloaded or executed in
this exploration. Upstream feasibility is verified, native packaging and model behavior are not.

## Delivery order

1. Keep shipped Writer unchanged while comparing CodeMirror + Jot decorations against Draftly on the recorded fixtures and
   current regression suites. Preserve a source fallback and define source/offset contracts first.
2. Separately spike one desktop target with an imported GGUF and a Rust-owned helper; no model downloader or default model needed
   to prove lifecycle, private context flow, JSON/Jot validation and stopping on lock. Measure CPU and available acceleration.
3. Add the beginner model installer only after that spike passes. Verify distribution licenses, integrity, cancellation, disk
   capacity, update/rollback and delete behavior. Expand the platform/model matrix based on measurements.

Editor migration and bundled inference should remain independently reviewable: neither is a prerequisite for the other.

## Evidence and upstream references

These are engineering recommendations. No methods guide establishes that a particular editor or local model improves journaling
outcomes. Private writing and explicit sharing follow `docs/methods/digital-daily-notes.md, line 712` and
`docs/methods/expressive-writing.md, line 444`. Optional AI remains the owner's explicit exception to
`docs/methods/digital-daily-notes.md, line 715` and `docs/methods/prompt-journaling.md, line 624`, already recorded in `DECISIONS.md`.

- [CodeMirror guide](https://codemirror.net/docs/guide/) and [reference](https://codemirror.net/docs/ref/): text state, transactions,
  line separators and decorations.
- [Draftly](https://github.com/nexuls/draftly): essential plugins, source-based rendering and custom syntax.
- [ProseMirror guide](https://prosemirror.net/docs/guide/) and [Tiptap schemas](https://tiptap.dev/docs/editor/core-concepts/schema).
- [Milkdown](https://github.com/Milkdown/milkdown): ProseMirror/remark Markdown integration.
- [editate](https://github.com/inokawa/editate): experimental input-state alternative.
- [Tauri sidecars](https://v2.tauri.app/develop/sidecar/): packaging and Rust-controlled helper processes.
- [llama.cpp](https://github.com/ggml-org/llama.cpp), [server](https://github.com/ggml-org/llama.cpp/blob/master/tools/server/README.md),
  [grammars](https://github.com/ggml-org/llama.cpp/blob/master/grammars/README.md) and
  [C API](https://github.com/ggml-org/llama.cpp/blob/master/include/llama.h).
