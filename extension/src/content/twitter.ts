import type { PendingPrompt } from '@/types';

// Track the element that was right-clicked for context menu extraction
let lastRightClickedElement: Element | null = null;

// Expand "Show more" button if present in the tweet
async function expandShowMore(tweetEl: Element): Promise<boolean> {
  try {
    // Store original text length to verify if expansion worked
    const originalText = extractTweetText(tweetEl);
    const originalLength = originalText.length;

    // Look specifically for Twitter's "Show more" link - be very precise
    const tweetTextEl = tweetEl.querySelector('[data-testid="tweetText"]');
    if (!tweetTextEl) return false;

    // Method 1: Check for Twitter's official data-testid for show more (most reliable)
    const showMoreBtn = tweetEl.querySelector('[data-testid="tweet-text-show-more-link"]');
    if (showMoreBtn) {
      try {
        (showMoreBtn as HTMLElement).click();
        // Wait for content to expand
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Verify expansion worked by checking if text length increased
        const newText = extractTweetText(tweetEl);
        if (newText.length > originalLength) {
          return true;
        }
      } catch (err) {
        console.warn('Error clicking show more button:', err);
      }
    }

    // Method 2: Find spans with exact "Show more" or "See more" text
    // Look within the tweet text container
    const allSpans = tweetTextEl.querySelectorAll('span');
    for (const span of allSpans) {
      const text = span.textContent?.trim().toLowerCase() || '';
      // Only match EXACT text, not partial matches
      if (text === 'show more' || text === 'see more') {
        try {
          // Check if it's clickable
          const htmlSpan = span as HTMLElement;
          if (htmlSpan.style.cursor === 'pointer' || htmlSpan.getAttribute('role') === 'button' || htmlSpan.onclick) {
            htmlSpan.click();
            await new Promise(resolve => setTimeout(resolve, 800));
            
            // Verify expansion worked
            const newText = extractTweetText(tweetEl);
            if (newText.length > originalLength) {
              return true;
            }
          }
        } catch (err) {
          console.warn('Error clicking show more span:', err);
          continue;
        }
      }
    }

    // Method 3: Look for clickable elements with "Show more" text near the tweet text
    const clickableElements = tweetTextEl.parentElement?.querySelectorAll('[role="button"], [role="link"]') || [];
    for (const element of clickableElements) {
      const text = element.textContent?.trim().toLowerCase() || '';
      if (text === 'show more' || text === 'see more') {
        try {
          (element as HTMLElement).click();
          await new Promise(resolve => setTimeout(resolve, 800));
          
          // Verify expansion worked
          const newText = extractTweetText(tweetEl);
          if (newText.length > originalLength) {
            return true;
          }
        } catch (err) {
          console.warn('Error clicking show more element:', err);
          continue;
        }
      }
    }

    return false;
  } catch (err) {
    console.error('Error expanding show more:', err);
    return false;
  }
}

// AI art related keywords to detect AI art posts
const AI_KEYWORDS = [
  '#midjourney',
  '#aiart',
  '#stablediffusion',
  '#dalle',
  '#flux',
  '#comfyui',
  '#leonardoai',
  '#aiartwork',
  '#aigenerated',
  '#generativeart',
  'prompt:',
  '--ar',
  '--v ',
  '--style',
  'steps:',
  'cfg:',
  'seed:',
];

// Check if we're on a tweet/status page
function isStatusPage(): boolean {
  return /\/(status|tweet)\/\d+/.test(window.location.pathname);
}

