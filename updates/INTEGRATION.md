# Integration guide

How to use the two TTS endpoints in your apps, and how every demo UI control
maps to a field you send.

Sections 1 to 15 are the endpoint reference. **Section 16 is the app layer**:
the pipeline, the rewrite prompt, the pronunciation rules, the chunking and the
playback rules that the web assistant uses. Read it before you build a client.
The engine settings alone will not get you a voice people want to listen to.

```
voxcpm2    https://api.runpod.ai/v2/hh4itugst7fv4t/runsync
omnivoice  https://api.runpod.ai/v2/tgbmh4mklvl2p8/runsync
```

---

## 1. Which model do I use?

| You need | Use | Why |
|---|---|---|
| Najdi or Gulf Arabic, named exactly | `omnivoice` | It has 600+ language tags, including `Najdi Arabic`. |
| A voice from a description alone | either | Both do voice design. |
| The closest possible copy of a real voice | `voxcpm2` | Ultimate Cloning copies every vocal detail. |
| Non-verbal sounds like `[sigh]` | `omnivoice` | It has a fixed tag list. VoxCPM has none. |
| Highest audio quality | `voxcpm2` | 48 kHz against OmniVoice's 24 kHz. |
| A noisy reference clip | `omnivoice` | Its denoiser works. VoxCPM's cannot run here. |

For a Saudi bank agent in Najdi Arabic, start with **omnivoice**. It is the only
one of the two that takes `Najdi Arabic` as a language tag.

---

## 2. The call shape

Every request is the same shape. Only the fields inside `input` change.

```
POST https://api.runpod.ai/v2/<endpoint-id>/run
Authorization: Bearer <your-runpod-key>
Content-Type: application/json

{"input": { ...your fields... }}
```

You get back a job id. Poll until it is done:

```
GET https://api.runpod.ai/v2/<endpoint-id>/status/<job-id>
Authorization: Bearer <your-runpod-key>
```

When `status` is `COMPLETED`, read `output`:

```json
{
  "status": "COMPLETED",
  "output": {
    "audio_b64": "UklGRi...",
    "sample_rate": 24000,
    "format": "wav",
    "duration_sec": 3.92,
    "warnings": []
  }
}
```

`audio_b64` is a base64 audio file. Decode it and write it to disk, or serve it
straight to a browser as a data URI.

### Use `/run`, not `/runsync`

`/runsync` gives up after 60 seconds. A cold worker takes longer than that.
`/run` plus polling always works. Both supplied clients already do this.

Use `/runsync` only when you know a worker is already warm and the text is short.

---

## 3. Drop-in clients

### Python

```python
import sys
sys.path.insert(0, "client")
from tts_client import TTSClient

tts = TTSClient(
    api_key="...",
    voxcpm_endpoint_id="hh4itugst7fv4t",
    omnivoice_endpoint_id="tgbmh4mklvl2p8",
)

out = tts.omnivoice("مرحبا بالعالم", language="Najdi Arabic", out_path="hi.wav")
print(out["duration_sec"], out["warnings"])
```

Or set `RUNPOD_API_KEY`, `VOXCPM_ENDPOINT_ID`, and `OMNIVOICE_ENDPOINT_ID` and
call `TTSClient()` with no arguments.

### TypeScript

```ts
import { TTSClient } from "./client/ttsClient";
import fs from "fs";

const tts = new TTSClient();
const out = await tts.omnivoice("مرحبا بالعالم", { language: "Najdi Arabic" });
fs.writeFileSync("hi.wav", Buffer.from(out.audio_b64, "base64"));
```

### In a browser

Do not put your Runpod key in browser code. Anyone can read it. Call the
endpoint from your own server, then send the audio to the browser.

```ts
// your server route
const out = await tts.omnivoice(req.body.text, { language: "Najdi Arabic" });
res.json({ src: `data:audio/wav;base64,${out.audio_b64}` });
```

```html
<audio :src="src" controls></audio>
```

---

## 4. Every VoxCPM2 field

`text` is the only required field. Everything else has a default.

### Voice and cloning

| Field | Type | Default | What it does |
|---|---|---|---|
| `text` | string | — | The words to speak. |
| `ref_audio_url` | string | — | Link to the reference voice clip. |
| `ref_audio_b64` | string | — | The clip as base64. Use a URL above 7 MB. |
| `ref_text` | string | — | What the clip says. Needed for `clone_mode: "prompt"`. |
| `ref_trim_seconds` | float | — | Keep only the first N seconds of the clip. Use 3 to 10. |
| `instruct` | string | — | A voice or style description. See the note below. |
| `clone_mode` | string | `reference` | `reference` or `prompt`. |

### Quality and sampling

