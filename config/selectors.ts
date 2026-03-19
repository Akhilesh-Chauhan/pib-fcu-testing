/**
 * UI Selectors Configuration
 * Update these selectors to match your actual chatbot DOM structure
 */

export interface ChatbotSelectors {
  chatbotIcon: string;
  chatInput: string;
  sendButton: string;
  fileUploadInput: string;
  resetButton: string;
  chatMessageContainer: string;
  responseContainer: string;
}

/**
 * IMPORTANT: Update these ID-based selectors to match your actual chatbot DOM structure
 * Use browser DevTools to inspect the DOM and find the correct element IDs
 */
export const SELECTORS: ChatbotSelectors = {
  // Chatbot icon/trigger button
  chatbotIcon: '#chat-toggle-button',
  
  // Chat input field (textarea or input)
  chatInput: '#chat-message-input',
  
  // Send button
  sendButton: '#chat-submit-button',
  
  // File upload input (hidden input type="file")
  fileUploadInput: 'input[type="file"]',
  
  // Reset chat button
  resetButton: '#chat-reset-button',
  
  // Chat messages container
  chatMessageContainer: '#chat-messages-container',
  
  // Response/bot message container (dynamic ID: chat-message-msg-{uniqueId})
  responseContainer: '[id^="chat-message-msg"]',
};

/**
 * Get a selector by key
 */
export function getSelector(key: keyof ChatbotSelectors): string {
  return SELECTORS[key];
}
