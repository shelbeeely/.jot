# How Jot sounds

The voice is already in the product: the writer's "Start anywhere. A sentence is enough.", the editor's "Build the shape. Fill it
in by hand.", the converter's "Bring an old diary in. One entry a day." This guide writes down what those lines do, so new copy
sounds like them. It reads `.agents/brand-context.md` for who Jot is for, and the methods research (`docs/methods/README.md`,
"Recurring principles") for what a journal should never say to the person keeping it.

## 01 Voice overview

Jot speaks like a good notebook would if it could talk: quietly, warmly, and only when it has something useful to say. It writes
for someone who keeps a journal, not for someone who builds software, so it uses plain words and short sentences, and it leaves
the page to the writer. It gives permission rather than instructions ("Start anywhere."), it is honest about what it cannot do,
and it never measures, scores or hurries the person writing. Underneath the calm there is care: the privacy, the durable files and
the methods research are real, and the voice can say so plainly.

**Voice essence:** Jot sounds like a trusted notebook that talks back now and then: calm, warm and plain.

## 02 Tone dimensions

**Casual ←→ Formal:** casual, never sloppy. Contractions, everyday words, full sentences.
> Your writing stays here.

**Calm ←→ Energetic:** calm. No exclamation marks, no urgency, nothing that shouts.
> Open a journal, or start a new one.

**Serious ←→ Playful:** gently serious, with a light touch where it fits (a hand-drawn iota, "ιot"). Never jokes at the writer's
expense, and never light about health, grief or safety.
> Just one thought at a time.

**Accessible ←→ Authoritative:** accessible first, precise underneath. Explain in plain words; name the method or the format when
it helps someone find more; cite the research where a claim needs it.
> A locked journal opens only with one of its ways in.

**Distant ←→ Intimate:** close but respectful. "You" and "your writing"; never presumes how someone feels.
> Where you left off.

## 03 Voice qualities

**Permission, not pressure.** Jot invites and never demands; one thought is enough to start, and a missed day is a blank, not a
failure (`docs/methods/README.md`: "Gaps are data, not failures"; "No streaks, catch-up prompts or shame wording").
- **Do:** "Start anywhere. A sentence is enough."
- **Don't:** "You haven't written in 3 days! Keep your streak alive."

**Plain.** Everyday words a journal keeper uses, not the words a developer uses; technical terms only where someone needs them,
explained once.
- **Do:** "The file stays an ordinary text file: any editor opens it."
- **Don't:** "Stored as UTF-8 encoded plain text with a source-preserving AST."

**Honest.** Say what is true, including the limits; never claim a therapeutic or productivity effect the research does not show.
- **Do:** "Tested on made-up samples, not yet on many real exports."
- **Don't:** "Journaling with Jot reduces anxiety and boosts productivity."

**Quiet.** Few words, then get out of the way. Status messages say what happened; they don't celebrate it.
- **Do:** "Downloaded a plain .jot: your writing, readable in any text editor."
- **Don't:** "Awesome! 🎉 Your amazing journal is ready to go!"

**Warm.** Kind, human sentences with the writer at the center. Warmth comes from care and specifics, not adjectives.
- **Do:** "Years of posts, one journal."
- **Don't:** "Leverage our powerful import pipeline to ingest your social data."

**Private by default.** Talk about the writer's words as theirs, and say plainly where they go (usually nowhere).
- **Do:** "Nothing is uploaded."
- **Don't:** "Sync your journal to the cloud for the best experience."

## 04 Vocabulary

**Words we use:** jot, journal, write, your writing, page, pages, a thought, one thought at a time, entry, notebook, plain text,
file, keep, open, start anywhere, handwritten, dot grid, ink, margin note, method, way in (for a lock), private, nothing is
uploaded, yours.

**Words we avoid:** user (say "you" or "the writer"), content, leverage, unlock (as a sales verb; "unlock" is only for locked
journals), powerful, seamless, supercharge, boost, productivity hack, streak, goal (as a pushed target), achievement, level up,
engagement, AI-powered, revolutionary, world-class, game-changing, simply / just (as in "just do X"), "don't worry".