| Field | Type | Default | Range | What it does |
|---|---|---|---|---|
| `cfg_value` | float | `2.0` | 1 to 3 | Higher follows the text and reference more closely. Lower is more creative. |
| `inference_timesteps` | int | `10` | 4 to 64 | Diffusion steps. Higher is cleaner and slower. |
| `seed` | int | — | any | Fix it to get the same audio twice. |

### Text and audio handling

| Field | Type | Default | What it does |
|---|---|---|---|
| `normalize` | bool | `true` | Read numbers, dates, and abbreviations as words. Uses wetext. |
| `denoise` | bool | `false` | **Not available.** See the note below. |
| `audio_format` | string | `wav` | `wav`, `mp3`, `flac`, or `ogg`. |

### Length and retry

| Field | Type | Default | What it does |
|---|---|---|---|
| `min_len` | int | `2` | Smallest number of tokens to generate. |
| `max_len` | int | `4096` | Cap on generated tokens. Raise it for very long text. |
| `retry_badcase` | bool | `true` | Generate again when the audio length looks wrong for the text. Catches cut-off and runaway output. |
| `retry_badcase_max_times` | int | `3` | How many retries. |
| `retry_badcase_ratio_threshold` | float | `6.0` | Audio-to-text ratio that counts as bad. Lower is stricter. |

### How `instruct` really works in VoxCPM

VoxCPM has no instruction argument. The demo folds the description into the text
as `(description)text`, and the model reads it there. This endpoint does the same
for you, so send `instruct` as a normal field.

`clone_mode: "prompt"` cancels `instruct`. The demo disables its Control
Instruction box in that mode, because the reference clip already carries the
style. Send both and the endpoint drops `instruct` and says so in `warnings`.

### VoxCPM cannot denoise your reference clip

The demo has a "Reference audio enhancement" switch. This endpoint does not.

VoxCPM's denoiser runs through ModelScope, which needs `torchcodec`.
`torchcodec` ships a compiled library that links against torch, and the Runpod
flash build excludes torch packages, so it fails:

```
Audio denoising processing failed: Could not load this library:
/app/torchcodec/libtorchcodec_image.so
```

Sending `denoise: true` does nothing and you get this back in `warnings`:

```
The denoiser is off. Set VOXCPM_DENOISER=1 to turn it on.
```

Do not set `VOXCPM_DENOISER=1`. Every request with reference audio then fails.

**Do this instead.** Pick one:

1. **Use OmniVoice.** Its denoiser is built in and needs none of that. It is on
   by default and it works.
2. **Clean the clip yourself** before you upload it:
   ```bash
   ffmpeg -i noisy.m4a -af "afftdn=nf=-25,highpass=f=80,lowpass=f=8000" \
     -ac 1 -ar 24000 clean.wav
   ```

A clean phone recording clones well on VoxCPM without any denoising. Only reach
for this when there is real background noise.

### Demo control, mapped

| Demo control | Field |
|---|---|
| Target Text | `text` |
| Reference Audio | `ref_audio_url` or `ref_audio_b64` |
| Control Instruction | `instruct` |
| Ultimate Cloning Mode ON | `clone_mode: "prompt"` plus `ref_text` |
| Ultimate Cloning Mode OFF | `clone_mode: "reference"` |
| Reference audio enhancement | `denoise` — not available, see below |
| Text normalization | `normalize` |
| CFG (guidance scale) | `cfg_value` |

---

## 5. Every OmniVoice field

`text` is the only required field.

### Voice and cloning

| Field | Type | Default | What it does |
|---|---|---|---|
| `text` | string | — | The words to speak. |
| `language` | string | auto | A name like `Najdi Arabic`. See the list in section 8. |
| `ref_audio_url` | string | — | Link to the reference voice clip. Use 3 to 10 seconds. |
| `ref_audio_b64` | string | — | The clip as base64. Use a URL above 7 MB. |
| `ref_text` | string | Whisper | What the clip says. Leave it out and Whisper writes it. |
| `ref_trim_seconds` | float | — | Keep only the first N seconds of the clip. Use 3 to 10. |
| `voice_clone_prompt_url` | string | — | Link to a saved `.pt` voice prompt. Overrides `ref_audio` and `ref_text`, and skips the encode and Whisper steps. |
| `return_voice_prompt` | bool | `false` | Encode the reference clip into a `.pt` voice prompt and return it as `voice_prompt_b64`, instead of making audio. `text` is ignored. See section 10. |
| `instruct` | string | — | A voice description, for example `female, middle-aged, moderate pitch`. |

### Timing

| Field | Type | Default | Range | What it does |
|---|---|---|---|---|
| `speed` | float | auto | 0.5 to 1.5 | Above 1.0 is faster. |
| `duration` | float | auto | seconds | Force the output length. This overrides `speed`. Leave it out to use `speed`. |

### Quality and sampling

