import { describe, expect, it } from "vitest";
import { resolveSoundUploadFormat } from "./sound-upload";

describe("resolveSoundUploadFormat", () => {
  it.each([
    ["voice.m4a", "audio/mp4"],
    ["voice.m4a", "audio/m4a"],
    ["voice.m4a", "audio/x-m4a"],
    ["voice.m4a", "application/mp4"],
    ["voice.m4a", ""],
    ["voice.m4a", "application/octet-stream"],
  ])("accepts iPhone Voice Memos variants: %s / %s", (name, type) => {
    expect(resolveSoundUploadFormat(name, type)).toEqual({
      extension: "m4a",
      contentType: "audio/mp4",
    });
  });

  it("normalizes the existing supported formats", () => {
    expect(resolveSoundUploadFormat("sound.mp3", "audio/mpeg")?.extension).toBe("mp3");
    expect(resolveSoundUploadFormat("sound.wav", "audio/x-wav")?.extension).toBe("wav");
    expect(resolveSoundUploadFormat("sound.ogg", "application/ogg")?.extension).toBe("ogg");
  });

  it("does not turn arbitrary MPEG-4/video files into buzzer audio", () => {
    expect(resolveSoundUploadFormat("clip.mp4", "application/mp4")).toBeNull();
    expect(resolveSoundUploadFormat("clip.mp4", "video/mp4")).toBeNull();
    expect(resolveSoundUploadFormat("photo.jpg", "application/octet-stream")).toBeNull();
  });
});
