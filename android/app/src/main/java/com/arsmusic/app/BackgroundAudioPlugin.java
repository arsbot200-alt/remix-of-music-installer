package com.arsmusic.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.lang.ref.WeakReference;

@CapacitorPlugin(name = "BackgroundAudio")
public class BackgroundAudioPlugin extends Plugin {
  private static WeakReference<BackgroundAudioPlugin> instance = new WeakReference<>(null);

  @Override
  public void load() {
    instance = new WeakReference<>(this);
  }

  @Override
  protected void handleOnDestroy() {
    BackgroundAudioPlugin current = instance.get();
    if (current == this) instance = new WeakReference<>(null);
  }

  @PluginMethod
  public void play(PluginCall call) {
    Intent intent = serviceIntent(BackgroundAudioService.ACTION_PLAY)
      .putExtra("trackId", call.getString("trackId", ""))
      .putExtra("title", call.getString("title", "Unknown track"))
      .putExtra("artist", call.getString("artist", "Unknown artist"))
      .putExtra("artwork", call.getString("artwork", null))
      .putExtra("url", call.getString("url", ""))
      .putExtra("queue", call.getString("queue", "[]"))
      .putExtra("queueIndex", call.getInt("queueIndex", 0))
      .putExtra("volume", call.getDouble("volume", 1.0));
    startService(intent);
    call.resolve();
  }

  @PluginMethod
  public void updateQueue(PluginCall call) {
    Intent intent = serviceIntent(BackgroundAudioService.ACTION_UPDATE_QUEUE)
      .putExtra("queue", call.getString("queue", "[]"))
      .putExtra("queueIndex", call.getInt("queueIndex", 0));
    startService(intent);
    call.resolve();
  }

  @PluginMethod
  public void pause(PluginCall call) {
    startService(serviceIntent(BackgroundAudioService.ACTION_PAUSE));
    call.resolve();
  }

  @PluginMethod
  public void resume(PluginCall call) {
    startService(serviceIntent(BackgroundAudioService.ACTION_RESUME));
    call.resolve();
  }

  @PluginMethod
  public void stop(PluginCall call) {
    startService(serviceIntent(BackgroundAudioService.ACTION_STOP));
    call.resolve();
  }

  @PluginMethod
  public void seek(PluginCall call) {
    startService(serviceIntent(BackgroundAudioService.ACTION_SEEK).putExtra("position", call.getDouble("position", 0.0)));
    call.resolve();
  }

  @PluginMethod
  public void setVolume(PluginCall call) {
    startService(serviceIntent(BackgroundAudioService.ACTION_VOLUME).putExtra("volume", call.getDouble("volume", 1.0)));
    call.resolve();
  }

  @PluginMethod
  public void getState(PluginCall call) {
    call.resolve(BackgroundAudioService.currentState());
  }

  static void emit(String eventName, JSObject payload) {
    BackgroundAudioPlugin plugin = instance.get();
    if (plugin == null || plugin.bridge == null) return;
    plugin.bridge.executeOnMainThread(() -> plugin.notifyListeners(eventName, payload, false));
  }

  private Intent serviceIntent(String action) {
    return new Intent(getContext(), BackgroundAudioService.class).setAction(action);
  }

  private void startService(Intent intent) {
    Context context = getContext();
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && BackgroundAudioService.ACTION_PLAY.equals(intent.getAction())) {
      context.startForegroundService(intent);
    } else {
      context.startService(intent);
    }
  }
}