| Field | Type | Default | Range | What it does |
|---|---|---|---|---|
| `num_step` | int | `32` | 4 to 64 | Decoding steps. Higher is cleaner and slower. |
| `guidance_scale` | float | `2.0` | 0 to 4 | Higher follows the text and reference more closely. |
| `t_shift` | float | `0.1` | 0 to 1 | Time-step shift. Smaller gives the noisy early steps more weight. |
| `layer_penalty_factor` | float | `5.0` | — | Push the model to fill earlier codebook layers first. Higher is a stronger push. |
| `position_temperature` | float | `5.0` | — | Randomness when picking which position to decode next. |
| `class_temperature` | float | `0.0` | — | Randomness when picking a token. `0` is greedy, so it is the most stable. |

### Text and audio handling

| Field | Type | Default | What it does |
|---|---|---|---|
| `normalize_text` | bool | `false` | Read numbers and dates as words. |
| `denoise` | bool | `true` | Prepend the denoise token. |
| `preprocess_prompt` | bool | `true` | Cut silence from the reference clip. Also add a full stop to `ref_text` if it has none. |
| `postprocess_output` | bool | `true` | Cut long silences from the result, then fade and pad the edges. |
| `audio_format` | string | `wav` | `wav`, `mp3`, `flac`, or `ogg`. |

### Long text chunking

| Field | Type | Default | What it does |
|---|---|---|---|
| `audio_chunk_duration` | float | `15.0` | Split long text into chunks of about this many seconds. Use `0` to turn chunking off. |
| `audio_chunk_threshold` | float | `30.0` | Only chunk when the estimated audio is longer than this. |
| `pad_duration` | float | `0.1` | Seconds of silence added to each end. |
| `fade_duration` | float | `0.1` | Seconds of fade in and fade out. |

### Demo control, mapped

| Demo control | Field |
|---|---|
| Text to Synthesize | `text` |
| Reference Audio | `ref_audio_url` or `ref_audio_b64` |
| Language | `language` |
| Instruct | `instruct` |
| Speed | `speed` |
| Duration (seconds) | `duration`. The demo's `0` means "not set" — leave the field out instead. |
| Inference Steps | `num_step` |
| Denoise | `denoise` |
| Guidance Scale (CFG) | `guidance_scale` |
| Preprocess Prompt | `preprocess_prompt` |
| Postprocess Output | `postprocess_output` |

---

## 6. Worker settings (not per request)

These apply to the whole endpoint, not one call. Change them in the worker file
and run `flash deploy`.

### voxcpm_worker.py

| Env var | Default | What it does |
|---|---|---|
| `VOXCPM_MODEL_ID` | `openbmb/VoxCPM2` | Which weights to load. A Hugging Face id or a path. |
| `VOXCPM_DENOISER` | `1` | Load ZipEnhancer. Set `0` for a faster cold start with no `denoise` support. |
| `VOXCPM_ZIPENHANCER_ID` | `iic/speech_zipenhancer_ans_multiloss_16k_base` | Which denoiser model. |
| `VOXCPM_OPTIMIZE` | `0` | `torch.compile` the model. It is faster per call but adds minutes to every cold start. Only worth it with a warm worker. |
| `VOXCPM_LORA_PATH` | empty | Path to your own fine-tuned LoRA weights. |

### omnivoice_worker.py

| Env var | Default | What it does |
|---|---|---|
| `OMNIVOICE_MODEL_ID` | `k2-fsa/OmniVoice` | Which weights to load. |
| `OMNIVOICE_ASR_MODEL` | `openai/whisper-large-v3-turbo` | Which model transcribes the reference clip. |
| `OMNIVOICE_DTYPE` | `float16` | `float16`, `bfloat16`, or `float32`. `float32` is slower and needs more VRAM. |

### Both worker files

| Setting | Default | What it does |
|---|---|---|
| `gpu` | 4 tiers, 24 GB and up | Keep the list wide. Supply on one tier is often low. |
| `workers` | `(0, 5)` | `(1, 5)` keeps one warm, so there is no cold start. That costs about $0.35 an hour all day. |
| `idle_timeout` | `300` | Seconds a worker stays awake after its last job. |
| `max_concurrency` | `1` | Requests one worker handles at once. |
| `execution_timeout_ms` | `0` | `0` means no limit. |

### Not available

`streaming` exists in VoxCPM's Python API but not here. A Runpod queue job
returns one whole result, so there is nothing to stream into.

## 7. Worked examples

### Saudi bank agent, Najdi Arabic, cloned voice

This is the screenshot, as a request.

```json
{
  "input": {
    "text": "السلام عليكم، حياك الله في خدمة عملاء البنك.\nمعك نورة، كيف أقدر أخدمك اليوم؟",
    "language": "Najdi Arabic",
    "ref_audio_url": "https://your-cdn.example.com/noura-28s.wav",
    "ref_text": "the transcript of that clip",
    "instruct": "female, middle-aged, moderate pitch",
    "speed": 1.0,
    "num_step": 32,
    "guidance_scale": 2.0,
    "denoise": true,
    "preprocess_prompt": true,
    "postprocess_output": true
  }
}
```

