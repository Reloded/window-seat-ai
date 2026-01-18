import { Platform, Share } from 'react-native';

let Sharing = null;
let FileSystem = null;

if (Platform.OS !== 'web') {
  Sharing = require('expo-sharing');
  FileSystem = require('expo-file-system/legacy');
}

class ShareService {
  formatFlightPackText(pack) {
    const lines = [
      'Window Seat AI - Flight Narration',
      '',
      `Flight: ${pack.flightNumber}`,
    ];

    // Add route if available
    if (pack.origin && pack.destination) {
      const originText = pack.origin.name || pack.origin.code || 'Unknown';
      const destText = pack.destination.name || pack.destination.code || 'Unknown';
      lines.push(`Route: ${originText} → ${destText}`);
    }

    // Add download date
    if (pack.downloadedAt) {
      const date = new Date(pack.downloadedAt);
      const formatted = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      lines.push(`Downloaded: ${formatted}`);
    }

    lines.push('');

    // Add each checkpoint's narration
    if (pack.checkpoints && pack.checkpoints.length > 0) {
      for (const checkpoint of pack.checkpoints) {
        lines.push(`--- ${checkpoint.name || 'Checkpoint'} ---`);
        lines.push(checkpoint.narration || '(No narration available)');
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('Generated with Window Seat AI');

    return lines.join('\n');
  }

  async shareText(pack) {
    const text = this.formatFlightPackText(pack);
    const title = `${pack.flightNumber} Flight Narration`;

    try {
      await Share.share({
        message: text,
        title: title,
      });
      return { success: true };
    } catch (error) {
      console.error('Share failed:', error);
      return { success: false, error: error.message };
    }
  }

  async shareAsFile(pack) {
    if (Platform.OS === 'web' || !FileSystem || !Sharing) {
      return { success: false, error: 'File sharing not available on web' };
    }

    const text = this.formatFlightPackText(pack);
    const fileName = `${pack.flightNumber}_narration.txt`;
    const filePath = `${FileSystem.cacheDirectory}${fileName}`;

    try {
      // Write the text to a file
      await FileSystem.writeAsStringAsync(filePath, text);

      // Check if sharing is available
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        return { success: false, error: 'Sharing not available on this device' };
      }

      // Share the file
      await Sharing.shareAsync(filePath, {
        mimeType: 'text/plain',
        dialogTitle: `Share ${pack.flightNumber} Narration`,
        UTI: 'public.plain-text',
      });

      return { success: true };
    } catch (error) {
      console.error('File share failed:', error);
      return { success: false, error: error.message };
    }
  }

  downloadTextFile(pack) {
    if (Platform.OS !== 'web') {
      return { success: false, error: 'Download only available on web' };
    }

    const text = this.formatFlightPackText(pack);
    const fileName = `${pack.flightNumber}_narration.txt`;

    try {
      // Create a blob and trigger download
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Download failed:', error);
      return { success: false, error: error.message };
    }
  }

  async shareFlight(pack) {
    if (Platform.OS === 'web') {
      return this.downloadTextFile(pack);
    }

    // On native, use the text share first (more flexible)
    return this.shareText(pack);
  }
}

export const shareService = new ShareService();
export { ShareService };
