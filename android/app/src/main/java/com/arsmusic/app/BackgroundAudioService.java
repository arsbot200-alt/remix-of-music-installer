package com.arsmusic.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.media.AudioAttributes;
import android.media.MediaMetadata;
import android.media.MediaPlayer;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import com.getcapacitor.JSObject;
import java.io.IOException;
import java.util.ArrayList;
import org.json.JSONArray;
import org.json.JSONObject;

public class BackgroundAudioService extends Service {
  public static final String ACTION_PLAY = "com.arsmusic.app.audio.PLAY";
  public static final String ACTION_UPDATE_QUEUE = "com.arsmusic.app.audio.UPDATE_QUEUE";
  public static final String ACTION_PAUSE = "com.arsmusic.app.audio.PAUSE";
  public static final String ACTION_RESUME = "com.arsmusic.app.audio.RESUME";
  public static final String ACTION_STOP = "com.arsmusic.app.audio.STOP";
  public static final String ACTION_SEEK = "com.arsmusic.app.audio.SEEK";
  public static final String ACTION_VOLUME = "com.arsmusic.app.audio.VOLUME";
  public static final String ACTION_NEXT = "com.arsmusic.app.audio.NEXT";
  public static final String ACTION_PREV = "com.arsmusic.app.audio.PREV";

  private static final String CHANNEL_ID = "arsmusic_playback";
  private static final int NOTIFICATION_ID = 401;
  private static final Handler MAIN = new Handler(Looper.getMainLooper());
  private static AudioState state = new AudioState();

  private final ArrayList<NativeTrack> queue = new ArrayList<>();
  private MediaPlayer player;
  private MediaSession mediaSession;
  private int queueIndex = 0;
  private int retryCount = 0;
  private double volume = 1.0;
  private final Runnable tick = new Runnable() {
    @Override
    public void run() {
      publishState(false);
      MAIN.postDelayed(this, 1000);
    }
  };

  @Override
  public void onCreate() {
    super.onCreate();
    createChannel();
    setupMediaSession();
  }

  @Override
  public int onStartCommand(Intent intent, int flags, int startId) {
    if (intent == null || intent.getAction() == null) return START_STICKY;
    switch (intent.getAction()) {
      case ACTION_PLAY:
        handlePlay(intent);
        break;
      case ACTION_UPDATE_QUEUE:
        updateQueue(intent.getStringExtra("queue"), intent.getIntExtra("queueIndex", queueIndex));
        break;
      case ACTION_PAUSE:
        pause();
        break;
      case ACTION_RESUME:
        resume();
        break;
      case ACTION_SEEK:
        seek(intent.getDoubleExtra("position", 0.0));
        break;
      case ACTION_VOLUME:
        setVolume(intent.getDoubleExtra("volume", 1.0));
        break;
      case ACTION_NEXT:
        next();
        break;
      case ACTION_PREV:
        previous();
        break;
      case ACTION_STOP:
        stopPlayback();
        break;
      default:
        break;
    }
    return START_STICKY;
  }

  @Override
  public IBinder onBind(Intent intent) {
    return null;
  }

  @Override
  public void onDestroy() {
    MAIN.removeCallbacks(tick);
    releasePlayer();
    if (mediaSession != null) mediaSession.release();
    super.onDestroy();
  }

  static JSObject currentState() {
    return state.toJson();
  }

  private void handlePlay(Intent intent) {
    volume = intent.getDoubleExtra("volume", volume);
    updateQueue(intent.getStringExtra("queue"), intent.getIntExtra("queueIndex", 0));
    if (queue.isEmpty()) {
      queue.add(new NativeTrack(
        intent.getStringExtra("trackId"),
        intent.getStringExtra("title"),
        intent.getStringExtra("artist"),
        intent.getStringExtra("artwork"),
        intent.getStringExtra("url")
      ));
      queueIndex = 0;
    }
    playCurrent(false);
  }

  private void updateQueue(String rawQueue, int index) {
    if (rawQueue == null || rawQueue.length() == 0) return;
    try {
      JSONArray arr = new JSONArray(rawQueue);
      queue.clear();
      for (int i = 0; i < arr.length(); i++) {
        JSONObject item = arr.getJSONObject(i);
        queue.add(new NativeTrack(
          item.optString("id"),
          item.optString("title", "Unknown track"),
          item.optString("artist", "Unknown artist"),
          item.optString("thumbnail", null),
          item.optString("url")
        ));
      }
      queueIndex = Math.max(0, Math.min(index, Math.max(0, queue.size() - 1)));
      state.queueIndex = queueIndex;
      state.queueSize = queue.size();
    } catch (Exception ignored) {
    }
  }