### Same thing on VoxCPM2, style from a description

```json
{
  "input": {
    "text": "السلام عليكم، حياك الله في خدمة عملاء البنك.",
    "instruct": "A Saudi Najdi woman with a soft, sweet voice. Speaks slowly with a melancholic tone.",
    "ref_audio_url": "https://your-cdn.example.com/noura-28s.wav",
    "clone_mode": "reference",
    "cfg_value": 1.9,
    "normalize": true,
    "denoise": true
  }
}
```

### VoxCPM2 Ultimate Cloning, closest copy of the voice

```json
{
  "input": {
    "text": "السلام عليكم، حياك الله في خدمة عملاء البنك.",
    "ref_audio_url": "https://your-cdn.example.com/noura-28s.wav",
    "ref_text": "the exact transcript of that clip",
    "clone_mode": "prompt",
    "cfg_value": 2.0
  }
}
```

Do not add `instruct` here. Ultimate Cloning ignores it.

### No reference audio, voice from a description only

```json
{"input": {"text": "Hello.", "instruct": "a calm older man, warm and slow"}}
```

---

## 8. Language names for OmniVoice

Send the full name, not the code. Arabic variants the model knows:

```
Standard Arabic     Najdi Arabic       Gulf Arabic        Hijazi Arabic
Egyptian Arabic     Levantine Arabic   Omani Arabic       Dhofari Arabic
Mesopotamian Arabic Sudanese Arabic    Moroccan Arabic    Tunisian Arabic
Libyan Arabic       Algerian Arabic    Baharna Arabic     Saidi Arabic
```

Leave `language` out and the model guesses. Naming it gives a better result.

---

## 9. Non-verbal sounds (OmniVoice only)

Put a tag inline in `text`. The screenshot uses `[sigh]`.

```
شكرًا لك. [sigh] لحظة واحدة، خليني أراجع الطلب في النظام.
```

The full list:

```
[laughter]  [sigh]              [confirmation-en]   [question-en]
[question-ah]   [question-oh]   [question-ei]       [question-yi]
[surprise-ah]   [surprise-oh]   [surprise-wa]       [surprise-yo]
[dissatisfaction-hnn]
```

Any other bracketed word is read out loud as text. VoxCPM has no tag support.

**The bank app allows none of them.** They were tried and removed. A model
choosing the tag put it in the wrong place often enough that the reply sounded
fake, which is worse than a plain reading. Strip every bracket before the voice
whichever engine you use, or a stray `[worried]` from an upstream model is
spoken as the word "worried".

---

## 10. Reference audio

### Any format works

Send m4a, mp3, wav, ogg, flac, or aac. The worker runs ffmpeg on every clip and
turns it into mono WAV before the model sees it. You do not convert anything.

A voice note straight off a phone works. That is an m4a with AAC inside.

### Trim it to 3 to 10 seconds

This is the single biggest lever on clone quality. Both models clone worse from
a long clip, and a long clip is slower.

Use `ref_trim_seconds` and the worker cuts it for you:

```json
{
  "input": {
    "text": "الكلام المطلوب",
    "ref_audio_url": "https://your-cdn.example.com/voice-note.m4a",
    "ref_trim_seconds": 8
  }
}
```

Leave `ref_trim_seconds` out and the whole clip is used. If the clip is longer
than 20 seconds you get this back in `warnings`:

```
The reference clip is 46s. Use 3 to 10 seconds for a better clone.
Set ref_trim_seconds to cut it.
```

`ref_trim_seconds` always takes the **first** N seconds. Cut the clip yourself
first if the good part is in the middle:

```bash
ffmpeg -i voice-note.m4a -ss 12 -t 8 -ac 1 clean-8s.wav
```

### The other rules

- Use the same language as the target text. A different language adds an accent.
- Send `ref_text` when you have it. It is more accurate than Whisper.
- One voice only. No music, no background talk.
- Send a URL, not base64, for anything over about 7 MB.
- Keep `denoise: true` for a phone recording. It cleans the room noise first.

### Reuse one voice across many calls (OmniVoice)

Encoding the clip and running Whisper on it happens on **every** call, and it is
the slowest part of a cloned request. Do it once instead.

**Step 1. Make the voice prompt.** Send `return_voice_prompt: true` with your
reference audio. You get back `voice_prompt_b64` and no audio.

```json
{"input": {"text": "ignored", "return_voice_prompt": true,
           "ref_audio_b64": "UklGRi...", "preprocess_prompt": true}}
```

```json
{"output": {"voice_prompt_b64": "gAJ9cQ...", "ref_text": "what Whisper heard",
            "audio_b64": null, "warnings": []}}
```

