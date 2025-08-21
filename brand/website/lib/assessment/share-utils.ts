// Share utility functions for assessment results

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      document.body.removeChild(textArea);
      return false;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

export function createShareableText(score: any, sessionId: string): string {
  const percentage = score?.percentage || 0;
  const level = score?.level || 'Assessment Complete';
  const percentile = score?.percentile || 'N/A';

  return `🎯 Candlefish Operational Maturity Assessment Results

Score: ${percentage}% (${level})
Industry Percentile: ${percentile}

Discover your operational maturity at candlefish.ai/assessment

#OperationalExcellence #BusinessAutomation #Candlefish`;
}

export function showShareDialog(score: any, sessionId: string) {
  const shareUrl = `${window.location.origin}/assessment/results/${sessionId}`;
  const shareText = createShareableText(score, sessionId);

  // Create a custom modal dialog
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const dialog = document.createElement('div');
  dialog.style.cssText = `
    background: white;
    border-radius: 12px;
    padding: 32px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
  `;

  dialog.innerHTML = `
    <h2 style="margin: 0 0 20px; color: #0D1B2A; font-size: 24px; font-weight: 300;">Share Your Results</h2>

    <div style="margin-bottom: 24px;">
      <button id="share-twitter" style="width: 100%; padding: 12px; margin-bottom: 12px; background: #1DA1F2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
        Share on Twitter
      </button>

      <button id="share-linkedin" style="width: 100%; padding: 12px; margin-bottom: 12px; background: #0077B5; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
        Share on LinkedIn
      </button>

      <button id="share-facebook" style="width: 100%; padding: 12px; margin-bottom: 12px; background: #1877F2; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
        Share on Facebook
      </button>

      <button id="share-email" style="width: 100%; padding: 12px; margin-bottom: 12px; background: #415A77; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
        Share via Email
      </button>
    </div>

    <div style="margin-bottom: 24px; padding: 16px; background: #F8F9FA; border-radius: 6px;">
      <label style="display: block; margin-bottom: 8px; color: #415A77; font-size: 14px;">Share URL:</label>
      <input id="share-url" type="text" value="${shareUrl}" readonly style="width: 100%; padding: 8px; border: 1px solid #E0E1DD; border-radius: 4px; font-size: 14px;">
      <button id="copy-url" style="margin-top: 8px; padding: 8px 16px; background: #3FD3C6; color: #0D1B2A; border: none; border-radius: 4px; cursor: pointer; font-size: 14px;">
        Copy Link
      </button>
    </div>

    <button id="close-share" style="width: 100%; padding: 12px; background: #E0E1DD; color: #0D1B2A; border: none; border-radius: 6px; cursor: pointer; font-size: 16px;">
      Close
    </button>
  `;

  modal.appendChild(dialog);
  document.body.appendChild(modal);

  // Add event listeners
  const closeModal = () => {
    document.body.removeChild(modal);
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  document.getElementById('close-share')?.addEventListener('click', closeModal);

  document.getElementById('copy-url')?.addEventListener('click', async () => {
    const input = document.getElementById('share-url') as HTMLInputElement;
    const success = await copyToClipboard(input.value);
    const button = document.getElementById('copy-url');
    if (button) {
      button.textContent = success ? 'Copied!' : 'Failed to copy';
      setTimeout(() => {
        button.textContent = 'Copy Link';
      }, 2000);
    }
  });

  document.getElementById('share-twitter')?.addEventListener('click', () => {
    const text = `I scored ${score?.percentage || 0}% on the Candlefish Operational Maturity Assessment!`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=450');
    closeModal();
  });

  document.getElementById('share-linkedin')?.addEventListener('click', () => {
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=450');
    closeModal();
  });

  document.getElementById('share-facebook')?.addEventListener('click', () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=550,height=450');
    closeModal();
  });

  document.getElementById('share-email')?.addEventListener('click', () => {
    const subject = 'My Candlefish Operational Maturity Assessment Results';
    const body = `${shareText}\n\nView my results: ${shareUrl}`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    closeModal();
  });
}

export function checkBrowserSupport(): { canDownload: boolean; canShare: boolean; issues: string[] } {
  const issues: string[] = [];

  const canDownload = !!(window.Blob && window.URL && window.URL.createObjectURL);
  if (!canDownload) {
    issues.push('File download not supported');
  }

  const canShare = !!(navigator.share || (navigator.clipboard && window.isSecureContext));
  if (!canShare && !navigator.share) {
    issues.push('Native sharing not supported (fallback available)');
  }

  return { canDownload, canShare, issues };
}