// Get main tweet element
function getMainTweet(): Element | null {
  // Try different selectors for the main tweet (X/Twitter changes DOM frequently)
  const articles = document.querySelectorAll('article[data-testid="tweet"]');
  
  if (articles.length > 0) {
    // On status pages, the main tweet is usually the first article
    if (isStatusPage()) {
      return articles[0];
    }
    
    // On feed pages, try to find the tweet that's most visible in viewport
    // or the one closest to the top
    for (const article of articles) {
      const rect = article.getBoundingClientRect();
      // Check if tweet is in viewport and near the top
      if (rect.top >= 0 && rect.top < window.innerHeight * 0.5) {
        return article;
      }
    }
    
    // Fallback: return first article
    return articles[0];
  }

  // Try other selectors
  return (
    document.querySelector('article[data-testid="tweet"][tabindex="-1"]') ||
    document.querySelector('div[data-testid="tweetDetail"]') ||
    document.querySelector('article[role="article"]') ||
    document.querySelector('article')
  );
}

// Find the parent tweet element from any child element (using closest() - best practice)
function findParentTweet(element: Element | null): Element | null {
  if (!element) return null;

  // Use closest() for efficient DOM traversal (recommended approach)
  return element.closest('article[data-testid="tweet"]') ||
         element.closest('article[role="article"]') ||
         element.closest('article');
}

// Extract tweet text (main extraction function)
function extractTweetText(tweetEl?: Element | null): string {
  const el = tweetEl || getMainTweet();
  if (!el) return '';

  // Try multiple selectors for tweet text
  const textEl = el.querySelector<HTMLDivElement>('[data-testid="tweetText"]');
  if (textEl?.textContent) {
    const text = textEl.textContent.trim();
    if (text.length > 0) {
      return text;
    }
  }

  // Fallback: find element with lang attribute (tweet content)
  const langEl = el.querySelector<HTMLDivElement>('div[lang]');
  if (langEl?.textContent) {
    const text = langEl.textContent.trim();
    if (text.length > 0) {
      return text;
    }
  }

  // Try to find text in article content (for expanded tweets)
  const articleText = el.querySelector('[data-testid="tweetText"]')?.textContent?.trim() || '';
  if (articleText.length > 0) {
    return articleText;
  }

  // Last resort: get all text from the tweet, but filter out metadata
  const allText = el.textContent || '';
  // Remove common metadata patterns (likes, retweets, etc.)
  const cleaned = allText
    .replace(/\d+\s*(likes?|retweets?|replies?|views?)/gi, '')
    .replace(/Replying to.*/gi, '')
    .trim();
  
  return cleaned || allText.trim();
}

// Alias for backward compatibility
const extractTweetTextSync = extractTweetText;

// Extract images from tweet (using data-testid for reliability)
function extractImages(tweetEl?: Element | null): string[] {
  const el = tweetEl || getMainTweet();
  if (!el) return [];

  const images: string[] = [];

  // Method 1: Use data-testid="tweetPhoto" (most reliable - recommended by scrapers)
  const tweetPhotos = el.querySelectorAll('[data-testid="tweetPhoto"] img');
  tweetPhotos.forEach((img) => {
    const imgEl = img as HTMLImageElement;
    let src = imgEl.src;
    if (src && src.includes('twimg.com')) {
      // Get high resolution version (large or 4096x4096)
      src = src.replace(/&name=\w+/, '&name=large')
               .replace(/\?name=\w+/, '?name=large');
      if (!src.includes('name=')) {
        src = src.includes('?') ? `${src}&name=large` : `${src}?name=large`;
      }
      if (!images.includes(src)) {
        images.push(src);
      }
    }
  });

  // Method 2: Fallback to direct image selector if tweetPhoto not found
  if (images.length === 0) {
    const tweetImages = el.querySelectorAll<HTMLImageElement>(
      'img[src*="pbs.twimg.com/media"], ' +
      'img[src*="twimg.com/media"]'
    );

    tweetImages.forEach((img) => {
      let src = img.src;
      // Get high resolution version
      src = src.replace(/&name=\w+/, '&name=large')
               .replace(/\?name=\w+/, '?name=large');
      if (!src.includes('name=')) {
        src = src.includes('?') ? `${src}&name=large` : `${src}?name=large`;
      }
      if (!images.includes(src)) {
        images.push(src);
      }
    });
  }

  // Method 3: Check for video thumbnails (poster images)
  const videoThumbnails = el.querySelectorAll<HTMLVideoElement>('video[poster]');
  videoThumbnails.forEach((video) => {
    if (video.poster && !images.includes(video.poster)) {
      images.push(video.poster);
    }
  });

  // Method 4: Check for images in card previews
  const cardImages = el.querySelectorAll<HTMLImageElement>(
    '[data-testid="card.wrapper"] img'
  );
  cardImages.forEach((img) => {
    if (img.src && !img.src.includes('profile') && !images.includes(img.src)) {
      images.push(img.src);
    }
  });

  return images;
}