Decode that to a `.pt` file. It is about 14 KB, against 384 KB for the clip.

**Step 2. Host it and pass its URL on every later call.**

```json
{"input": {"text": "الكلام المطلوب", "language": "Najdi Arabic",
           "voice_clone_prompt_url": "https://your-host.example.com/najdi-e.pt"}}
```

Measured on the same line, three runs each:

| | Time | Pitch spread across runs |
|---|---|---|
| `ref_audio_b64` | 12 to 15 s | 36 Hz |
| `voice_clone_prompt_url` | **2.8 to 3.1 s** | **8 Hz** |

Faster, and steadier. The encoding is fixed instead of derived again each time.
The transcript Whisper heard is stored inside the `.pt`, so it stays consistent
too.

A ready-made client for step 1 is in the bank app:
`scripts/tts/make-voice-prompt.mjs`.

---

## 11. Speed and cost

| Case | Time |
|---|---|
| Cold worker, first call | 60 to 120 seconds |
| Warm worker | 3 to 30 seconds, depending on text length |

A worker sleeps 300 seconds after its last job. Costs are per GPU-second, and
nothing while asleep.

**Keep one worker warm** if a user is waiting on the audio. Change
`workers=(0, 5)` to `workers=(1, 5)` in the worker file and run `flash deploy`.
That costs about $0.35 an hour, all day, but removes the cold start.

**Batch instead** if nobody is waiting. Send many `/run` jobs at once. The first
pays the cold start and the rest are warm.

---

## 12. Errors

Every response has a `warnings` list. Read it. It tells you when the endpoint
changed or dropped something you sent.

| Job `status` | What to do |
|---|---|
| `IN_QUEUE` | Keep polling. A cold start looks like this. |
| `IN_PROGRESS` | Keep polling. |
| `COMPLETED` | Read `output`. |
| `FAILED` | Read `error`. Do not retry the same input blindly. |
| `TIMED_OUT` | The text was too long. Split it and send the parts. |

Long text: split on sentences and send one request per paragraph, then join the
audio. A single request over about 30 seconds of speech gets unreliable.

---

## 13. Changing the endpoints

Edit `voxcpm_worker.py` or `omnivoice_worker.py`, then:

```bash
flash dev       # test on a real GPU first
flash deploy    # ship to the same endpoint ids
```

### A deploy takes about three minutes to reach the workers

`flash deploy` reports success straight away. The workers keep serving the
**old** code for roughly three more minutes, until they cycle. A new argument
comes back as:

```
FAILED: omnivoice_synthesize() got an unexpected keyword argument 'my_new_field'
```

Nothing is wrong. Wait and try again.

**Do not go hunting.** The obvious explanations are all wrong, and each one
costs time:

- it is not a stale artifact — check with
  `tar xzf .flash/artifact.tar.gz -O ./omnivoice_worker.py | grep my_new_field`
- it is not `flashboot`, and `flash undeploy --all --force` does not help. That
  only changes both endpoint ids and gives you more work.
- it is not a stale `.flash/__pycache__` or a stale `.flash/server.py`
- it is not the dependency cache. Adding a package appears to fix it, but only
  because the extra install buys the three minutes.
- it is not the CLI version

**Check it properly.** Both workers return a `build_marker` field. Change its
value whenever you change the worker, then poll for it:

```bash
until curl -s -X POST https://api.runpod.ai/v2/$OMNIVOICE_ENDPOINT_ID/runsync \
  -H "Authorization: Bearer $RUNPOD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"input": {"text": "x", "language": "Najdi Arabic"}}' \
  | grep -q "my-new-marker"; do sleep 30; done
echo "new code is live"
```

Measured: the marker flipped 3 minutes and 7 seconds after `flash deploy`
returned. Do not debug your own code until that marker is right.

### Do not delete endpoints in the Runpod console

`flash` keeps its own record. A console delete makes that record stale, and
`flash` then tries to create a second endpoint and hits your worker quota.
Use `flash undeploy` instead.

---

## 14. Tuning: which knob for which problem

Change one field at a time. Set `seed` on VoxCPM so you can compare fairly.

### The voice does not sound like my reference clip

1. Use a better clip. 3 to 10 seconds, one speaker, no music, same language.
2. Send `ref_text` instead of letting Whisper guess it.
3. Raise `guidance_scale` (OmniVoice) or `cfg_value` (VoxCPM) toward the top of
   its range.
4. On VoxCPM, switch to `clone_mode: "prompt"` with `ref_text`. That is the
   closest copy the model can make.

### The audio is noisy or muddy

1. Raise `num_step` (OmniVoice) or `inference_timesteps` (VoxCPM). Try 48 and 20.
2. Keep `denoise: true`.
3. Clean the reference clip before you upload it.

### It reads numbers digit by digit

