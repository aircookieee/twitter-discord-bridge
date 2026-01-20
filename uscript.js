// ==UserScript==
// @name         Twitter/X to Discord - V5.5 (Restored Post View Padding)
// @namespace    http://tampermonkey.net/
// @version      5.5
// @description  Adds a toolbar. Tighter spacing in timeline; Restored spacing in Post View. Unlimited channels.
// @author       You
// @match        https://twitter.com/*
// @match        https://x.com/*
// @updateURL    https://raw.githubusercontent.com/aircookieee/twitter-discord-bridge/refs/heads/main/uscript.js
// @downloadURL  https://raw.githubusercontent.com/aircookieee/twitter-discord-bridge/refs/heads/main/uscript.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // --- STYLES ---
    GM_addStyle(`
        /* Toolbar Styles */
        .dt-discord-toolbar {
            display: flex;
            flex-wrap: nowrap;
            gap: 8px;
            padding: 8px 0; /* Base padding */
            align-items: center;
            justify-content: center;
            overflow-x: auto;
            scrollbar-width: none;
        }
        .dt-discord-toolbar::-webkit-scrollbar { display: none; }

        /* Timeline Spacing Class (Applied only in Timeline/Feed) */
        .dt-spacing-timeline {
            margin-top: 6px; /* Compact spacing for timeline */
        }

        /* Post View Class (Applied to the Main Tweet) */
        .dt-spacing-post {
            margin-top: 12px;     /* Restored spacing ABOVE buttons in post view */
            padding-bottom: 12px; /* Spacing BELOW buttons in post view */
        }

        .dt-btn {
            background-color: transparent;
            border: 1px solid #536471;
            color: #71767b;
            border-radius: 999px;
            padding: 4px 4px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            flex: 1 1 0px;
            width: 0;
            min-width: 0;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            text-align: center;
        }
        .dt-btn:hover { background-color: rgba(239, 243, 244, 0.1); color: #eff3f4; border-color: #eff3f4; }

        .dt-btn-send { border-color: #5865F2; color: #5865F2; }
        .dt-btn-send:hover { background-color: #5865F2; color: white; }

        .dt-toggle-on { color: #00ba7c; border-color: #00ba7c; }
        .dt-toggle-on:hover { background-color: rgba(0, 186, 124, 0.1); }

        .dt-toggle-off { color: #f91880; border-color: #f91880; }
        .dt-toggle-off:hover { background-color: rgba(249, 24, 128, 0.1); }

        /* Settings Modal Styles */
        .dt-modal-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.6); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
        }
        .dt-modal {
            background: #000; border: 1px solid #2f3336; border-radius: 16px;
            width: 500px; max-width: 90%; max-height: 90vh;
            display: flex; flex-direction: column;
            font-family: TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #e7e9ea; box-shadow: 0 0 15px rgba(255,255,255,0.1);
        }
        .dt-modal-header {
            padding: 16px; border-bottom: 1px solid #2f3336;
            font-size: 20px; font-weight: bold;
            display: flex; justify-content: space-between; align-items: center;
        }
        .dt-modal-body { padding: 16px; overflow-y: auto; }
        .dt-modal-footer {
            padding: 16px; border-top: 1px solid #2f3336;
            display: flex; justify-content: flex-end; gap: 10px;
        }
        .dt-form-group { margin-bottom: 15px; }
        .dt-label { display: block; margin-bottom: 5px; font-weight: bold; color: #71767b; font-size: 13px; }
        .dt-input {
            width: 100%; background: #16181c; border: 1px solid #2f3336;
            color: #e7e9ea; padding: 8px; border-radius: 4px; box-sizing: border-box;
        }
        .dt-input:focus { border-color: #1d9bf0; outline: none; }

        .dt-channel-row { display: flex; gap: 8px; margin-bottom: 8px; align-items: center; }
        .dt-btn-icon {
            background: none; border: none; color: #f91880; cursor: pointer;
            font-size: 18px; padding: 0 5px;
        }
        .dt-btn-add {
            background: transparent; border: 1px dashed #536471; color: #1d9bf0;
            width: 100%; padding: 8px; border-radius: 4px; cursor: pointer;
        }
        .dt-btn-primary {
            background: #eff3f4; color: #0f1419; border: none;
            padding: 8px 16px; border-radius: 99px; font-weight: bold; cursor: pointer;
        }
        .dt-btn-secondary {
            background: transparent; color: #eff3f4; border: 1px solid #536471;
            padding: 8px 16px; border-radius: 99px; font-weight: bold; cursor: pointer;
        }
    `);

    // --- STATE MANAGEMENT ---
    const DEFAULTS = {
        embedder: "vxtwitter.com",
        useEmbedder: true,
        channels: [
            { name: "Discord", url: "" }
        ]
    };

    function loadSettings() {
        let settings = GM_getValue("dt_settings_v5", null);
        if (!settings) {
            const ch1_url = GM_getValue("ch1_url", "");
            if (ch1_url) {
                settings = {
                    embedder: GM_getValue("embedder", "vxtwitter.com"),
                    useEmbedder: GM_getValue("useEmbedder", true),
                    channels: []
                };
                for(let i=1; i<=3; i++) {
                    const url = GM_getValue(`ch${i}_url`);
                    if(url) settings.channels.push({ name: GM_getValue(`ch${i}_name`, `Discord ${i}`), url: url });
                }
            }
        }
        return settings || DEFAULTS;
    }

    function saveSettings(settings) {
        GM_setValue("dt_settings_v5", settings);
    }

    // --- SETTINGS UI ---
    function openSettings() {
        if (document.querySelector('.dt-modal-overlay')) return;

        const settings = loadSettings();
        const overlay = document.createElement('div');
        overlay.className = 'dt-modal-overlay';
        const modal = document.createElement('div');
        modal.className = 'dt-modal';

        modal.innerHTML = `
            <div class="dt-modal-header">
                <span>Configure Twitter to Discord</span>
                <span style="cursor:pointer;" id="dt-close">✕</span>
            </div>
            <div class="dt-modal-body">
                <div class="dt-form-group">
                    <label class="dt-label">Embedder Domain</label>
                    <input type="text" class="dt-input" id="dt-embedder" value="${settings.embedder}">
                </div>
                <div class="dt-form-group">
                    <label class="dt-label">Webhooks</label>
                    <div id="dt-channel-list"></div>
                    <button type="button" class="dt-btn-add" id="dt-add-btn">+ Add Channel</button>
                </div>
            </div>
            <div class="dt-modal-footer">
                <button class="dt-btn-secondary" id="dt-cancel">Cancel</button>
                <button class="dt-btn-primary" id="dt-save">Save</button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        const container = modal.querySelector('#dt-channel-list');
        function addRow(name = "", url = "") {
            const row = document.createElement('div');
            row.className = 'dt-channel-row';
            row.innerHTML = `
                <input type="text" class="dt-input" placeholder="Name" style="width: 30%;" value="${name}">
                <input type="text" class="dt-input" placeholder="Webhook URL" style="width: 60%;" value="${url}">
                <button class="dt-btn-icon">🗑</button>
            `;
            row.querySelector('button').onclick = () => row.remove();
            container.appendChild(row);
        }

        settings.channels.forEach(ch => addRow(ch.name, ch.url));
        if (settings.channels.length === 0) addRow();

        modal.querySelector('#dt-add-btn').onclick = () => addRow();
        modal.querySelector('#dt-close').onclick = () => overlay.remove();
        modal.querySelector('#dt-cancel').onclick = () => overlay.remove();

        modal.querySelector('#dt-save').onclick = () => {
            const newSettings = {
                embedder: modal.querySelector('#dt-embedder').value.replace(/^https?:\/\//, ''),
                useEmbedder: settings.useEmbedder,
                channels: []
            };
            modal.querySelectorAll('.dt-channel-row').forEach(row => {
                const inputs = row.querySelectorAll('input');
                const name = inputs[0].value.trim();
                const url = inputs[1].value.trim();
                if (name && url) newSettings.channels.push({ name, url });
            });
            saveSettings(newSettings);
            overlay.remove();
            alert("Settings saved! Reload the page to see changes.");
        };
    }

    GM_registerMenuCommand("Script Settings", openSettings);

    // --- LOGIC ---
    function processUrl(url) {
        const settings = loadSettings();
        if (!settings.useEmbedder || settings.embedder === "x.com") return url;
        return url.replace(/https:\/\/(mobile\.)?(twitter|x)\.com/, `https://${settings.embedder}`);
    }

    function sendToDiscord(tweetUrl, webhookUrl, btn) {
        if (!webhookUrl) return;
        const originalText = btn.innerText;
        btn.innerText = "Sending...";
        btn.style.opacity = "0.7";

        const finalUrl = processUrl(tweetUrl);

        GM_xmlhttpRequest({
            method: "POST",
            url: webhookUrl,
            headers: { "Content-Type": "application/json" },
            data: JSON.stringify({ content: finalUrl }),
            onload: () => {
                btn.innerText = "Sent!";
                btn.style.borderColor = "#00ba7c";
                btn.style.color = "#00ba7c";
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.borderColor = "";
                    btn.style.color = "";
                    btn.style.opacity = "1";
                }, 2000);
            },
            onerror: () => {
                btn.innerText = "Error";
                btn.style.borderColor = "#f91880";
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.borderColor = "";
                    btn.style.opacity = "1";
                }, 2000);
            }
        });
    }

    // --- DOM HANDLING ---
    function getTweetUrlFromArticle(article) {
        const timeElement = article.querySelector('time');
        if (timeElement) {
            const link = timeElement.closest('a');
            if (link) return link.href;
        }
        return window.location.href;
    }

    function injectToolbar(group) {
        if (group.parentNode.querySelector('.dt-discord-toolbar')) return;

        const article = group.closest('article');
        if (!article) return;

        const tweetUrl = getTweetUrlFromArticle(article);
        const settings = loadSettings();

        // Check if we are in the main post view or timeline view
        const currentPath = window.location.pathname.replace(/\/$/, '');
        let tweetPath = "";
        try { tweetPath = new URL(tweetUrl).pathname.replace(/\/$/, ''); } catch(e) { tweetPath = currentPath; }

        const isMainTweet = (currentPath === tweetPath);

        // Create Container
        const toolbar = document.createElement('div');
        toolbar.className = 'dt-discord-toolbar';

        // Apply conditional spacing class
        if (isMainTweet) {
            toolbar.classList.add('dt-spacing-post');
        } else {
            toolbar.classList.add('dt-spacing-timeline');
        }

        // 1. Embedder Toggle
        const toggleBtn = document.createElement('button');
        toggleBtn.className = `dt-btn ${settings.useEmbedder ? 'dt-toggle-on' : 'dt-toggle-off'}`;
        toggleBtn.innerText = settings.useEmbedder ? `Embedder: ON` : `Embedder: OFF`;

        toggleBtn.onclick = (e) => {
            e.preventDefault();
            const currentSettings = loadSettings();
            currentSettings.useEmbedder = !currentSettings.useEmbedder;
            saveSettings(currentSettings);

            toggleBtn.className = `dt-btn ${currentSettings.useEmbedder ? 'dt-toggle-on' : 'dt-toggle-off'}`;
            toggleBtn.innerText = currentSettings.useEmbedder ? `Embedder: ON` : `Embedder: OFF`;
        };
        toolbar.appendChild(toggleBtn);

        // 2. Channel Buttons
        if (settings.channels && settings.channels.length > 0) {
            settings.channels.forEach(ch => {
                if (!ch.url) return;
                const sendBtn = document.createElement('button');
                sendBtn.className = 'dt-btn dt-btn-send';
                sendBtn.innerText = ch.name;

                sendBtn.onclick = (e) => {
                    e.preventDefault();
                    sendToDiscord(tweetUrl, ch.url, sendBtn);
                };
                toolbar.appendChild(sendBtn);
            });
        } else {
            const helpBtn = document.createElement('button');
            helpBtn.className = 'dt-btn';
            helpBtn.innerText = "Configure Webhooks in Menu";
            helpBtn.onclick = (e) => { e.preventDefault(); openSettings(); };
            toolbar.appendChild(helpBtn);
        }

        group.after(toolbar);
    }

    // --- OBSERVER ---
    const observer = new MutationObserver((mutations) => {
        for (const m of mutations) {
            for (const n of m.addedNodes) {
                if (n.nodeType === 1) {
                    const shareButtons = n.querySelectorAll('[data-testid="share"], [aria-label="Share post"], [aria-label="Share"]');
                    shareButtons.forEach(shareBtn => {
                        const group = shareBtn.closest('[role="group"]');
                        if (group) injectToolbar(group);
                    });

                    if (n.getAttribute && n.getAttribute('role') === 'group') {
                        injectToolbar(n);
                    }
                }
            }
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

})();