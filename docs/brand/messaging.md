# What Jot says

The messaging every page, description and post is written from. It reads `.agents/brand-context.md` (who Jot is for) and is
written in the voice of `voice.md`. Every proof point below is a fact in this repository; check it again before quoting a number,
and update this file when it changes.

## 01 Core message

Jot helps journal keepers keep a journal that is theirs for life, by turning plain text, written one thought at a time, into
beautiful pages, with no account and nothing uploaded.

## 02 Value proposition

Jot is a journal you write in plain text and read as beautiful pages: dates in words, tasks, margin notes, charts of your
numbers, even handwriting on a dot grid. It is for anyone who keeps a journal, whatever their method, and the file stays an
ordinary text file that any editor opens. No account, no subscription, nothing uploaded: your journal outlives the app.

## 03 Taglines

| Tagline | Style | Rationale |
| --- | --- | --- |
| **Jot things down. Get beautiful pages back.** | Functional | Says what happens in the writer's own words: the input and the reward. Already on the homepage and README |
| **Just one thought at a time.** | Emotional | The name's second meaning; an invitation to start and keep going, at any length |
| Your journal, in plain text, for life. | Aspirational | The durability promise; good for the README and developers, colder for journal keepers |
| Write it plainly. Keep it forever. | Aspirational | Memorable rhythm, but "forever" overpromises |
| Ink, paper, plain text. | Witty | Ownable sensory image, but needs the rest of the page to explain it |

**Recommended:** the primary tagline is **Jot things down. Get beautiful pages back.** It is concrete, it fits every channel, and
it is already where people meet Jot. **Just one thought at a time.** is the line that goes with it wherever there is room for a
second line, and stands alone where the moment is about starting to write (the writer, a post, a sticker). The other three are
not used.

## 04 Messaging hierarchy

**Level 1, brand headline:** Jot things down. Get beautiful pages back.

**Level 2, supporting statement:** Type the way you think, one thought at a time, as brief or as detailed as it needs to be.
Jot lays it out as a page you'll want to reread, and the file stays plain text that's yours.

**Level 3, key messages:**

1. **Your journal outlives the app.**
   Journals last decades; apps don't. A `.jot` file is plain text, so it opens in any editor, even if every Jot tool disappeared.
   *Proof:* Jot files are UTF-8 text; the format is specified in `specification/` and read by an open parser (`parser/`).
2. **Yours, and only yours.**
   There is no account, no server and no analytics. The website, the desktop app and the tools run on your device, and nothing
   you write is uploaded.
   *Proof:* every page is checked before publishing by `tools/privacy-check.mjs`; locked journals use the browser's own
   encryption (AES-256-GCM) and nobody, including Jot, can reset them.
3. **Beautiful pages from plain words.**
   Dates in words, tasks ticked off, margin notes, charts of your numbers, handwriting on a dot grid; print it or save a page to
   share.
   *Proof:* three styles (Journal, Notes, Plain), three handwriting hands, 27 paper sizes, charts drawn from what you write.
4. **Every way of journaling, one file.**
   Bullet journal, morning pages, gratitude, mood and habit trackers, CBT thought records, a weekly dashboard: use one, use five,
   change your mind. Bring years of old posts in too.
   *Proof:* 62 method profiles in the specification, backed by 52 research guides in `docs/methods/`; Your life online reads X,
   Mastodon, Facebook, Instagram, Tumblr, Reddit and Google exports.

**Level 4, proof bank:**

- A `.jot` file is plain UTF-8 text; `.jotz` adds attachments in a ZIP; `.jotlock` is a locked journal.
- No account, no server, no analytics; nothing you write is uploaded. External services (Spotify, a webhook, Todoist, the
  weather) run only when you ask.
- 62 method profiles; 52 research guides, each citing its sources and saying where the evidence is thin.
- Three page styles, three handwriting hands (Caveat, Playpen Sans, Shantell Sans, all open-licensed), 27 paper sizes.
- Locking with a passphrase, a recovery code or a passkey, using built-in Web Crypto (AES-256-GCM).
- Tools: the website (Write, the template editor, the converter, Your life online, the guides), a desktop app (tested on Linux;
  set up for macOS, Windows, Android and iOS, not yet tested there), a command line with 19 commands, and a VS Code extension.