Set `normalize_text: true` (OmniVoice) or `normalize: true` (VoxCPM). Or write
the number as words in `text`, which always works.

### It speaks too fast or too slow

OmniVoice: set `speed`, between 0.5 and 1.5. Use `duration` when you need an
exact length, for example to fit a video.

VoxCPM has no speed field. Describe the pace in `instruct`, for example
`speaks slowly and calmly`.

### The output is cut off, or it rambles past the text

VoxCPM: keep `retry_badcase: true`. Lower `retry_badcase_ratio_threshold` to
about `4.0` to catch more bad cases. Raise `max_len` for very long text.

OmniVoice: shorten the text, or lower `audio_chunk_threshold` so chunking starts
sooner.

### Every call sounds different and I want it stable

VoxCPM: set a fixed `seed`.

OmniVoice: set `class_temperature: 0.0`, which is the default and is greedy.
Then raise `guidance_scale`. OmniVoice has no seed field, so it will still vary
a little.

### I want more variety, not less

Lower `cfg_value` or `guidance_scale`. On OmniVoice, raise `class_temperature`
a little, for example `0.3`.

### There are long gaps in the audio

Keep `postprocess_output: true` (OmniVoice). Lower `pad_duration` to `0.0` to
drop the silence on the ends.

### It is too slow

1. Lower `num_step` or `inference_timesteps`. 16 and 6 are usable.
2. Keep one worker warm: `workers=(1, 5)` in the worker file.
3. Turn off `retry_badcase` on VoxCPM. It is faster but riskier.
4. Set `VOXCPM_DENOISER=0` if you never send reference audio.

On VoxCPM, do not expect much from step 1. Most of a VoxCPM call is re-reading
the reference clip, not the diffusion. Measured over four texts, dropping
`inference_timesteps` from 16 to 8 saved between 0.0 and 2.2 seconds.

### Raising `num_step` for accuracy

It probably will not buy you accuracy. Swept 32 / 48 / 64 / 96 on the same
Arabic line with numbers in it:

| `num_step` | Wall | Read the numbers right | Jitter |
|---|---|---|---|
| 32 | 5.7 s | yes | 33.1% |
| 48 | 5.2 s | yes | 30.0% |
| 64 | 6.9 s | yes | 31.4% |
| 96 | 8.5 s | yes | 31.7% |

All four were correct, so there was nothing to buy. Jitter, the wobble inside a
sentence, did improve from 32 to 48 at no cost in time. Past 48 it only gets
slower. The bank app uses **48**.

### VoxCPM produces gibberish for one particular sentence, every time

A fixed `seed` is deterministic, so a seed that lands on a bad generation for a
given text lands on it **every single time**. It looks random because it depends
on the sentence, not on luck.

Measured: with `seed: 20261218` one line came back as 13.12 s of Finnish-sounding
noise. `retry_badcase: true` was on and did not catch it. The same line with
seeds 20261219, 7 and 99 was 6.2 to 7.2 s and correct.

Detect it rather than trust the flag. Compare `duration_sec` against what the
text should take, roughly 14 Arabic characters a second. If the audio is far
longer than that, run it again with a different seed.

### The first call always takes 2 minutes

That is the cold start. Either keep one worker warm with `workers=(1, 5)`, or
send a short warm-up request before the real one.

---

## 16. Building the assistant voice (what the web app does)

Sections 1 to 15 cover the endpoints. This section covers everything **around**
them: the app layer that turns a chat reply into speech a person wants to hear.
Copy it. The engine settings alone will not get you there.

### The pipeline, in order

```
assistant reply (may contain digits, markdown, an IBAN)
  |
  1. REDACT      strip anything secret. Before anything leaves your server.
  2. REWRITE     a small LLM turns it into spoken Najdi Arabic.
  3. FINALISE    strip markdown and every bracket.
  4. SYNTHESIZE  one call per chunk, to OmniVoice or VoxCPM.
  5. NORMALISE   ffmpeg loudnorm to -18 LUFS.
  |
audio the client plays
```

Steps 1 and 3 are yours and are not optional. Step 2 is where the quality is.

### 1. Redact first, always

Run this **before** the text reaches any third party, including the rewrite
model. Remove:

- an IBAN
- a full card number, four groups of four
- an OTP that follows a keyword like "code" or "رمز"
- any run of nine or more digits

A masked tail like `****4521` is fine to keep and speak.

### 2. The rewrite model does the language work

Do not try to do this with rules. The app used to convert numbers with regular
expressions and it was wrong constantly: Arabic counted nouns, the spoken form
against the written form, the dialect. A small model does it in about a second.

Model: `openai/gpt-5.6-luna` via OpenRouter. `temperature: 0`, `max_tokens: 900`,
reasoning off, 8 second timeout. **On any failure send the original text
through unchanged.** The voice matters more than the polish.

