/**
 * Validates webhook URLs to prevent SSRF attacks
 * Only allows HTTPS URLs to external domains
 */
export function isValidWebhookUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'URL is required' };
  }

  try {
    const parsed = new URL(url);
    
    // Only allow HTTPS protocol
    if (parsed.protocol !== 'https:') {
      return { valid: false, error: 'Only HTTPS URLs are allowed' };
    }
    
    const hostname = parsed.hostname.toLowerCase();
    
    // Block localhost and common internal hostnames
    const blockedHostnames = ['localhost', '127.0.0.1', '0.0.0.0', '[::1]'];
    if (blockedHostnames.includes(hostname)) {
      return { valid: false, error: 'Internal hostnames are not allowed' };
    }
    
    // Block internal IP ranges
    const ipPatterns = [
      /^127\./, // 127.0.0.0/8 loopback
      /^10\./, // 10.0.0.0/8 private
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12 private
      /^192\.168\./, // 192.168.0.0/16 private
      /^0\./, // 0.0.0.0/8
      /^169\.254\./, // link-local
    ];
    
    for (const pattern of ipPatterns) {
      if (pattern.test(hostname)) {
        return { valid: false, error: 'Internal IP addresses are not allowed' };
      }
    }
    
    // Block IPv6 internal addresses
    if (hostname.startsWith('[fe80:') || hostname.startsWith('[fc00:') || hostname.startsWith('[fd00:')) {
      return { valid: false, error: 'Internal IPv6 addresses are not allowed' };
    }
    
    // Ensure URL has a valid path (not empty)
    if (!parsed.pathname || parsed.pathname === '') {
      parsed.pathname = '/';
    }
    
    return { valid: true };
  } catch (e) {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates and sanitizes a webhook URL
 * Returns the sanitized URL if valid, null otherwise
 */
export function sanitizeWebhookUrl(url: string): string | null {
  const result = isValidWebhookUrl(url);
  if (!result.valid) {
    return null;
  }
  
  try {
    const parsed = new URL(url);
    // Return normalized URL
    return parsed.toString();
  } catch {
    return null;
  }
}
