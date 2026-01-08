# Grok Imagine Downloader

A Chrome extension to download prompts and generated videos from Grok Imagine.

> **Note:** This extension only works on **individual Imagine post pages** (`grok.com/imagine/post/...`), not the main Favorites listing page.

---

## ⚠️ IMPORTANT DISCLAIMER - READ BEFORE USE ⚠️
**USE AT YOUR OWN RISK. THIS IS AN UNOFFICIAL, THIRD-PARTY TOOL.**

- **NOT AFFILIATED** with Grok, X, or any official entities
- **NO WARRANTY** - This extension is provided "AS IS" without any guarantees
- **NO RESPONSIBILITY** - The developer is not responsible for:
  - Data loss or corruption
  - Account issues or bans
  - API changes breaking functionality
  - Any damages or issues arising from use
- **BREAKING CHANGES EXPECTED** - Grok is constantly evolving. This extension may break at any time as the platform updates its interface or policies
- **EXPERIMENTAL SOFTWARE** - Features may be unstable or incomplete
- **YOUR RESPONSIBILITY** - By using this extension, you acknowledge and accept all risks

**If you cannot accept these terms, do not use this extension.**

---

## Features
- Detect prompts and generated videos from single Grok Imagine favorite page
- **Batch download** - Automatically clicks through all thumbnails to collect all video URLs, if they exist
- Download prompt text as a `.txt` file for each video
- **SD + HD downloads** - Automatically downloads both standard and HD versions when available
- Download all content on a page with a single click
- **Upscale all videos** - Request HD upscale for all detected videos (refresh page to see results)
- Files grouped by timestamp for easy organization

---

## Installation

### Step 1: Clone the Repository
First, clone this repository to your local machine:

```bash
git clone https://github.com/brndnsmth/grok-imagine-downloader.git
```

This will create a folder called `grok-imagine-downloader` containing all the extension files.

Alternatively, you can download the repository as a ZIP file:
1. Go to https://github.com/brndnsmth/grok-imagine-downloader
2. Click the green "Code" button
3. Select "Download ZIP"
4. Extract the ZIP file to a folder on your computer

### Step 2: Load the Extension in Chrome
1. Open Google Chrome
2. Navigate to `chrome://extensions/` (or go to Menu → Extensions → Manage Extensions)
3. Enable **Developer mode** by toggling the switch in the top-right corner
4. Click the **"Load unpacked"** button that appears
5. Navigate to and select the `grok-imagine-downloader` folder you cloned/downloaded
6. The extension should now appear in your extensions list

### Step 3: Pin the Extension (Optional but Recommended)
1. Click the puzzle piece icon in Chrome's toolbar (Extensions menu)
2. Find "Grok Imagine Downloader" in the list
3. Click the pin icon next to it
4. The extension icon will now appear in your toolbar for easy access

---

## Usage

1. Log in to your Grok account
2. Navigate to any Grok Imagine page with generated videos
3. Click the extension icon
4. Click **Detect Content** to scan the page (the extension will click through all thumbnails automatically)
5. Choose your desired action

### Available Actions

**Download:**
- **Download All** - Downloads both the prompt and all videos
- **Download Prompt Only** - Downloads only the prompt text file
- **Download Videos Only** - Downloads only the generated videos

---

## File Organization

Downloads are organized into folders based on the timestamp. Each detection creates a folder with all videos from that session.

**Folder Structure:**
```
Downloads/
└── imagine/
    └── {timestamp}/
        ├── {timestamp}-prompt.txt           ← Prompt text
        ├── {timestamp}-video-01-{id}.mp4    ← Generated videos
        ├── {timestamp}-video-02-{id}.mp4
        └── ...
```

**Key Features:**
- **Timestamp folders** - All assets from a detection are grouped together
- **Video IDs included** - Filenames include partial video IDs for easy identification
- **Batch collection** - All video thumbnails are clicked to collect all available videos

---

## Files
- `manifest.json` - Extension configuration
- `popup.html` - Extension popup UI
- `popup.css` - Popup styling
- `popup.js` - Popup logic, content detection, and download handling
- `icons/` - Extension icons

---

## Important Notes
- **⚠️ Grok is constantly changing** - This extension may break with platform updates
- **Batch detection** - The extension automatically clicks through all thumbnails to collect all videos
- The extension works on https://grok.com/imagine pages
- Keep the extension popup open while downloads complete
- **Incognito mode may have limited functionality** due to Chrome's security restrictions

---

## Support
This extension is designed specifically for downloading Grok Imagine video assets. **The Grok platform is actively developed and frequently changes.** If features stop working, the extension will need updates to match new DOM structures or workflows. Check the repository for updates or open an issue if you encounter problems.
