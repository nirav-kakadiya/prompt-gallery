import { setPendingPrompt } from '@/lib/storage';
import type { PendingPrompt, SourceType } from '@/types';

// Create context menu on extension install
chrome.runtime.onInstalled.addListener(() => {
  // Remove existing context menus first
  chrome.contextMenus.removeAll(() => {
    // Create context menu for text selection
    chrome.contextMenus.create({
      id: 'savePromptToGallery',
      title: 'Save "%s" to Prompt Gallery',
      contexts: ['selection'],
    });

    // Create context menu for images
    chrome.contextMenus.create({
      id: 'saveImagePrompt',
      title: 'Save image to Prompt Gallery',
      contexts: ['image'],
    });

    // Create context menu for saving entire post (Twitter/Reddit)
    chrome.contextMenus.create({
      id: 'savePostToGallery',
      title: 'Save post to Prompt Gallery',
      contexts: ['page', 'frame', 'link'],
      documentUrlPatterns: [
        '*://twitter.com/*',
        '*://x.com/*',
        '*://reddit.com/*',
        '*://www.reddit.com/*',
        '*://old.reddit.com/*',
      ],
    });

    console.log('Prompt Gallery extension installed');
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id) return;

  if (info.menuItemId === 'savePromptToGallery' && info.selectionText) {
    // Save selected text as pending prompt
    const pendingPrompt: PendingPrompt = {
      text: info.selectionText,
      sourceUrl: tab.url || '',
      sourceTitle: tab.title,
      sourceType: detectSourceType(tab.url || ''),
    };

    await setPendingPrompt(pendingPrompt);

    // Open popup
    chrome.action.openPopup();
  }

  if (info.menuItemId === 'saveImagePrompt' && info.srcUrl) {
    // Save image URL as pending prompt
    const pendingPrompt: PendingPrompt = {
      text: '',
      imageUrls: [info.srcUrl],
      sourceUrl: tab.url || '',
      sourceTitle: tab.title,
      sourceType: detectSourceType(tab.url || ''),
    };

    await setPendingPrompt(pendingPrompt);

    // Open popup
    chrome.action.openPopup();
  }

  if (info.menuItemId === 'savePostToGallery') {
    // Helper to check if content script is loaded
    const checkContentScriptLoaded = async (): Promise<boolean> => {
      return new Promise((resolve) => {
        try {
          // Send a ping message to check if content script is available
          chrome.tabs.sendMessage(tab.id!, { type: 'PING' }, (response) => {
            if (chrome.runtime.lastError) {
              resolve(false);
            } else {
              resolve(true);
            }
          });
        } catch {
          resolve(false);
        }
      });
    };

    // Helper to extract data using content script message
    const extractViaMessage = async (retries = 3, delay = 1000): Promise<PendingPrompt | null> => {
      // First check if content script is loaded
      const isLoaded = await checkContentScriptLoaded();
      if (!isLoaded && retries > 0) {
        console.log('Content script not loaded, waiting...');
        await new Promise(resolve => setTimeout(resolve, delay));
        return extractViaMessage(retries - 1, delay);
      }

      return new Promise((resolve) => {
        try {
          chrome.tabs.sendMessage(tab.id!, { type: 'EXTRACT_POST_AT_CLICK' }, (response) => {
            if (chrome.runtime.lastError) {
              const errorMessage = chrome.runtime.lastError.message || 'Unknown error';
              console.error('Error extracting post via message:', errorMessage);
              
              // Retry if we have retries left and it's a connection error
              if (retries > 0 && (errorMessage.includes('Could not establish connection') || 
                                  errorMessage.includes('Extension context invalidated'))) {
                console.log(`Retrying message... (${retries} attempts left)`);
                setTimeout(() => {
                  extractViaMessage(retries - 1, delay).then(resolve);
                }, delay);
                return;
              }
              
              resolve(null);
              return;
            }

            if (response && (response.text || response.imageUrls?.length > 0)) {
              resolve(response);
            } else {
              resolve(null);
            }
          });
        } catch (err) {
          console.error('Failed to send message:', err);
          if (retries > 0) {
            setTimeout(() => {
              extractViaMessage(retries - 1, delay).then(resolve);
            }, delay);
          } else {
            resolve(null);
          }
        }
      });
    };

    // Helper to extract data by injecting script directly (fallback)
    const extractViaScript = async (): Promise<PendingPrompt | null> => {
      try {
        const results = await chrome.scripting.executeScript({
          target: { tabId: tab.id! },
          func: () => {
            // Find main tweet
            const getMainTweet = (): Element | null => {
              const articles = document.querySelectorAll('article[data-testid="tweet"]');
              if (articles.length > 0) {
                const isStatusPage = /\/(status|tweet)\/\d+/.test(window.location.pathname);
                if (isStatusPage) {
                  return articles[0];
                }
                for (const article of articles) {
                  const rect = article.getBoundingClientRect();
                  if (rect.top >= 0 && rect.top < window.innerHeight * 0.5) {
                    return article;
                  }
                }
                return articles[0];
              }
              return document.querySelector('article[data-testid="tweet"]') || 
                     document.querySelector('article');
            };

            // Try to expand "Show more"
            const expandShowMore = (tweetEl: Element): boolean => {
              try {
                const tweetTextEl = tweetEl.querySelector('[data-testid="tweetText"]');
                if (!tweetTextEl) return false;

                // Check for official show more button
                const showMoreBtn = tweetEl.querySelector('[data-testid="tweet-text-show-more-link"]');
                if (showMoreBtn) {
                  (showMoreBtn as HTMLElement).click();
                  return true;
                }

                // Check for "Show more" text in spans
                const allSpans = tweetTextEl.querySelectorAll('span');
                for (const span of allSpans) {
                  const text = span.textContent?.trim().toLowerCase() || '';
                  if (text === 'show more' || text === 'see more') {
                    (span as HTMLElement).click();
                    return true;
                  }
                }
                return false;
              } catch {
                return false;
              }
            };

            // Extract text
            const extractText = (el: Element | null): string => {
              if (!el) return '';
              
              // Try primary selector
              const textEl = el.querySelector('[data-testid="tweetText"]');
              if (textEl?.textContent) {
                return textEl.textContent.trim();
              }
              
              // Try lang attribute
              const langEl = el.querySelector('div[lang]');
              if (langEl?.textContent) {
                return langEl.textContent.trim();
              }
              
              // Fallback: get all text and filter metadata
              const allText = el.textContent || '';
              return allText
                .replace(/\d+\s*(likes?|retweets?|replies?|views?|bookmarks?)/gi, '')
                .replace(/Replying to.*/gi, '')
                .replace(/Show this thread/gi, '')
                .trim();
            };

            // Extract images
            const extractImages = (el: Element | null): string[] => {
              if (!el) return [];
              const images: string[] = [];
              const photos = el.querySelectorAll('[data-testid="tweetPhoto"] img');
              photos.forEach((img: HTMLImageElement) => {
                let src = img.src;
                if (src && src.includes('twimg.com')) {
                  src = src.replace(/&name=\w+/, '&name=large').replace(/\?name=\w+/, '?name=large');
                  if (!src.includes('name=')) {
                    src = src.includes('?') ? `${src}&name=large` : `${src}?name=large`;
                  }
                  if (!images.includes(src)) images.push(src);
                }
              });
              return images;
            };

            const tweetEl = getMainTweet();
            if (!tweetEl) return null;

            // Try to expand "Show more" and wait a bit
            expandShowMore(tweetEl);
            
            // Wait for expansion (we can't use async in executeScript, so we'll extract immediately)
            // The expansion might not complete, but we'll get what we can
            
            const text = extractText(tweetEl);
            const images = extractImages(tweetEl);

            return {
              text: text,
              imageUrls: images,
              sourceUrl: window.location.href,
              sourceType: 'twitter',
            };
          },
        });

        if (results && results[0]?.result) {
          return results[0].result as PendingPrompt;
        }
        return null;
      } catch (err) {
        console.error('Failed to extract via script injection:', err);
        return null;
      }
    };

    // Main extraction logic
    (async () => {
      // First, try to use content script message (faster, has full functionality)
      let data = await extractViaMessage(2, 500);
      
      // If that fails, try script injection as fallback
      if (!data || !data.text) {
        console.log('Content script not available, trying script injection...');
        data = await extractViaScript();
      }

      // If we have data, save it
      if (data && (data.text || data.imageUrls?.length > 0)) {
        await setPendingPrompt(data);
        chrome.action.openPopup();
      } else {
        // Final fallback: create empty prompt
        console.log('No data extracted, creating empty prompt');
        const fallbackPrompt: PendingPrompt = {
          text: '',
          sourceUrl: tab.url || '',
          sourceTitle: tab.title,
          sourceType: detectSourceType(tab.url || ''),
        };
        await setPendingPrompt(fallbackPrompt);
        chrome.action.openPopup();
      }
    })();
  }
});

// Handle messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Validate message structure
  if (!message || typeof message !== 'object' || !message.type) {
    sendResponse({ success: false, error: 'Invalid message format' });
    return false;
  }

  if (message.type === 'SAVE_PROMPT') {
    // Validate data exists and has required fields
    if (!message.data || typeof message.data !== 'object') {
      sendResponse({ success: false, error: 'Missing prompt data' });
      return false;
    }
    if (typeof message.data.sourceUrl !== 'string') {
      sendResponse({ success: false, error: 'Invalid sourceUrl' });
      return false;
    }

    // Handle async save
    (async () => {
      try {
        await setPendingPrompt(message.data);
        sendResponse({ success: true });
      } catch (error) {
        console.error('handleSavePrompt error:', error);
        sendResponse({ success: false, error: 'Failed to save prompt' });
      }
    })();

    return true; // Keep message channel open for async response
  }

  if (message.type === 'OPEN_POPUP') {
    // Note: openPopup only works from user gesture context
    chrome.action.openPopup().catch((err) => {
      console.log('Could not open popup (this is normal):', err);
    });
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'GET_TAB_INFO') {
    if (sender.tab) {
      sendResponse({
        url: sender.tab.url,
        title: sender.tab.title,
      });
    } else {
      sendResponse({ url: '', title: '' });
    }
    return false;
  }

  return false;
});

