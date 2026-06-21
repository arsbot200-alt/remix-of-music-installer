package com.arsmusic.app;

import android.os.Bundle;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
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
    // Skip WebView.onPause() — that call is what suspends background audio.
    // We deliberately keep the WebView running so MediaSession + <audio>
    // continue when the user backgrounds the app or locks the screen.
    // (BridgeActivity → AppCompatActivity → FragmentActivity, all safe.)
    super.onPause();
  }
}