The system prompt is 12 rules. The full current text lives in the web repo at
`src/lib/tts/speechRewriter.ts`. What each group is for:

| Rules | Job |
|---|---|
| 1 to 3 | Spell every number in **spoken** Najdi. `2,000` is `ألفين`, not `ألفا`. Account numbers, IBANs and card tails go one digit at a time. |
| 4 to 5 | Never change an amount, a name, a date or a code. Never invent a number. Keep every clause, bad news included. |
| 6 to 11 | Sound like a person, not a recording. No stock closing. Never greet first, but greet back if greeted. Say each fact once. |
| 12 to 13 | Punctuation, no markdown, never translate. |
| 14 to 16 | Pronunciation. See below. |

Two guards on the result, both cheap and both necessary:

- **A digit is left in the output.** The model skipped the number rules. Throw
  the rewrite away and speak the original.
- **The output is longer than 3x the input plus 80.** It padded. Same action.

Do not add a "did it drop a fact" check by word overlap or by a length floor.
Both were tried and both rejected good rewrites, which sent the stiff original
to the voice: exactly what they were meant to prevent.

### The pronunciation rules, and why each exists

Every one of these was added because a real reply was said wrong out loud.

**Keep a diacritic that is already there.** An upstream model writes `أكمّل`.
Without this rule the rewriter returns `أكمل` and the voice says the wrong word.

**Add one only where the bare word reads as a DIFFERENT word.** This is about
ambiguity, not style. Zero marks in a reply is normal. A mark on every letter
makes the voice read like a formal reciter, which is wrong for a phone call.

**Mark a doubled letter.** The one you will hit most. Arabic writes a doubled
letter once, so without the shadda the voice says a shorter word: `تدخر` is
read `تَدْخَر`, and it needs to be `تدّخر`.

Two things to get right here, both learned the hard way:

- Say **word**, not **verb**. An early version said "verb" and the noun kept
  slipping: `تدّخر` got its mark and `ادخار` did not, same root.
- Say a prefix changes nothing. `ال`, `و`, `ب`, `ل` stuck on the front do not
  change how the rest is said, so `الادخار` is `الادّخار`.

**Never add a case ending or tanween.** Najdi does not inflect and it makes the
voice sound like a news reader.

**Respell where the letters mislead the engine.** A name ending in `ة` gets a
`t` sound added. A Najdi speaker stops on `ه`, so write `ساره`, not `سارة`.
State plainly that this changes the **spelling only**, or it fights the rule
that says never change a name.

**Say each fact once.** A reply and the data card under it state the same number
twice. Scope it to duplicates: two different amounts are not a repeat and both
must survive.

### Tashkeel: measured, and not worth generating

Generating diacritics was tried twice and reverted both times. Do not repeat it.

- A classical pass added MSA case endings. `أحد` became `أحدًا` and
  `خمسة وأربعين` became `خمسة وأربعون`, which sounds like a news reader.
- A Najdi-preserving pass avoided that but silently edited letters. `انسددت`
  came back as `انسدّت`, a letter short.

Keeping a mark that arrives, and adding one only for a genuinely ambiguous word,
is the part that works. Generating them wholesale is not.

### Tell the model who is speaking

The prompt used to say "a Saudi woman" always, so a male voice was handed
`آسفة`. Pass the voice's sex in and swap the persona line. Two separate things,
and do not let the model mix them:

- The **speaker** is whichever voice the user picked.
- The **customer** is male unless the text clearly says otherwise.

### 3. Finalise

Strip markdown, or `**رصيدك**` is spoken with the stars. Strip **every**
bracketed word. An upstream model writes tags this app never declared and they
reach the screen and the voice.

### 4. Settings the web app landed on

**OmniVoice** (the app calls it Variant 1):

```json
{
  "language": "Najdi Arabic",
  "speed": 1.0,
  "num_step": 48,
  "guidance_scale": 2.0,
  "class_temperature": 0.0,
  "denoise": true,
  "preprocess_prompt": true,
  "postprocess_output": true,
  "normalize_text": false,
  "pad_duration": 0.1,
  "fade_duration": 0.1,
  "instruct": "female, young adult, high pitch",
  "audio_format": "mp3"
}
```

**VoxCPM** (Variant 2):

```json
{
  "cfg_value": 2.0,
  "inference_timesteps": 16,
  "normalize": false,
  "retry_badcase": true,
  "seed": 20261218,
  "instruct": "A Saudi woman speaking the Najdi dialect. A warm, friendly, calm tone.",
  "audio_format": "mp3"
}
```

`normalize` and `normalize_text` are **off on purpose**. The rewrite model
already spelled every number, so no digit reaches the engine and the built-in
normaliser can only damage text it should not touch.

Do not raise `guidance_scale` to chase word accuracy. Measured at 2.0 / 2.5 /
3.0 / 3.5, fidelity was 100, 98, 80 and 95 percent, with no trend. There is no
accuracy to buy and you lose naturalness.

