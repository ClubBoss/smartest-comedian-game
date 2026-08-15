# Recorded buzzer cue sources

The built-in buzzer player prefers short recorded cues for the effects below and falls back to the existing procedural WebAudio cue if a recording cannot be fetched or decoded. These recordings are loaded from Wikimedia Commons and cached by the browser; audio availability never controls buzzer authority or scoring.

| Built-in key | Recording | License | Source |
| --- | --- | --- | --- |
| `airhorn` | Prime PM-990 diesel locomotive air horn | CC0 1.0 | https://commons.wikimedia.org/wiki/File:Prime_PM-990.ogg |
| `bell` | Boxing bell (`Dingdingding.wav`) | CC0 1.0 | https://commons.wikimedia.org/wiki/File:Dingdingding.wav |
| `gong` | Gong or bell vibrant (short) | CC0 1.0 | https://commons.wikimedia.org/wiki/File:Gong_or_bell_vibrant_(short).ogg |
| `siren` | Toy Siren Alarm | Public domain | https://commons.wikimedia.org/wiki/File:Toy_siren_alarm.ogg |
| `bike` | Rotating bicycle bell | CC0 1.0 | https://commons.wikimedia.org/wiki/File:Rotating-bicycle-bell.wav |
| `goat` | Herd of goats bleating | Public domain | https://commons.wikimedia.org/wiki/File:Herd_of_goats_bleating.ogg |
| `rooster` | Small rooster crowing | Public domain | https://commons.wikimedia.org/wiki/File:Small_rooster_crowing.ogg |

Only bounded excerpts are played (roughly 1.3–2.2 seconds depending on the cue). No recording is used for game-state authority. If the remote media host is unavailable, the matching in-browser synthesized cue remains the fallback.
