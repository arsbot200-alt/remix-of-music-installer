package com.arsmusic.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(BackgroundAudioPlugin.class);
    super.onCreate(savedInstanceState);
    // Allow <audio> to start without a fresh user gesture and keep
    // playing while the app is backgrounded. Without this, Android
    // WebView pauses HTML5 media as soon as the activity loses focus,
    // which is what kills music when you switch apps or lock the screen.
    if (this.bridge != null && this.bridge.getWebView() != null) {
      WebSettings settings = this.bridge.getWebView().getSettings();
      settings.setMediaPlaybackRequiresUserGesture(false);
      settings.setDomStorageEnabled(true);
      settings.setJavaScriptEnabled(true);
    }
  }

  @Override
  public void onPause() {
    // Native playback is now handled by BackgroundAudioService, so the WebView
    // can pause normally without killing music in the Android notification.
    super.onPause();
  }
}