  private void playCurrent(boolean retrying) {
    if (queue.isEmpty() || queueIndex < 0 || queueIndex >= queue.size()) return;
    NativeTrack track = queue.get(queueIndex);
    if (track.url == null || track.url.length() == 0) {
      fail("Missing audio stream");
      return;
    }

    releasePlayer();
    state.fromTrack(track, queueIndex, queue.size());
    state.loading = true;
    state.isPlaying = false;
    state.error = null;
    publishState(true);
    startForeground(NOTIFICATION_ID, notification(true));

    player = new MediaPlayer();
    player.setWakeMode(getApplicationContext(), PowerManager.PARTIAL_WAKE_LOCK);
    player.setAudioAttributes(new AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_MEDIA)
      .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
      .build());
    player.setOnPreparedListener(mp -> {
      retryCount = 0;
      mp.setVolume((float) volume, (float) volume);
      mp.start();
      state.loading = false;
      state.isPlaying = true;
      state.duration = seconds(mp.getDuration());
      publishState(true);
      updateNotification();
      MAIN.removeCallbacks(tick);
      MAIN.post(tick);
    });
    player.setOnCompletionListener(mp -> next());
    player.setOnErrorListener((mp, what, extra) -> {
      if (!retrying && retryCount < 2) {
        retryCount += 1;
        MAIN.postDelayed(() -> playCurrent(true), 550);
      } else {
        fail("Couldn't play this song");
      }
      return true;
    });

