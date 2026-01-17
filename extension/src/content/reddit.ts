import type { PendingPrompt } from '@/types';

// Track the element that was right-clicked for context menu extraction
let lastRightClickedElement: Element | null = null;

// AI-related subreddits
const AI_SUBREDDITS = [
  'midjourney',
  'stablediffusion',
  'aiart',
  'dalle',
  'comfyui',
  'sdforall',
  'deforum',
  'aivideo',
  'leonardoai',
  'flux',
  'bing_create',
  'nightcafe',
];

// Get current subreddit from URL
function getSubreddit(): string | null {
  const match = window.location.pathname.match(/\/r\/([^/]+)/i);
  return match ? match[1].toLowerCase() : null;
}

// Check if current page is an AI art subreddit
function isAISubreddit(): boolean {
  const subreddit = getSubreddit();
  if (!subreddit) return false;
  return AI_SUBREDDITS.some((s) => subreddit.includes(s));
}

// Check if we're on a post page
function isPostPage(): boolean {
  return window.location.pathname.includes('/comments/');
}

// Find the parent post element from any child element (using closest() - best practice)
function findParentPost(element: Element | null): Element | null {
  if (!element) return null;

  // Use closest() for efficient DOM traversal (recommended approach)
  return element.closest('[data-testid="post-container"]') ||
         element.closest('.Post') ||
         element.closest('shreddit-post') ||
         element.closest('[data-test-id="post-content"]') ||
         element.closest('.thing.link') || // Old Reddit
         element.closest('.entry') ||
         element.closest('article');
}

// Extract images from Reddit post
function extractImages(postEl?: Element | null): string[] {
  const images: string[] = [];
  const container = postEl || document;

  // Reddit image posts
  const postImages = container.querySelectorAll<HTMLImageElement>(
    '[data-testid="post-container"] img[src*="i.redd.it"], ' +
    '[data-testid="post-container"] img[src*="preview.redd.it"], ' +
    'img[src*="i.redd.it"], ' +
    'img[src*="preview.redd.it"], ' +
    'img[alt="Post image"], ' +
    '.media-element img'
  );

  postImages.forEach((img) => {
    const src = img.src || img.dataset.src;
    if (src && !src.includes('icon') && !src.includes('avatar')) {
      // Get full resolution image
      const fullRes = src.replace(/preview\.redd\.it/, 'i.redd.it').split('?')[0];
      if (!images.includes(fullRes)) {
        images.push(fullRes);
      }
    }
  });

  // Gallery images
  const galleryImages = container.querySelectorAll<HTMLImageElement>(
    '[data-testid="gallery-carousel"] img, ' +
    '.gallery-carousel img'
  );

  galleryImages.forEach((img) => {
    const src = img.src;
    if (src && !images.includes(src)) {
      images.push(src);
    }
  });

  // Imgur links
  const imgurLinks = container.querySelectorAll<HTMLAnchorElement>(
    'a[href*="imgur.com"]'
  );

  imgurLinks.forEach((link) => {
    const href = link.href;
    if (href.match(/imgur\.com\/[a-zA-Z0-9]+/)) {
      const imgUrl = href.replace('imgur.com', 'i.imgur.com') + '.jpg';
      if (!images.includes(imgUrl)) {
        images.push(imgUrl);
      }
    }
  });

  return images;
}

// Extract post title
function extractTitle(postEl?: Element | null): string {
  const container = postEl || document;

  // New Reddit
  const h1 = container.querySelector<HTMLHeadingElement>(
    '[data-testid="post-container"] h1, ' +
    '[slot="title"], ' +
    '.Post h1, ' +
    'h1'
  );
  if (h1?.textContent) return h1.textContent.trim();

  // Old Reddit
  const oldTitle = container.querySelector<HTMLAnchorElement>('.title a.title');
  if (oldTitle?.textContent) return oldTitle.textContent.trim();

  // Fallback for feed posts
  const titleLink = container.querySelector<HTMLAnchorElement>('a[data-click-id="body"]');
  if (titleLink?.textContent) return titleLink.textContent.trim();

  return postEl ? '' : document.title.split(' : ')[0] || '';
}

// Extract post body text
function extractBody(postEl?: Element | null): string {
  const container = postEl || document;

  // New Reddit
  const body = container.querySelector<HTMLDivElement>(
    '[data-testid="post-container"] [data-click-id="text"], ' +
    '[slot="text-body"], ' +
    '.Post .md, ' +
    '[data-click-id="text"]'
  );
  if (body?.textContent) return body.textContent.trim();

  // Old Reddit
  const oldBody = container.querySelector<HTMLDivElement>('.usertext-body .md');
  if (oldBody?.textContent) return oldBody.textContent.trim();

  return '';
}