**Brand-specific language:**
- **Jot** in text, always with a capital J. The logo spells it "ιot"; running text never does.
- **`.jot`, `.jotz`, `.jotlock`** with the dot and in code style when naming the file type: "a plain `.jot`".
- **Just one thought:** one thought at a time, as brief or as detailed as it needs to be; never a length limit or a target.
- **The tools by what they do:** Write, the template editor, the converter, Your life online, the guides. Not "Jot Studio" or
  product names.
- **Ways in** for a locked journal's passphrase, recovery code and passkeys.
- **Methods** for journaling practices (bullet journal, morning pages); **profiles** only in the specification.

## 05 Writing style rules

- **Sentence length:** short, mostly; one idea per sentence. Headlines are often two short sentences ("Build the shape. Fill it
  in by hand.").
- **Punctuation:** no exclamation marks; no em dashes in body copy (use a colon, a comma or a full stop); colons to introduce what
  follows; ellipses only in placeholders. The middle dot (·) only in page titles and labels ("Write · Jot").
- **Capitalization:** sentence case everywhere, headlines included. Small-caps eyebrows on the site are styled, not typed in
  capitals.
- **Spelling:** American English (color, behavior), which most of the project already uses.
- **Numbers:** numerals for counts, sizes and dates ("52 method guides", "64 MiB", "2026-10-30"); words for one to nine in
  running prose where a number is not data ("one thought", "three ways in").
- **Contractions:** yes (you'll, it's, don't), except in legal or safety wording where precision matters.
- **Active voice:** by default ("Jot opens it"). Passive is fine when the actor doesn't matter ("Nothing is uploaded").
- **Humor:** rare and gentle: a wink in the name or the logo, never in errors, health, safety or grief.

## 06 Channel adaptations

| Channel | Tone adjustment | Example |
| --- | --- | --- |
| Website homepage | The warmest and most inviting; two-line headlines | "Jot things down. Get beautiful pages back." |
| Guides | Patient and specific; second person, step by step | "Save this as `my-journal.jot`, or paste it into Write." |
| README and developer docs | Plain and exact; commands and file names, no marketing | "The CLI needs no npm install." |
| Social posts and link previews | One idea, one line, no hashtags in a row | "Just one thought at a time. Your journal, in plain text." |
| UI status messages | What happened, in one sentence; no celebration | "Opened the .jotz document, including all its assets." |
| Errors | What went wrong and what to do; never blame | "This editor opens Jot documents up to 64 MiB." |
| Privacy, health and safety pages | The plainest of all; short, factual, with a real pointer to help where it is crisis-adjacent (as in `docs/methods/safety-planning.md`, line 17) | "If you are in crisis right now: in the US, call or text 988. Outside the US, check your local services and emergency number." |

## 07 Before and after

**Before:**
> Unlock the power of journaling with Jot's revolutionary AI-free platform!

**After:**
> Jot things down. Get beautiful pages back.

**Why it works:** it says what happens, in the writer's words, without hype.

**Before:**
> Oops! You missed yesterday's entry. Don't break your streak!

**After:**
> Where you left off.

**Why it works:** a gap is not a failure, and nothing is counted.

**Before:**
> Error 413: payload exceeds maximum size.

**After:**
> This editor opens Jot documents up to 64 MiB.

**Why it works:** it names the limit in plain words, without a code or blame.

**Before:**
> Users can leverage plain-text storage for long-term data durability.

**After:**
> Journals last decades; apps don't. A `.jot` file still opens in Notepad.

**Why it works:** "you", a concrete promise and a familiar example in place of jargon.

**Before:**
> Write a little every day to build a healthy habit!

**After:**
> Just one thought at a time, as brief or as detailed as it needs to be.

**Why it works:** permission instead of a target; length is the writer's choice.

## 08 Things we never say

- Hype: "revolutionary", "game-changing", "world-class", "powerful", "seamless", "supercharge".
- Pressure: streaks, "don't break your chain", "you missed", countdowns, "only X days left", catch-up prompts.
- Scores and verdicts on the writer: "great job", grades, "your mood is low", anything that diagnoses (record, don't diagnose).
- Health or productivity promises the research does not back: "reduces anxiety", "10x your focus".
- Over-apology and filler: "Oops!", "Sorry for the inconvenience", "simply", "just" as in "just do it".
- Corporate distance: "users", "content", "leverage", "solutions", "ecosystem".
- Anything that would harm if someone else read the journal or the notification.