    try {
      player.setDataSource(track.url);
      player.prepareAsync();
    } catch (IOException | IllegalArgumentException | SecurityException e) {
      if (!retrying && retryCount < 2) {
        retryCount += 1;
        MAIN.postDelayed(() -> playCurrent(true), 550);
      } else {
        fail(e.getMessage() == null ? "Playback failed" : e.getMessage());
      }
    }
  }

  private void pause() {
    if (player != null && player.isPlaying()) player.pause();
    state.isPlaying = false;
    state.loading = false;
    publishState(true);
    updateNotification();
  }

  private void resume() {
    if (player != null) {
      player.start();
      state.isPlaying = true;
      publishState(true);
      updateNotification();
      MAIN.removeCallbacks(tick);
      MAIN.post(tick);
    } else if (!queue.isEmpty()) {
      playCurrent(false);
    }
  }

  private void next() {
    if (queueIndex < queue.size() - 1) {
      queueIndex += 1;
      retryCount = 0;
      playCurrent(false);
    } else {
      pause();
    }
  }

  private void previous() {
    if (player != null && player.getCurrentPosition() > 3000) {
      player.seekTo(0);
      publishState(true);
      return;
    }
    if (queueIndex > 0) {
      queueIndex -= 1;
      retryCount = 0;
      playCurrent(false);
    }
  }

  private void seek(double position) {
    if (player == null) return;
    player.seekTo((int) Math.max(0, position * 1000));
    state.position = position;
    publishState(true);
  }

  private void setVolume(double nextVolume) {
    volume = Math.max(0.0, Math.min(1.0, nextVolume));
    if (player != null) player.setVolume((float) volume, (float) volume);
  }

  private void stopPlayback() {
    MAIN.removeCallbacks(tick);
    releasePlayer();
    state.isPlaying = false;
    state.loading = false;
    state.position = 0;
    publishState(true);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) stopForeground(STOP_FOREGROUND_REMOVE);
    else stopForeground(true);
    stopSelf();
  }

  private void fail(String message) {
    state.loading = false;
    state.isPlaying = false;
    state.error = message;
    publishState(true);
    BackgroundAudioPlugin.emit("playbackError", state.toJson());
    updateNotification();
  }

  private void releasePlayer() {
    if (player == null) return;
    try {
      player.reset();
      player.release();
    } catch (Exception ignored) {
    }
    player = null;
  }

  private void publishState(boolean retain) {
    if (player != null) {
      state.position = seconds(player.getCurrentPosition());
      state.duration = seconds(player.getDuration());
    }
    updateMediaSession();
    BackgroundAudioPlugin.emit("playbackState", state.toJson());
  }

  private void setupMediaSession() {
    mediaSession = new MediaSession(this, "ArsMusic");
    mediaSession.setCallback(new MediaSession.Callback() {
      @Override public void onPlay() { resume(); }
      @Override public void onPause() { pause(); }
      @Override public void onSkipToNext() { next(); }
      @Override public void onSkipToPrevious() { previous(); }
      @Override public void onSeekTo(long pos) { seek(pos / 1000.0); }
      @Override public void onStop() { stopPlayback(); }
    });
    mediaSession.setActive(true);
  }

  private void updateMediaSession() {
    if (mediaSession == null) return;
    long actions = PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE | PlaybackState.ACTION_PLAY_PAUSE |
      PlaybackState.ACTION_SKIP_TO_NEXT | PlaybackState.ACTION_SKIP_TO_PREVIOUS | PlaybackState.ACTION_SEEK_TO | PlaybackState.ACTION_STOP;
    int playbackState = state.loading ? PlaybackState.STATE_BUFFERING : state.isPlaying ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED;
    mediaSession.setPlaybackState(new PlaybackState.Builder()
      .setActions(actions)
      .setState(playbackState, Math.max(0, (long) (state.position * 1000)), 1f)
      .build());
    mediaSession.setMetadata(new MediaMetadata.Builder()
      .putString(MediaMetadata.METADATA_KEY_TITLE, state.title)
      .putString(MediaMetadata.METADATA_KEY_ARTIST, state.artist)
      .putLong(MediaMetadata.METADATA_KEY_DURATION, Math.max(0, (long) (state.duration * 1000)))
      .build());
  }

  private void updateNotification() {
    NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    manager.notify(NOTIFICATION_ID, notification(state.loading));
  }

  private Notification notification(boolean loading) {
    Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
    PendingIntent contentIntent = PendingIntent.getActivity(this, 0, launchIntent, pendingFlags());
    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
      ? new Notification.Builder(this, CHANNEL_ID)
      : new Notification.Builder(this);
    builder
      .setSmallIcon(android.R.drawable.ic_media_play)
      .setContentTitle(state.title == null ? "ArsMusic" : state.title)
      .setContentText(state.artist == null ? "Playing" : state.artist)
      .setContentIntent(contentIntent)
      .setOngoing(state.isPlaying || loading)
      .setOnlyAlertOnce(true)
      .setShowWhen(false)
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .addAction(android.R.drawable.ic_media_previous, "Previous", action(ACTION_PREV))
      .addAction(state.isPlaying ? android.R.drawable.ic_media_pause : android.R.drawable.ic_media_play, state.isPlaying ? "Pause" : "Play", action(state.isPlaying ? ACTION_PAUSE : ACTION_RESUME))
      .addAction(android.R.drawable.ic_media_next, "Next", action(ACTION_NEXT));
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && mediaSession != null) {
      builder.setStyle(new Notification.MediaStyle()
        .setMediaSession(mediaSession.getSessionToken())
        .setShowActionsInCompactView(0, 1, 2));
      builder.setCategory(Notification.CATEGORY_TRANSPORT);
    }
    return builder.build();
  }

  private PendingIntent action(String action) {
    Intent intent = new Intent(this, BackgroundAudioService.class).setAction(action);
    return PendingIntent.getService(this, action.hashCode(), intent, pendingFlags());
  }

  private int pendingFlags() {
    return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M
      ? PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
      : PendingIntent.FLAG_UPDATE_CURRENT;
  }

  private void createChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
    NotificationChannel channel = new NotificationChannel(CHANNEL_ID, "Music playback", NotificationManager.IMPORTANCE_LOW);
    channel.setDescription("Background music controls");
    NotificationManager manager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    manager.createNotificationChannel(channel);
  }

  private double seconds(int ms) {
    return ms <= 0 ? 0 : ms / 1000.0;
  }

  private static class NativeTrack {
    final String id;
    final String title;
    final String artist;
    final String artwork;
    final String url;

    NativeTrack(String id, String title, String artist, String artwork, String url) {
      this.id = id == null ? "" : id;
      this.title = title == null || title.length() == 0 ? "Unknown track" : title;
      this.artist = artist == null || artist.length() == 0 ? "Unknown artist" : artist;
      this.artwork = artwork;
      this.url = url == null ? "" : url;
    }
  }

  private static class AudioState {
    String trackId = "";
    String title = "ArsMusic";
    String artist = "";
    String artwork = null;
    boolean isPlaying = false;
    boolean loading = false;
    double position = 0;
    double duration = 0;
    int queueIndex = 0;
    int queueSize = 0;
    String error = null;

    void fromTrack(NativeTrack track, int index, int size) {
      trackId = track.id;
      title = track.title;
      artist = track.artist;
      artwork = track.artwork;
      position = 0;
      duration = 0;
      queueIndex = index;
      queueSize = size;
    }

    JSObject toJson() {
      JSObject json = new JSObject();
      json.put("trackId", trackId);
      json.put("title", title);
      json.put("artist", artist);
      json.put("artwork", artwork);
      json.put("isPlaying", isPlaying);
      json.put("loading", loading);
      json.put("position", position);
      json.put("duration", duration);
      json.put("queueIndex", queueIndex);
      json.put("queueSize", queueSize);
      json.put("error", error);
      return json;
    }
  }
}