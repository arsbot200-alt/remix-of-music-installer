import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

export type NativeAudioTrack = {
  id: string;
  title: string;
  artist: string;
  thumbnail: string | null;
  url: string;
};

export type NativeAudioState = {
  trackId?: string;
  title?: string;
  artist?: string;
  artwork?: string | null;
  isPlaying?: boolean;
  loading?: boolean;
  position?: number;
  duration?: number;
  queueIndex?: number;
  queueSize?: number;
  error?: string | null;
};

type BackgroundAudioPlugin = {
  play(options: {
    trackId: string;
    title: string;
    artist: string;
    artwork?: string | null;
    url: string;
    queue: string;
    queueIndex: number;
    volume: number;
  }): Promise<void>;
  updateQueue(options: { queue: string; queueIndex: number }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  stop(): Promise<void>;
  seek(options: { position: number }): Promise<void>;
  setVolume(options: { volume: number }): Promise<void>;
  getState(): Promise<NativeAudioState>;
  addListener(
    eventName: "playbackState" | "playbackEnded" | "playbackError",
    listenerFunc: (state: NativeAudioState) => void,
  ): Promise<PluginListenerHandle>;
};

const backgroundAudio = registerPlugin<BackgroundAudioPlugin>("BackgroundAudio");

export function isNativeAndroidAudio() {
  return (
    typeof window !== "undefined" &&
    Capacitor.isNativePlatform() &&
    Capacitor.getPlatform() === "android"
  );
}

export function nativeAudioPlay(options: {
  track: Omit<NativeAudioTrack, "url">;
  url: string;
  queue: NativeAudioTrack[];
  queueIndex: number;
  volume: number;
}) {
  return backgroundAudio.play({
    trackId: options.track.id,
    title: options.track.title,
    artist: options.track.artist,
    artwork: options.track.thumbnail,
    url: options.url,
    queue: JSON.stringify(options.queue),
    queueIndex: options.queueIndex,
    volume: options.volume,
  });
}

export function nativeAudioUpdateQueue(queue: NativeAudioTrack[], queueIndex: number) {
  return backgroundAudio.updateQueue({ queue: JSON.stringify(queue), queueIndex });
}

export const nativeAudioPause = () => backgroundAudio.pause();
export const nativeAudioResume = () => backgroundAudio.resume();
export const nativeAudioStop = () => backgroundAudio.stop();
export const nativeAudioSeek = (position: number) => backgroundAudio.seek({ position });
export const nativeAudioSetVolume = (volume: number) => backgroundAudio.setVolume({ volume });
export const getNativeAudioState = () => backgroundAudio.getState();

export function addNativeAudioListener(
  eventName: "playbackState" | "playbackEnded" | "playbackError",
  listener: (state: NativeAudioState) => void,
) {
  return backgroundAudio.addListener(eventName, listener);
}