// Extract author handle (using data-testid for reliability)
function extractAuthor(tweetEl?: Element | null): string {
  const el = tweetEl || getMainTweet();
  if (!el) return '';

  // Method 1: Use data-testid="User-Names" (most reliable)
  const userNames = el.querySelector('[data-testid="User-Names"]');
  if (userNames) {
    // Find the @handle link within User-Names
    const handleLink = userNames.querySelector('a[href^="/"]');
    if (handleLink?.textContent) {
      const text = handleLink.textContent.trim();
      // Handle might be "@username" or just "username"
      return text.startsWith('@') ? text.substring(1) : text;
    }
  }

  // Method 2: Fallback to finding user link
  const authorLink = el.querySelector<HTMLAnchorElement>(
    'a[href*="/"][role="link"]:not([href*="/status/"]):not([href*="/photo/"])'
  );

  if (authorLink?.href) {
    const match = authorLink.href.match(/(?:twitter\.com|x\.com)\/([^/?]+)/);
    return match ? match[1] : '';
  }

  return '';
}

// Extract timestamp
function extractTimestamp(tweetEl?: Element | null): string {
  const el = tweetEl || getMainTweet();
  if (!el) return '';

  const timeEl = el.querySelector<HTMLTimeElement>('time');
  return timeEl?.dateTime || timeEl?.textContent || '';
}

// Check if tweet contains AI art
function isAIArtTweet(text: string): boolean {
  const lowerText = text.toLowerCase();
  return AI_KEYWORDS.some((keyword) => lowerText.includes(keyword.toLowerCase()));
}

// Extract thread replies (for prompts in replies)
function extractThreadReplies(): string[] {
  const replies: string[] = [];

  // Get conversation thread
  const thread = document.querySelectorAll('article[data-testid="tweet"]');

  thread.forEach((tweet, i) => {
    // Skip the main tweet
    if (i === 0) return;
    // Only get first 3 replies
    if (i > 3) return;

    const text = extractTweetText(tweet);
    if (text) {
      replies.push(text);
    }
  });

  return replies;
}

// Find the best prompt from tweet and replies
function findBestPrompt(tweetText: string, replies: string[]): string {
  // Check if main tweet looks like a prompt
  if (tweetText.length > 30 && AI_KEYWORDS.some((k) => tweetText.toLowerCase().includes(k.toLowerCase()))) {
    return tweetText;
  }

  // Check replies for prompts
  for (const reply of replies) {
    if (reply.length > 30 && AI_KEYWORDS.some((k) => reply.toLowerCase().includes(k.toLowerCase()))) {
      return reply;
    }
  }

  // Fallback to main tweet
  return tweetText;
}

// Extract all data from Twitter post (sync version)
function extractTwitterDataSync(tweetEl?: Element | null): PendingPrompt | null {
  const el = tweetEl || getMainTweet();
  const tweetText = extractTweetText(el);
  const images = extractImages(el);
  const author = extractAuthor(el);
  const timestamp = extractTimestamp(el);
  // Only get replies if extracting main tweet (when tweetEl is not provided)
  const replies = tweetEl ? [] : extractThreadReplies();

  const promptText = findBestPrompt(tweetText, replies);

  // Always return something if we have any content
  if (!promptText && images.length === 0) {
    // Last resort: try to get any text from the page
    const fallbackText = document.querySelector('article')?.textContent?.trim() || '';
    if (!fallbackText) {
      return null;
    }
    return {
      text: fallbackText.substring(0, 2000), // Limit length
      imageUrls: [],
      sourceUrl: window.location.href,
      sourceType: 'twitter',
      metadata: {
        platform: 'twitter',
        extractedAt: new Date().toISOString(),
      },
    };
  }

  return {
    text: promptText,
    imageUrls: images,
    sourceUrl: window.location.href,
    sourceType: 'twitter',
    metadata: {
      originalAuthor: author,
      platform: 'twitter',
      extractedAt: timestamp || new Date().toISOString(),
    },
  };
}

