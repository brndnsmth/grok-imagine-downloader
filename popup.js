// State
let extractedData = null;
let currentTabUrl = null;

// DOM Elements
const detectBtn = document.getElementById('detectBtn');
const contentFound = document.getElementById('contentFound');
const downloadSection = document.getElementById('downloadSection');
const upscaleSection = document.getElementById('upscaleSection');
const promptPreview = document.getElementById('promptPreview');
const videoCount = document.getElementById('videoCount');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const downloadPromptBtn = document.getElementById('downloadPromptBtn');
const downloadVideosBtn = document.getElementById('downloadVideosBtn');
const upscaleAllBtn = document.getElementById('upscaleAllBtn');
const progress = document.getElementById('progress');
const progressText = document.getElementById('progressText');
const preview = document.getElementById('preview');

// API endpoint for upscaling
const UPSCALE_API = 'https://grok.com/rest/media/video/upscale';

// Initialize
document.addEventListener('DOMContentLoaded', init);

function init() {
  detectBtn.addEventListener('click', detectContent);
  downloadAllBtn.addEventListener('click', () => downloadContent('all'));
  downloadPromptBtn.addEventListener('click', () => downloadContent('prompt'));
  downloadVideosBtn.addEventListener('click', () => downloadContent('videos'));
  upscaleAllBtn.addEventListener('click', upscaleAllVideos);
}

async function detectContent() {
  showProgress('Detecting content...');

  try {
    // Get the active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab.url?.match(/grok\.com\/imagine\/post\//)) {
      showProgress('Please navigate to a Grok Imagine post page (grok.com/imagine/post/...)', 'error');
      return;
    }

    showProgress('Scanning page...');

    // Step 1: Get thumbnail count
    const initResults = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getThumbnailCount
    });

    if (!initResults || !initResults[0]) {
      showProgress('No content found on this page', 'error');
      return;
    }

    const thumbnailCount = initResults[0].result || 0;
    const data = {
      prompt: null,  // Will store the first prompt for display
      videos: [],
      sourceImage: null  // The original image all videos are based on
    };

    if (thumbnailCount <= 1) {
      // Single video (0 or 1 thumbnails), just get current video and prompt
      showProgress('Getting current video...');
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: getCurrentVideoAndPrompt
      });

      if (results && results[0] && results[0].result) {
        const result = results[0].result;
        data.prompt = result.prompt;
        data.sourceImage = result.sourceImage;
        if (result.video) {
          // Attach prompt to the video object for download
          data.videos.push({
            ...result.video,
            prompt: result.prompt
          });
        }
      }
    } else {
      // Click through each thumbnail and collect video + prompt
      for (let i = 0; i < thumbnailCount; i++) {
        showProgress(`Scanning video ${i + 1}/${thumbnailCount}...`);

        // Click thumbnail at index i
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: clickThumbnailByIndex,
          args: [i]
        });

        // Wait for content to load
        await new Promise(r => setTimeout(r, 500));

        // Get video and prompt for this thumbnail
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: getCurrentVideoAndPrompt
        });

        if (results && results[0] && results[0].result) {
          const result = results[0].result;

          // Store first prompt for display
          if (!data.prompt && result.prompt) {
            data.prompt = result.prompt;
          }

          // Store source image (only need it once, from first result)
          if (!data.sourceImage && result.sourceImage) {
            data.sourceImage = result.sourceImage;
          }

          // Add video with its prompt
          if (result.video) {
            // Check for duplicate URLs
            const exists = data.videos.some(v => v.url === result.video.url);
            if (!exists) {
              data.videos.push({
                ...result.video,
                prompt: result.prompt
              });
            }
          }
        }
      }
    }

    if (data.prompt || data.videos.length > 0) {
      extractedData = data;
      currentTabUrl = tab.url;
      displayResults(data);
    } else {
      showProgress('No content found on this page', 'error');
    }
  } catch (error) {
    console.error('Detection error:', error);
    showProgress('Error detecting content: ' + error.message, 'error');
  }
}

// Count thumbnail buttons (runs in page context)
function getThumbnailCount() {
  const thumbnailContainer = document.querySelector('.scrollbar-hide');
  if (!thumbnailContainer) return 0;

  const buttons = thumbnailContainer.querySelectorAll('button');
  return buttons.length;
}