// Detect source type from URL
function detectSourceType(url: string): SourceType {
  if (url.includes('reddit.com')) return 'reddit';
  if (url.includes('twitter.com') || url.includes('x.com')) return 'twitter';
  return 'selection';
}

// Handle keyboard shortcuts
chrome.commands?.onCommand.addListener((command) => {
  if (command === 'save-prompt') {
    // Get selected text from active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_SELECTION' }, async (response) => {
          // Check for errors
          if (chrome.runtime.lastError) {
            console.error('Error getting selection:', chrome.runtime.lastError.message);
            // Fallback: try to get selected text from the page directly
            // For now, just create an empty prompt
            const fallbackPrompt: PendingPrompt = {
              text: '',
              sourceUrl: tabs[0].url || '',
              sourceTitle: tabs[0].title,
              sourceType: detectSourceType(tabs[0].url || ''),
            };
            await setPendingPrompt(fallbackPrompt);
            chrome.action.openPopup();
            return;
          }

          if (response?.text) {
            const pendingPrompt: PendingPrompt = {
              text: response.text,
              sourceUrl: tabs[0].url || '',
              sourceTitle: tabs[0].title,
              sourceType: detectSourceType(tabs[0].url || ''),
            };
            await setPendingPrompt(pendingPrompt);
            chrome.action.openPopup();
          }
        });
      }
    });
  }
});

export {};