// Extract all data from Twitter post (async version that expands "Show more" first)
async function extractTwitterData(tweetEl?: Element | null): Promise<PendingPrompt | null> {
  const el = tweetEl || getMainTweet();
  if (!el) {
    console.warn('No tweet element found for extraction');
    return null;
  }
  
  // First, try to get visible text immediately (fallback)
  const visibleData = extractTwitterDataSync(el);
  
  // Try to expand "Show more" if present (with timeout to avoid hanging)
  try {
    const expansionPromise = expandShowMore(el);
    const timeoutPromise = new Promise<boolean>((resolve) => 
      setTimeout(() => resolve(false), 2000)
    );
    
    // Wait for expansion with timeout
    await Promise.race([expansionPromise, timeoutPromise]);
    
    // After expansion attempt, extract again (might have more text now)
    const expandedData = extractTwitterDataSync(el);
    
    // Use expanded data if it has more text, otherwise use visible data
    if (expandedData && expandedData.text && expandedData.text.length > (visibleData?.text?.length || 0)) {
      return expandedData;
    }
  } catch (err) {
    console.warn('Failed to expand show more, using visible text:', err);
  }
  
  // Always return visible data (even if expansion failed)
  return visibleData;
}

// Extract data from a specific tweet element (for right-click context menu)
async function extractTwitterDataFromElement(tweetEl: Element): Promise<PendingPrompt | null> {
  if (!tweetEl) {
    console.warn('extractTwitterDataFromElement: No tweet element provided');
    return null;
  }

  console.log('Extracting from tweet element:', tweetEl);
  
  // First extract visible text (fallback)
  let visibleText = extractTweetText(tweetEl);
  console.log('Initial visible text length:', visibleText.length);
  
  const images = extractImages(tweetEl);
  const author = extractAuthor(tweetEl);
  const timestamp = extractTimestamp(tweetEl);

  // If we have no text, try alternative extraction methods
  if (!visibleText || visibleText.length < 10) {
    console.log('Trying alternative text extraction methods');
    
    // Try getting text from all divs with lang attribute
    const langDivs = tweetEl.querySelectorAll('div[lang]');
    for (const div of langDivs) {
      const text = div.textContent?.trim() || '';
      if (text.length > visibleText.length) {
        visibleText = text;
        console.log('Found longer text from lang div:', text.length);
      }
    }
    
    // Try getting text from article directly
    const articleText = tweetEl.textContent?.trim() || '';
    if (articleText.length > visibleText.length) {
      // Filter out common UI elements
      const filtered = articleText
        .replace(/\d+\s*(likes?|retweets?|replies?|views?|bookmarks?)/gi, '')
        .replace(/Replying to.*/gi, '')
        .replace(/Show this thread/gi, '')
        .trim();
      
      if (filtered.length > visibleText.length) {
        visibleText = filtered;
        console.log('Found longer text from article:', filtered.length);
      }
    }
  }

  // Try to expand "Show more" with timeout
  try {
    const expansionPromise = expandShowMore(tweetEl);
    const timeoutPromise = new Promise<boolean>((resolve) => 
      setTimeout(() => resolve(false), 2000)
    );
    
    await Promise.race([expansionPromise, timeoutPromise]);
    
    // After expansion, try to get more text
    const expandedText = extractTweetText(tweetEl);
    console.log('After expansion, text length:', expandedText.length);
    
    // Use expanded text if it's longer
    const finalText = expandedText.length > visibleText.length ? expandedText : visibleText;
    
    if (!finalText && images.length === 0) {
      console.warn('No text or images found in tweet');
      return null;
    }

    console.log('Returning data with text length:', finalText.length);
    return {
      text: finalText,
      imageUrls: images,
      sourceUrl: window.location.href,
      sourceType: 'twitter',
      metadata: {
        originalAuthor: author,
        platform: 'twitter',
        extractedAt: timestamp || new Date().toISOString(),
      },
    };
  } catch (err) {
    console.warn('Error in extractTwitterDataFromElement, using visible text:', err);
  }

  // Fallback: return visible data
  if (!visibleText && images.length === 0) {
    console.warn('No visible text or images found');
    return null;
  }

  console.log('Returning fallback data with text length:', visibleText.length);
  return {
    text: visibleText,
    imageUrls: images,
    sourceUrl: window.location.href,
    sourceType: 'twitter',
    metadata: {
      originalAuthor: author,
      platform: 'twitter',
      extractedAt: timestamp || new Date().toISOString(),
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
    fab.classList.add('loading');
    const originalText = fab.querySelector('span')?.textContent || 'Save Prompt';

    try {
      const data = await extractTwitterData();

      if (!data) {
        console.error('Could not extract data from tweet');
        fab.classList.remove('loading');
        fab.classList.add('error');
        const span = fab.querySelector('span');
        if (span) span.textContent = 'No data found';
        setTimeout(() => {
          fab.classList.remove('error');
          if (span) span.textContent = originalText;
        }, 2000);
        return;
      }

      // Send to background script
      chrome.runtime.sendMessage({
        type: 'SAVE_PROMPT',
        data,
      }, (response) => {
        fab.classList.remove('loading');

        if (chrome.runtime.lastError) {
          console.error('Extension error:', chrome.runtime.lastError);
          fab.classList.add('error');
          const span = fab.querySelector('span');
          if (span) span.textContent = 'Error';
          setTimeout(() => {
            fab.classList.remove('error');
            if (span) span.textContent = originalText;
          }, 2000);
          return;
        }

        if (response?.success) {
          fab.classList.add('success');
          const span = fab.querySelector('span');
          if (span) span.textContent = 'Saved! Click extension icon';
          setTimeout(() => {
            fab.classList.remove('success');
            if (span) span.textContent = originalText;
          }, 3000);
        } else {
          console.error('Failed to save:', response);
          fab.classList.add('error');
          const span = fab.querySelector('span');
          if (span) span.textContent = 'Failed';
          setTimeout(() => {
            fab.classList.remove('error');
            if (span) span.textContent = originalText;
          }, 2000);
        }
      });
    } catch (err) {
      console.error('Error extracting tweet:', err);
      fab.classList.remove('loading');
      fab.classList.add('error');
      const span = fab.querySelector('span');
      if (span) span.textContent = 'Error';
      setTimeout(() => {
        fab.classList.remove('error');
        if (span) span.textContent = originalText;
      }, 2000);
    }
  });

  return fab;
}