- Whole public-domain diaries converted to Jot as examples (Pepys, *The Diary of a Nobody*, Blunt).
- Free; no subscription.

## 05 Audience messaging

**For journal keepers (first):**
- *Care most about:* a place that feels like their notebook; their privacy; not losing years of writing; no pressure.
- *Lead with:* the page they get back, then that it's theirs.
- *Proof that lands:* handwriting on a dot grid; no account and nothing uploaded; "still opens in Notepad"; one thought at a
  time, no streaks.
- *Avoid:* file formats, the command line, "UTF-8", the specification, developer tools.

**For writers and developers who like plain text (second):**
- *Care most about:* an open format, files they control, scripting and editor support.
- *Lead with:* "a plain-text journal format with an open parser", then the tools.
- *Proof that lands:* the specification and conformance fixtures; the CLI; the VS Code extension; no dependencies to install for
  the site or CLI.
- *Avoid:* overselling the prettiness; hiding the draft status (Jot v1 is a draft).

**For people with years online (a door, not an audience of its own):**
- *Lead with:* "Years of posts, one journal."
- *Proof:* the services it reads; your own words by default; nothing uploaded.
- *Avoid:* nostalgia bait, "relive", anything that resurfaces old posts uninvited.

## 06 Messaging by channel

| Channel | Headline approach | Tone | Length |
| --- | --- | --- | --- |
| Website hero | Primary tagline, then the supporting statement | Warm, inviting | Short |
| Page titles | "Tool · Jot"; the homepage "Jot · Jot things down. Get beautiful pages back." | Plain | Very short |
| Repository and app store descriptions | Tagline, then what it is and that it's yours (below) | Plain, exact | Short |
| Social bio and link previews | Tagline, or "Just one thought at a time." with the wordmark | Calm | Very short |
| Release notes and posts | What changed, for whom, in one line each | Plain, quiet | Short |
| Talks and decks | Key messages 1 to 4, one per slide, with their proof | Warm, honest | Medium |

## 07 Canonical descriptions

Use these word for word, so every surface says the same thing.

**Repository (GitHub "About"):**
> Jot things down. Get beautiful pages back. A plain-text journal format (.jot) with a free browser workspace, desktop app, command line and VS Code extension. No account, nothing uploaded: your journal stays a file you own.

**Site meta description (homepage):**
> Jot things down in plain text and get beautiful journal pages back: dates, tasks, margin notes and handwriting on a dot grid. One thought at a time; no account, nothing uploaded, and the file stays yours.

**VS Code extension (`description`):**
> Write .jot journals in VS Code: syntax colors, a live page preview in journal, notes or plain style with charts, handwritten on a dot grid if you like, and export to one standalone HTML page.

**Desktop app (`shortDescription`):**
> Jot things down. Get beautiful pages back.

**Desktop app (`longDescription`):**
> Jot is a journal you write in plain text and read as beautiful pages, one thought at a time. Your journals stay ordinary files on your device: no account, nothing uploaded.

**One-liner (anywhere else):**
> Jot is a plain-text journal that gives you beautiful pages back.

## 08 Things not to say

- Health, mood or productivity outcomes ("reduces anxiety", "builds habits"): the research does not support claims like these
  for a product, and the voice never makes them.
- "Secure", "encrypted" or "private" without the specifics: say what is encrypted (a locked journal) and what is not (exports).
- "Open source": no project-wide licence is declared yet. Say "open format" and "the parser's source is in the repository".
- "Forever", "never lose a word": files can still be deleted; say "outlives the app".
- "AI", "smart", "automatic insights": Jot doesn't analyze your writing.
- Comparisons that name competitors on the website; describe what Jot does instead.
- "Just one thought" as a limit or a target ("keep it short", "one a day").
