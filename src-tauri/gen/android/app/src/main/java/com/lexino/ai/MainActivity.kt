package com.lexino.ai

import android.graphics.Color
import android.os.Build
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Hide default action bar
        supportActionBar?.hide()

        // 1. Enable Premium Full Screen Edge-to-Edge Layout
        WindowCompat.setDecorFitsSystemWindows(window, false)
        
        // 2. Style Status & Navigation Bars (Matching Lexino AI dark theme)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            window.apply {
                clearFlags(WindowManager.LayoutParams.FLAG_TRANSLUCENT_STATUS)
                addFlags(WindowManager.LayoutParams.FLAG_DRAWS_SYSTEM_BAR_BACKGROUNDS)
                statusBarColor = Color.parseColor("#09090b") // Matching website background
                navigationBarColor = Color.parseColor("#09090b")
            }
        }

        // 3. Initialize WebView
        webView = WebView(this).apply {
            // Force hardware (GPU) acceleration for 90Hz/120Hz smooth scrolling
            setLayerType(View.LAYER_TYPE_HARDWARE, null)
            
            // Set dark background to avoid white flashes
            setBackgroundColor(Color.parseColor("#09090b"))
            
            // Initially hide webview to allow smooth fade-in
            alpha = 0f
        }

        // 4. Configure Ultra High Performance Settings
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            useWideViewPort = true
            loadWithOverviewMode = true
            databaseEnabled = true
            javaScriptCanOpenWindowsAutomatically = true
            mediaPlaybackRequiresUserGesture = false
            
            // Enable caching for instant subsequent loads
            cacheMode = WebSettings.LOAD_DEFAULT
            

            
            // Performance optimizations
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            }
        }

        // 5. Smooth Page Loader Transitions
        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, url: String): Boolean {
                view.loadUrl(url)
                return true
            }

            override fun onPageFinished(view: WebView, url: String) {
                super.onPageFinished(view, url)
                // Smooth fade-in animation
                view.animate().alpha(1f).setDuration(400).start()
            }
        }

        // 6. Set Content View
        val layout = FrameLayout(this).apply {
            setBackgroundColor(Color.parseColor("#09090b"))
            addView(webView, FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            ))
        }
        setContentView(layout)

        // Load Lexino AI Chat
        webView.loadUrl("https://lexinoai.in/chat")
    }

    override fun onBackPressed() {
        // Support native hardware back button navigation
        if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }
}