// Initialize Twitter content script
function init(): void {
  // Only run on status pages
  if (!isStatusPage()) {
    return;
  }

  // Check if FAB already exists
  if (document.getElementById('prompt-gallery-fab')) {
    return;
  }

  // Wait for content to load
  const checkContent = setInterval(() => {
    // Use sync version for initial detection (doesn't need full text expansion)
    const tweetText = extractTweetTextSync();
    const images = extractImages();

    // Only show FAB if it looks like AI art
    if ((tweetText && isAIArtTweet(tweetText)) || images.length > 0) {
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
  // Handle ping to check if content script is loaded
  if (message.type === 'PING') {
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'GET_SELECTION') {
    const selection = window.getSelection()?.toString() || '';
    sendResponse({ text: selection });
    return false;
  }

  if (message.type === 'EXTRACT_DATA') {
    // Handle async extraction
    extractTwitterData().then((data) => {
      sendResponse(data);
    }).catch((err) => {
      console.error('Error extracting data:', err);
      sendResponse(null);
    });
    return true; // Indicates async response
  }

  if (message.type === 'EXTRACT_POST_AT_CLICK') {
    // Handle async extraction
    (async () => {
      try {
        console.log('EXTRACT_POST_AT_CLICK received, lastRightClickedElement:', lastRightClickedElement);
        
        // Extract data from the tweet that was right-clicked
        let data: PendingPrompt | null = null;
        let tweetEl: Element | null = null;

        // Try to find the tweet element from the right-clicked element
        if (lastRightClickedElement) {
          tweetEl = findParentTweet(lastRightClickedElement);
          console.log('Found tweet element from right-click:', tweetEl);
          
          if (tweetEl) {
            // Extract from the specific tweet
            data = await extractTwitterDataFromElement(tweetEl);
            console.log('Extracted data from specific tweet:', data?.text?.substring(0, 100));
          }
        }

        // If no data from specific tweet, try to find the tweet under cursor or in viewport
        if (!data || !data.text) {
          // Try to find the tweet that's currently in view or most prominent
          const allTweets = document.querySelectorAll('article[data-testid="tweet"]');
          console.log('Found tweets on page:', allTweets.length);
          
          // If we have a right-clicked element, try to find the closest tweet
          if (lastRightClickedElement && allTweets.length > 0) {
            // Find the tweet that contains or is closest to the right-clicked element
            for (const tweet of allTweets) {
              if (tweet.contains(lastRightClickedElement) || lastRightClickedElement.closest('article') === tweet) {
                tweetEl = tweet;
                console.log('Found tweet containing right-clicked element');
                data = await extractTwitterDataFromElement(tweet);
                if (data && data.text) {
                  console.log('Successfully extracted from containing tweet');
                  break;
                }
              }
            }
          }
          
          // If still no data, try the first visible tweet (for feed pages)
          if ((!data || !data.text) && allTweets.length > 0) {
            // Get the first tweet that's in the viewport
            for (const tweet of allTweets) {
              const rect = tweet.getBoundingClientRect();
              if (rect.top >= 0 && rect.top < window.innerHeight) {
                tweetEl = tweet;
                console.log('Trying first visible tweet');
                data = await extractTwitterDataFromElement(tweet);
                if (data && data.text) {
                  console.log('Successfully extracted from visible tweet');
                  break;
                }
              }
            }
          }
          
          // Last fallback: try main tweet extraction
          if (!data || !data.text) {
            console.log('Falling back to main tweet extraction');
            data = await extractTwitterData();
            console.log('Main tweet extraction result:', data?.text?.substring(0, 100));
          }
        }

        // Always send a response, even if empty
        const finalData = data || {
          text: '',
          sourceUrl: window.location.href,
          sourceType: 'twitter' as const,
        };
        
        console.log('Sending response with text length:', finalData.text?.length || 0);
        sendResponse(finalData);
      } catch (err) {
        console.error('Error extracting post:', err);
        sendResponse({
          text: '',
          sourceUrl: window.location.href,
          sourceType: 'twitter' as const,
        });
      }
    })();
    return true; // Indicates async response
  }

  return false;
});

// Track right-clicks for context menu extraction
document.addEventListener('contextmenu', (e) => {
  lastRightClickedElement = e.target as Element;
  console.log('Right-click tracked on element:', lastRightClickedElement);
  
  // Also try to find the tweet element immediately to verify it's findable
  const tweetEl = findParentTweet(lastRightClickedElement);
  if (tweetEl) {
    console.log('Tweet element found from right-click:', tweetEl);
  } else {
    console.warn('Could not find tweet element from right-clicked element');
  }
}, true); // Use capture phase to catch all right-clicks

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
