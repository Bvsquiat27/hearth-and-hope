package com.hearthandhope.app;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.GeolocationPermissions;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

/**
 * Loads the Hearth &amp; Hope shell from assets. Official NSOPW (nsopw.gov)
 * pages stay inside this WebView so moms see the live government map without
 * leaving the app. No scraping; no undocumented API calls — browser UI only.
 */
public class MainActivity extends AppCompatActivity {
    private WebView webView;

    private static boolean isNsopwHost(String host) {
        if (host == null) return false;
        String h = host.toLowerCase();
        return h.equals("nsopw.gov")
                || h.equals("www.nsopw.gov")
                || h.endsWith(".nsopw.gov")
                || h.equals("ojp.gov")
                || h.equals("www.ojp.gov")
                || h.endsWith(".ojp.gov");
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setGeolocationEnabled(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE);

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme() != null ? uri.getScheme() : "";
                String url = uri.toString();
                String host = uri.getHost();

                // Keep local asset / file navigation inside the WebView
                if ("file".equals(scheme) || url.startsWith("file:///android_asset/")) {
                    return false;
                }

                // Official NSOPW (and OJP sibling hosts if redirected) stay in-app
                if (("http".equals(scheme) || "https".equals(scheme)) && isNsopwHost(host)) {
                    return false;
                }

                // tel / sms / mailto / geo / other https -> system handlers
                if ("tel".equals(scheme) || "sms".equals(scheme) || "mailto".equals(scheme)
                        || "http".equals(scheme) || "https".equals(scheme)
                        || "geo".equals(scheme)) {
                    try {
                        startActivity(new Intent(Intent.ACTION_VIEW, uri));
                    } catch (Exception ignored) {
                    }
                    return true;
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }
        });

        webView.loadUrl("file:///android_asset/index.html");
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
            webView = null;
        }
        super.onDestroy();
    }
}