// Click a specific thumbnail by index (runs in page context)
function clickThumbnailByIndex(index) {
  const thumbnailContainer = document.querySelector('.scrollbar-hide');
  if (!thumbnailContainer) return false;

  const buttons = thumbnailContainer.querySelectorAll('button');
  if (index < buttons.length) {
    buttons[index].click();
    return true;
  }
  return false;
}

// Get the currently displayed video and its prompt (runs in page context)
function getCurrentVideoAndPrompt() {
  let prompt = null;
  let video = null;

  // Get prompt from textarea
  const textarea = document.querySelector('textarea[placeholder*="customize video"]');
  if (textarea && textarea.value) {
    prompt = textarea.value.trim();
  }

  // Fallback: Get prompt from main image alt text
  if (!prompt) {
    const mainImg = document.querySelector('img[alt][src*="imagine-public"], img[alt][src*="assets.grok.com"]');
    if (mainImg && mainImg.alt && !mainImg.alt.startsWith('Thumbnail')) {
      prompt = mainImg.alt.trim();
    }
  }

  // Get SD video URL (standard definition)
  let sdVideoEl = document.querySelector('video#sd-video[src*=".mp4"]');
  if (!sdVideoEl || !sdVideoEl.src) {
    sdVideoEl = document.querySelector('video[src*="generated_video.mp4"]');
  }
  if (!sdVideoEl || !sdVideoEl.src) {
    // Try share-videos format (non-HD)
    sdVideoEl = document.querySelector('video[src*="share-videos"][src$=".mp4"]:not([src*="_hd.mp4"])');
  }

  // Get HD video URL if it exists
  let hdVideoEl = document.querySelector('video#hd-video[src*=".mp4"]');
  if (!hdVideoEl || !hdVideoEl.src) {
    hdVideoEl = document.querySelector('video[src*="generated_video_hd.mp4"]');
  }
  if (!hdVideoEl || !hdVideoEl.src) {
    hdVideoEl = document.querySelector('video[src*="_hd.mp4"]');
  }

  // Get source image URL (the original image all videos are based on)
  // Two possible patterns:
  // 1. assets.grok.com: /generated/{id}/image.jpg
  // 2. imagine-public.x.ai: /share-images/{id}.jpg
  let sourceImage = null;
  let sourceImgEl = document.querySelector('.grid img[src*="/generated/"][src*="image.jpg"]');
  if (!sourceImgEl) {
    sourceImgEl = document.querySelector('.grid img[src*="share-images"]');
  }
  if (sourceImgEl && sourceImgEl.src) {
    let match = sourceImgEl.src.match(/\/generated\/([a-f0-9-]+)\/image\.(jpg|png)/i);
    if (!match) {
      match = sourceImgEl.src.match(/share-images\/([a-f0-9-]+)\.(jpg|png)/i);
    }
    sourceImage = {
      url: sourceImgEl.src.split('?')[0], // Remove cache param
      id: match ? match[1] : null
    };
  }

  if (sdVideoEl && sdVideoEl.src) {
    // Extract video ID from URL
    let match = sdVideoEl.src.match(/\/generated\/([a-f0-9-]+)\//);
    if (!match) {
      match = sdVideoEl.src.match(/share-videos\/([a-f0-9-]+)(?:_hd)?\.mp4/);
    }

    video = {
      url: sdVideoEl.src,
      id: match ? match[1] : null,
      hdUrl: (hdVideoEl && hdVideoEl.src) ? hdVideoEl.src : null
    };
  }

  return { prompt, video, sourceImage };
}

function displayResults(data) {
  if (!data.prompt && data.videos.length === 0) {
    showProgress('No prompt or videos found', 'error');
    return;
  }

  // Update preview
  if (data.prompt) {
    const truncated = data.prompt.length > 100
      ? data.prompt.substring(0, 100) + '...'
      : data.prompt;
    promptPreview.textContent = truncated;
    promptPreview.title = data.prompt;
  } else {
    promptPreview.textContent = 'No prompt detected';
  }

  videoCount.textContent = `${data.videos.length} video(s) found`;

  // Update preview area with video thumbnails
  preview.innerHTML = '';
  if (data.videos.length > 0) {
    const thumbsDiv = document.createElement('div');
    thumbsDiv.className = 'image-thumbs';

    // Show video icon for each video
    data.videos.slice(0, 4).forEach((video, idx) => {
      const thumbDiv = document.createElement('div');
      thumbDiv.className = 'video-thumb';
      thumbDiv.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 3v18" />
          <path d="M3 12h18" />
          <path d="M17 3v18" />
        </svg>
        <span>${idx + 1}</span>
      `;
      thumbsDiv.appendChild(thumbDiv);
    });

    if (data.videos.length > 4) {
      const moreDiv = document.createElement('div');
      moreDiv.className = 'video-thumb more';
      moreDiv.innerHTML = `<span>+${data.videos.length - 4}</span>`;
      thumbsDiv.appendChild(moreDiv);
    }

    preview.appendChild(thumbsDiv);
  } else {
    preview.innerHTML = '<div class="preview-placeholder"><span>No videos to preview</span></div>';
  }

  // Show sections
  contentFound.style.display = 'block';
  downloadSection.style.display = 'block';
  upscaleSection.style.display = data.videos.length > 0 ? 'block' : 'none';

  // Enable/disable buttons based on content
  downloadPromptBtn.disabled = !data.prompt;
  downloadVideosBtn.disabled = data.videos.length === 0;
  downloadAllBtn.disabled = !data.prompt && data.videos.length === 0;
  upscaleAllBtn.disabled = data.videos.length === 0;

  hideProgress();
}

// Extract imagine ID from Grok URL if available
function getImagineId(url) {
  if (!url) return null;
  // Match patterns like /imagine/{id} or /i/{id}
  const match = url.match(/grok\.com\/(?:imagine|i)\/([a-f0-9-]+)/);
  return match ? match[1] : null;
}

async function downloadContent(type) {
  if (!extractedData) {
    showProgress('No content to download. Please detect first.', 'error');
    return;
  }

  const imagineId = getImagineId(currentTabUrl);
  const timestamp = Date.now();
  const folder = imagineId ? `imagine/${imagineId}/` : `imagine/${timestamp}/`;
  let downloadCount = 0;
  let totalDownloads = 0;

  // Count total downloads
  if (type === 'all' || type === 'videos') {
    // Source image (downloaded once)
    if (extractedData.sourceImage) totalDownloads++;
    // Each video (SD + HD if exists) + its prompt (if it has one)
    extractedData.videos.forEach(video => {
      totalDownloads++; // SD video
      if (video.hdUrl) totalDownloads++; // HD video if exists
      if (video.prompt) totalDownloads++; // prompt for this video
    });
  }
  if (type === 'prompt') {
    // Just count videos that have prompts
    extractedData.videos.forEach(video => {
      if (video.prompt) totalDownloads++;
    });
  }

  showProgress(`Starting download (0/${totalDownloads})...`);

  try {
    // Download source image first (the original image all videos are based on)
    if ((type === 'all' || type === 'videos') && extractedData.sourceImage) {
      const imgExt = extractedData.sourceImage.url.match(/\.(jpg|png)$/i)?.[1] || 'jpg';
      const imgFilename = extractedData.sourceImage.id
        ? `${folder}${timestamp}-source-${extractedData.sourceImage.id.slice(0, 8)}.${imgExt}`
        : `${folder}${timestamp}-source.${imgExt}`;

      await chrome.downloads.download({
        url: extractedData.sourceImage.url,
        filename: imgFilename,
        saveAs: false
      });

      downloadCount++;
      showProgress(`Downloaded source image (${downloadCount}/${totalDownloads})`);
    }

    // Download videos (and their prompts if type is 'all')
    if ((type === 'all' || type === 'videos') && extractedData.videos.length > 0) {
      for (let i = 0; i < extractedData.videos.length; i++) {
        const video = extractedData.videos[i];
        const videoNum = String(i + 1).padStart(2, '0');
        const idSuffix = video.id ? `-${video.id.slice(0, 8)}` : '';

        // Download SD video
        const sdFilename = `${folder}${timestamp}-video-${videoNum}${idSuffix}.mp4`;
        await chrome.downloads.download({
          url: video.url,
          filename: sdFilename,
          saveAs: false
        });

        downloadCount++;
        showProgress(`Downloaded SD video ${i + 1} (${downloadCount}/${totalDownloads})`);

        // Download HD video if available
        if (video.hdUrl) {
          const hdFilename = `${folder}${timestamp}-video-${videoNum}${idSuffix}-HD.mp4`;
          await chrome.downloads.download({
            url: video.hdUrl,
            filename: hdFilename,
            saveAs: false
          });

          downloadCount++;
          showProgress(`Downloaded HD video ${i + 1} (${downloadCount}/${totalDownloads})`);
        }

        // Download prompt for this video (if available and type includes prompts)
        if ((type === 'all') && video.prompt) {
          const promptBlob = new Blob([video.prompt], { type: 'text/plain' });
          const promptUrl = URL.createObjectURL(promptBlob);
          const promptFilename = `${folder}${timestamp}-video-${videoNum}${idSuffix}-prompt.txt`;

          await chrome.downloads.download({
            url: promptUrl,
            filename: promptFilename,
            saveAs: false
          });

          downloadCount++;
          showProgress(`Downloaded prompt ${i + 1} (${downloadCount}/${totalDownloads})`);
        }
      }
    }

    // Download prompts only
    if (type === 'prompt' && extractedData.videos.length > 0) {
      for (let i = 0; i < extractedData.videos.length; i++) {
        const video = extractedData.videos[i];
        if (!video.prompt) continue;

        const videoNum = String(i + 1).padStart(2, '0');
        const idSuffix = video.id ? `-${video.id.slice(0, 8)}` : '';

        const promptBlob = new Blob([video.prompt], { type: 'text/plain' });
        const promptUrl = URL.createObjectURL(promptBlob);
        const promptFilename = `${folder}${timestamp}-video-${videoNum}${idSuffix}-prompt.txt`;

        await chrome.downloads.download({
          url: promptUrl,
          filename: promptFilename,
          saveAs: false
        });

        downloadCount++;
        showProgress(`Downloaded prompt ${i + 1} (${downloadCount}/${totalDownloads})`);
      }
    }

    showProgress(`✓ Downloaded ${downloadCount} file(s)`, 'success');
  } catch (error) {
    console.error('Download error:', error);
    showProgress('Error downloading: ' + error.message, 'error');
  }
}

function showProgress(message, type = '') {
  progress.style.display = 'block';
  progressText.textContent = message;
  progressText.className = type;
}

function hideProgress() {
  progress.style.display = 'none';
  progressText.className = '';
}

/**
 * Extracts video ID from video URL
 * @param {string} videoUrl - The video URL
 * @returns {string|null} - The video ID or null
 */
function extractVideoIdFromUrl(videoUrl) {
  // URL format: https://assets.grok.com/users/{userId}/generated/{videoId}/generated_video.mp4
  const match = videoUrl.match(/\/generated\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\//i);
  return match ? match[1] : null;
}

/**
 * Sends upscale request for a single video
 * @param {string} videoId - The video ID to upscale
 * @returns {Promise<boolean>} - True if successful
 */
async function upscaleVideo(videoId) {
  try {
    const response = await fetch(UPSCALE_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': '*/*',
      },
      credentials: 'include',
      body: JSON.stringify({ videoId })
    });

    return response.ok;
  } catch (error) {
    console.error(`Failed to upscale video ${videoId}:`, error);
    return false;
  }
}

/**
 * Upscales all detected videos
 */
async function upscaleAllVideos() {
  if (!extractedData || extractedData.videos.length === 0) {
    showProgress('No videos to upscale. Please detect first.', 'error');
    return;
  }

  const videos = extractedData.videos;
  let successCount = 0;
  let failCount = 0;
  const STAGGER_DELAY = 300; // 300ms delay between requests

  showProgress(`Starting upscale for ${videos.length} video(s)...`);

  for (let i = 0; i < videos.length; i++) {
    const video = videos[i];
    const videoId = video.id || extractVideoIdFromUrl(video.url);

    if (!videoId) {
      failCount++;
      console.log(`Could not extract video ID from: ${video.url}`);
      continue;
    }

    showProgress(`Upscaling video ${i + 1}/${videos.length}...`);

    const success = await upscaleVideo(videoId);
    if (success) {
      successCount++;
      console.log(`Successfully requested upscale for video ${i + 1}: ${videoId}`);
    } else {
      failCount++;
      console.log(`Failed to upscale video ${i + 1}: ${videoId}`);
    }

    // Stagger requests to avoid rate limiting
    if (i < videos.length - 1) {
      await new Promise(r => setTimeout(r, STAGGER_DELAY));
    }
  }

  if (successCount > 0) {
    showProgress(`✓ Upscale requested for ${successCount} video(s)${failCount > 0 ? `, ${failCount} failed` : ''}. Refresh page to see HD versions. May take a minute to see changes.`, 'success');
  } else {
    showProgress(`Failed to upscale videos. ${failCount} failed.`, 'error');
  }
}