Do not set `class_temperature` to 0 to stop the voice drifting. It makes the
same sentence byte-identical and makes **different** sentences worse: 110 Hz
apart against 64 Hz at the default. A conversation is made of different
sentences.

### 5. Loudness

Run every clip through ffmpeg `loudnorm` to -18 LUFS. Voices differ by more than
10 dB between reference clips, and without this one voice is half the volume of
the next. Fail open: if ffmpeg is missing, ship the audio as it is.

### Which engine for a live chat

**OmniVoice.** It is not close:

| | OmniVoice | VoxCPM |
|---|---|---|
| Reply, same text | about 5 s | about 19 s |
| Saved voice prompt (`.pt`) | yes, skips the clip encode | no, re-reads every call |
| Non-verbal tags | 13 available | none |
| Streams in chunks | yes | no, see below |
| `instruct` | fixed word list | free text |
| Sample rate | 24 kHz | 48 kHz |

VoxCPM earns its place for building and auditioning voices, where free-text
`instruct` and 48 kHz matter and nobody is waiting. Not for a live reply.

### Chunked streaming

Splitting a reply into sentences and generating them in parallel roughly halves
the time before the voice starts. Three rules, all of which cost the web app a
bug first:

**Split on sentence ends only.** Never mid-sentence. The engine needs a whole
sentence to get the prosody right.

**Balance the chunks, do not fill them in turn.** Filling each chunk up to a
character limit split one reply 167 / 20, and the 20-character tail came out as
1.9 seconds of audio that was a quarter silence. Against a flowing 7 second
chunk that sounds like the voice changed, even though the two measured under
5 Hz apart in pitch.

Decide the chunk **count** first, then give each sentence to the chunk its
middle falls in:

```
wanted   = clamp(round(totalChars / 100), 1, 3)
perChunk = totalChars / wanted
index    = min(wanted - 1, floor(sentenceMidpoint / perChunk))
```

Then fold any trailing chunk under 60 characters back into the one before it.
Do not split a reply under 150 characters at all.

**Never stream VoxCPM.** It re-reads the reference clip on every chunk. A
three-chunk reply took 18.6 s against 4.8 s on OmniVoice, and chunk 1 landed
9.7 seconds after chunk 0 finished playing. That hole is worse than waiting.

### Client playback

Play strictly in index order, because the chunks arrive out of order.

**Handle the error event.** The web app ignored it, so when the server gave up
on chunk 1 the player waited on an index that never arrived and the rest of the
reply was never spoken. It looked like the engine had dropped words. Record the
failed index and step over it.

Also treat a decode error and a rejected `play()` as "skip this chunk", or one
bad blob silences everything after it.

### Two more things that will bite you

**Cache the rewrite, not just the audio.** The lab showed a preview and then
generated the audio in two separate model calls. The model does not return the
same wording twice, so the screen said one thing and the voice said another.
Share one result. Key it on the text **and** the speaker sex **and** the engine,
since all three change the wording.

**A cache will lie to you while you tune a prompt.** Change a word in your test
input or you will be reading yesterday's answer.

---

## 17. Full request, every field set

Copy this and delete what you do not need. These are the defaults, so sending
this is the same as sending only `text`.

### voxcpm2

```json
{
  "input": {
    "text": "الكلام المطلوب",
    "ref_audio_url": null,
    "ref_audio_b64": null,
    "ref_text": null,
    "ref_trim_seconds": null,
    "instruct": null,
    "clone_mode": "reference",
    "cfg_value": 2.0,
    "inference_timesteps": 10,
    "normalize": true,
    "denoise": false,
    "min_len": 2,
    "max_len": 4096,
    "retry_badcase": true,
    "retry_badcase_max_times": 3,
    "retry_badcase_ratio_threshold": 6.0,
    "seed": null,
    "audio_format": "wav"
  }
}
```

### omnivoice

```json
{
  "input": {
    "text": "الكلام المطلوب",
    "language": null,
    "ref_audio_url": null,
    "ref_audio_b64": null,
    "ref_text": null,
    "ref_trim_seconds": null,
    "voice_clone_prompt_url": null,
    "instruct": null,
    "speed": null,
    "duration": null,
    "normalize_text": false,
    "num_step": 32,
    "guidance_scale": 2.0,
    "denoise": true,
    "preprocess_prompt": true,
    "postprocess_output": true,
    "t_shift": 0.1,
    "layer_penalty_factor": 5.0,
    "position_temperature": 5.0,
    "class_temperature": 0.0,
    "audio_chunk_duration": 15.0,
    "audio_chunk_threshold": 30.0,
    "pad_duration": 0.1,
    "fade_duration": 0.1,
    "audio_format": "wav"
  }
}
```

Sending `null` is the same as leaving the field out.