// Extract author username
function extractAuthor(postEl?: Element | null): string {
  const container = postEl || document;

  const authorLink = container.querySelector<HTMLAnchorElement>(
    '[data-testid="post-container"] a[href*="/user/"], ' +
    '.Post a[href*="/user/"], ' +
    'a[href*="/user/"], ' +
    '.author'
  );

  if (authorLink?.textContent) {
    return authorLink.textContent.replace(/^u\//, '').trim();
  }

  return '';
}

// Extract first few comments (prompt is often in comments)
function extractComments(): string[] {
  const comments: string[] = [];

  const commentElements = document.querySelectorAll<HTMLDivElement>(
    '[data-testid="comment"] [data-testid="comment-content"], ' +
    '.Comment .md, ' +
    '.comment .md'
  );

  // Get first 3 comments
  commentElements.forEach((el, i) => {
    if (i < 3 && el.textContent) {
      comments.push(el.textContent.trim());
    }
  });

  return comments;
}

// Find the best prompt candidate from title, body, and comments
function findBestPrompt(title: string, body: string, comments: string[]): string {
  // Check if body looks like a prompt (long text with AI-related keywords)
  const promptKeywords = ['--ar', '--v', 'steps:', 'cfg:', 'seed:', 'prompt:', 'style:', 'model:'];

  // Check body first
  if (body.length > 20 && promptKeywords.some((k) => body.toLowerCase().includes(k))) {
    return body;
  }

  // Check title
  if (title.length > 50 || promptKeywords.some((k) => title.toLowerCase().includes(k))) {
    return title;
  }

  // Check first comment
  if (comments.length > 0) {
    for (const comment of comments) {
      if (comment.length > 50 && promptKeywords.some((k) => comment.toLowerCase().includes(k))) {
        return comment;
      }
    }
  }

  // Fallback: return body if exists, otherwise title
  return body.length > title.length ? body : title;
}

// Extract all data from Reddit post
function extractRedditData(): PendingPrompt | null {
  const title = extractTitle();
  const body = extractBody();
  const images = extractImages();
  const author = extractAuthor();
  const comments = extractComments();

  const promptText = findBestPrompt(title, body, comments);

  if (!promptText && images.length === 0) {
    return null;
  }

  return {
    text: promptText,
    title: title,
    imageUrls: images,
    sourceUrl: window.location.href,
    sourceType: 'reddit',
    metadata: {
      originalAuthor: author,
      platform: 'reddit',
      extractedAt: new Date().toISOString(),
    },
  };
}

// Extract data from a specific post element (for right-click context menu)
function extractRedditDataFromElement(postEl: Element): PendingPrompt | null {
  const title = extractTitle(postEl);
  const body = extractBody(postEl);
  const images = extractImages(postEl);
  const author = extractAuthor(postEl);

  const promptText = body.length > title.length ? body : title;

  if (!promptText && images.length === 0) {
    return null;
  }

  return {
    text: promptText,
    title: title,
    imageUrls: images,
    sourceUrl: window.location.href,
    sourceType: 'reddit',
    metadata: {
      originalAuthor: author,
      platform: 'reddit',
      extractedAt: new Date().toISOString(),
    },
  };
}

// Create floating action button
function createFAB(): HTMLButtonElement {
  const fab = document.createElement('button');
  fab.id = 'prompt-gallery-fab';
  fab.className = 'prompt-gallery-fab';
  fab.innerHTML = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
      <polyline points="17,21 17,13 7,13 7,21"/>
      <polyline points="7,3 7,8 15,8"/>
    </svg>
    <span>Save Prompt</span>
  `;

  fab.addEventListener('click', async () => {
    const data = extractRedditData();
    if (data) {
      fab.classList.add('loading');
      // Send to background script
      chrome.runtime.sendMessage({
        type: 'SAVE_PROMPT',
        data,
      }, (response) => {
        fab.classList.remove('loading');
        if (chrome.runtime.lastError) {
          console.error('Extension error:', chrome.runtime.lastError);
          fab.classList.add('error');
          setTimeout(() => fab.classList.remove('error'), 2000);
          return;
        }
        if (response?.success) {
          fab.classList.add('success');
          setTimeout(() => fab.classList.remove('success'), 2000);
          chrome.runtime.sendMessage({ type: 'OPEN_POPUP' });
        } else {
          fab.classList.add('error');
          setTimeout(() => fab.classList.remove('error'), 2000);
        }
      });
    }
  });

  return fab;
}

// Initialize Reddit content script
function init(): void {
  // Only run on AI subreddits and post pages
  if (!isAISubreddit() || !isPostPage()) {
    return;
  }

  // Check if FAB already exists
  if (document.getElementById('prompt-gallery-fab')) {
    return;
  }

  // Wait for content to load
  const checkContent = setInterval(() => {
    const title = extractTitle();
    const images = extractImages();

    if (title || images.length > 0) {
      clearInterval(checkContent);

      // Create and add FAB
      const fab = createFAB();
      document.body.appendChild(fab);

      // Show FAB with animation
      setTimeout(() => fab.classList.add('visible'), 100);
    }
  }, 500);

  // Clear interval after 10 seconds if content never loads
  setTimeout(() => clearInterval(checkContent), 10000);
}

// Listen for messages from background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_SELECTION') {
    const selection = window.getSelection()?.toString() || '';
    sendResponse({ text: selection });
    return false;
  }

  if (message.type === 'EXTRACT_DATA') {
    const data = extractRedditData();
    sendResponse(data);
    return false;
  }

  if (message.type === 'EXTRACT_POST_AT_CLICK') {
    try {
      // Extract data from the post that was right-clicked
      let data: PendingPrompt | null = null;

      if (lastRightClickedElement) {
        const postEl = findParentPost(lastRightClickedElement);
        if (postEl) {
          data = extractRedditDataFromElement(postEl);
        }
      }

      // Fallback to main post if no specific post found
      if (!data) {
        data = extractRedditData();
      }

      // Always send a response
      sendResponse(data || {
        text: '',
        sourceUrl: window.location.href,
        sourceType: 'reddit' as const,
      });
    } catch (err) {
      console.error('Error extracting post:', err);
      sendResponse({
        text: '',
        sourceUrl: window.location.href,
        sourceType: 'reddit' as const,
      });
    }
    return false;
  }

  return false;
});

// Track right-clicks for context menu extraction
document.addEventListener('contextmenu', (e) => {
  lastRightClickedElement = e.target as Element;
});

// Run on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Also run on URL changes (SPA navigation)
let lastUrl = window.location.href;
const observer = new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    // Remove existing FAB
    document.getElementById('prompt-gallery-fab')?.remove();
    // Re-initialize
    setTimeout(init, 1000);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

export {};
