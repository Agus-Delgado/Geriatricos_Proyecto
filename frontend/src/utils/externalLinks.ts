/**
 * Helper function to safely open external links
 * Opens link in new tab with security attributes
 */
export function openExternal(url: string): void {
  if (!url || typeof url !== 'string') {
    console.error('openExternal: Invalid URL provided');
    return;
  }

  // Validate URL format
  try {
    new URL(url);
  } catch {
    console.error('openExternal: Invalid URL format', url);
    return;
  }

  // Try to open in new window with security attributes
  try {
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    
    // Fallback: if window.open fails (popup blocked), try location.href
    if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
      // Popup was blocked, fallback to direct navigation
      window.location.href = url;
    }
  } catch (error) {
    // Last resort: use location.href
    console.error('openExternal: Error opening window', error);
    window.location.href = url;
  }
}