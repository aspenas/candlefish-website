export function generateSessionId(): string {
  const timestamp = Date.now().toString(36)
  const randomPart = Math.random().toString(36).substring(2, 9)
  return `OMA-${timestamp}-${randomPart}`.toUpperCase()
}

export function trackAssessmentStart(sessionId: string): void {
  // In production, this would send to analytics
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem('assessment-session', sessionId)
    window.sessionStorage.setItem('assessment-start', Date.now().toString())

    // Track with any analytics service
    if ((window as any).gtag) {
      (window as any).gtag('event', 'assessment_started', {
        session_id: sessionId,
        timestamp: Date.now()
      })
    }
  }
}

export function trackAssessmentComplete(sessionId: string, score: any): void {
  if (typeof window !== 'undefined') {
    const startTime = window.sessionStorage.getItem('assessment-start')
    const duration = startTime ? Date.now() - parseInt(startTime) : 0

    if ((window as any).gtag) {
      (window as any).gtag('event', 'assessment_completed', {
        session_id: sessionId,
        level: score.level,
        percentage: score.percentage,
        duration: Math.round(duration / 1000),
        qualified: score.candlefishFit.qualified
      })
    }
  }
}

export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000)
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }
  return `${seconds}s`
}

export function downloadJSON(data: any, filename: string): void {
  try {
    // Check browser support
    if (!window.Blob || !window.URL || !window.URL.createObjectURL) {
      throw new Error('Your browser does not support file downloads');
    }

    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()

    // Cleanup
    setTimeout(() => {
      if (document.body.contains(a)) {
        document.body.removeChild(a)
      }
      URL.revokeObjectURL(url)
    }, 100)

    console.log('JSON download triggered successfully');

  } catch (error) {
    console.error('JSON download failed:', error);
    throw error;
  }
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const result = document.execCommand('copy');
      document.body.removeChild(textArea);
      return result;
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
}

export function createShareableText(score: any, sessionId: string): string {
  return `I just completed a Candlefish Operational Maturity Assessment!

📈 Overall Score: ${score.percentage || 0}%
🎖️ Level: ${score.level || 'Assessment Level'}
📊 Industry Percentile: ${score.percentile || 0}th

View full results: ${window.location.origin}/assessment/results/${sessionId}

#OperationalExcellence #BusinessTransformation #Candlefish`;
}

export function openSocialShare(platform: 'twitter' | 'linkedin' | 'facebook', text: string, url: string): boolean {
  let shareUrl: string;

  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  switch (platform) {
    case 'twitter':
      shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
      break;
    case 'linkedin':
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
      break;
    case 'facebook':
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
      break;
    default:
      return false;
  }

  const shareWindow = window.open(
    shareUrl,
    '_blank',
    'width=600,height=400,scrollbars=yes,resizable=yes'
  );

  return !!shareWindow;
}

export function showShareDialog(score: any, sessionId: string): void {
  const shareText = createShareableText(score, sessionId);
  const shareUrl = `${window.location.origin}/assessment/results/${sessionId}`;

  const choice = prompt(
    'Choose sharing method:\n' +
    '1. Copy to clipboard\n' +
    '2. Twitter\n' +
    '3. LinkedIn\n' +
    '4. Facebook\n' +
    '\nEnter 1, 2, 3, or 4:'
  );

  switch (choice) {
    case '1':
      copyToClipboard(shareText).then(success => {
        if (success) {
          alert('Results copied to clipboard! You can now paste and share them.');
        } else {
          prompt('Copy this text to share:', shareText);
        }
      });
      break;
    case '2':
      if (!openSocialShare('twitter', shareText, shareUrl)) {
        alert('Pop-up blocked. Please enable pop-ups and try again.');
      }
      break;
    case '3':
      if (!openSocialShare('linkedin', shareText, shareUrl)) {
        alert('Pop-up blocked. Please enable pop-ups and try again.');
      }
      break;
    case '4':
      if (!openSocialShare('facebook', shareText, shareUrl)) {
        alert('Pop-up blocked. Please enable pop-ups and try again.');
      }
      break;
    default:
      // Default to clipboard
      copyToClipboard(shareText).then(success => {
        if (success) {
          alert('Results copied to clipboard!');
        } else {
          prompt('Copy this text to share:', shareText);
        }
      });
  }
}
