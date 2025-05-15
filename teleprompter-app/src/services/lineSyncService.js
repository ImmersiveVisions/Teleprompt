// src/services/lineSyncService.js
import { sendControlMessage } from './websocket';

/**
 * Service for synchronizing line counts and positions between devices
 */
class LineSyncService {
  constructor() {
    this.enabled = false;
    this.targetLineCount = 20;
    this.isMaster = false;
    this.remoteDevices = [];
    this.localDeviceInfo = {
      deviceId: this.generateDeviceId(),
      deviceType: 'unknown',
      totalLines: 0,
      visibleLines: 0,
      firstVisibleLine: 1,
      lastVisibleLine: 1,
      fontSize: 24,
      viewportWidth: 0,
      viewportHeight: 0
    };
  }

  /**
   * Generate a unique device ID
   * @returns {string} Unique device ID
   */
  generateDeviceId() {
    return `device_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
  }

  /**
   * Initialize the line sync service
   * @param {Object} options Configuration options
   * @param {boolean} options.enabled Whether sync is enabled
   * @param {number} options.targetLineCount Target line count to maintain
   * @param {boolean} options.isMaster Whether this device is the master
   * @param {string} options.deviceType Type of device (admin, viewer, remote)
   */
  initialize({ enabled = true, targetLineCount = 20, isMaster = false, deviceType = 'unknown' }) {
    this.enabled = enabled;
    this.targetLineCount = targetLineCount;
    this.isMaster = isMaster;
    this.localDeviceInfo.deviceType = deviceType;
    
    // Update viewport dimensions
    this.updateViewportDimensions();
    
    // Set up resize listener
    window.addEventListener('resize', this.handleResize.bind(this));
    
    console.log(`Line sync service initialized:`, {
      enabled,
      targetLineCount,
      isMaster,
      deviceType,
      deviceId: this.localDeviceInfo.deviceId
    });
    
    // Broadcast initial device info
    if (this.enabled) {
      this.broadcastDeviceInfo();
    }
  }

  /**
   * Handle resize events
   */
  handleResize() {
    if (!this.enabled) return;
    
    // Debounce resize events
    if (window.lineSyncResizeTimeout) {
      clearTimeout(window.lineSyncResizeTimeout);
    }
    
    window.lineSyncResizeTimeout = setTimeout(() => {
      this.updateViewportDimensions();
      this.broadcastDeviceInfo();
    }, 300);
  }

  /**
   * Update viewport dimensions
   */
  updateViewportDimensions() {
    this.localDeviceInfo.viewportWidth = window.innerWidth;
    this.localDeviceInfo.viewportHeight = window.innerHeight;
  }

  /**
   * Update local line information
   * @param {Object} lineInfo Line information
   * @param {number} lineInfo.totalLines Total number of lines
   * @param {number} lineInfo.visibleLines Number of visible lines
   * @param {number} lineInfo.firstVisibleLine First visible line number
   * @param {number} lineInfo.lastVisibleLine Last visible line number
   * @param {number} lineInfo.fontSize Current font size
   */
  updateLineInfo({ totalLines, visibleLines, firstVisibleLine, lastVisibleLine, fontSize }) {
    if (!this.enabled) return;
    
    this.localDeviceInfo.totalLines = totalLines;
    this.localDeviceInfo.visibleLines = visibleLines;
    this.localDeviceInfo.firstVisibleLine = firstVisibleLine;
    this.localDeviceInfo.lastVisibleLine = lastVisibleLine;
    
    if (fontSize) {
      this.localDeviceInfo.fontSize = fontSize;
    }
    
    // Broadcast updated info
    this.broadcastDeviceInfo();
  }

  /**
   * Broadcast device information to other connected devices
   */
  broadcastDeviceInfo() {
    if (!this.enabled) return;
    
    sendControlMessage('LINE_SYNC_INFO', {
      deviceInfo: this.localDeviceInfo,
      isMaster: this.isMaster
    });
  }

  /**
   * Handle incoming line sync information from other devices
   * @param {Object} message Line sync message
   * @param {Object} message.deviceInfo Device information
   * @param {boolean} message.isMaster Whether the sending device is the master
   */
  handleLineSyncMessage(message) {
    if (!this.enabled || !message || !message.deviceInfo) return;
    
    const { deviceInfo, isMaster } = message;
    
    // Update device info or add to the list
    const existingDeviceIndex = this.remoteDevices.findIndex(
      device => device.deviceId === deviceInfo.deviceId
    );
    
    if (existingDeviceIndex !== -1) {
      this.remoteDevices[existingDeviceIndex] = deviceInfo;
    } else {
      this.remoteDevices.push(deviceInfo);
    }
    
    // If this is the master and we're not, use its line information
    if (isMaster && !this.isMaster) {
      this.handleMasterUpdate(deviceInfo);
    }
    
    // Clean up old devices (keep for 30 seconds)
    this.cleanupInactiveDevices();
  }

  /**
   * Handle updates from master device
   * @param {Object} masterInfo Master device information
   */
  handleMasterUpdate(masterInfo) {
    // Calculate how many lines we need to adjust for synchronization
    const lineDifference = this.calculateLineDifference(masterInfo);
    
    // Dispatch event for line sync
    window.dispatchEvent(new CustomEvent('lineSyncAdjust', {
      detail: {
        masterInfo,
        lineDifference,
        syncToLine: masterInfo.firstVisibleLine,
        action: lineDifference !== 0 ? 'adjust' : 'maintain'
      }
    }));
  }

  /**
   * Calculate difference in visible lines between local and master
   * @param {Object} masterInfo Master device information
   * @returns {number} Line difference
   */
  calculateLineDifference(masterInfo) {
    const localVisible = this.localDeviceInfo.visibleLines;
    const masterVisible = masterInfo.visibleLines;
    
    return masterVisible - localVisible;
  }

  /**
   * Clean up inactive devices
   */
  cleanupInactiveDevices() {
    const now = Date.now();
    const timeout = 30000; // 30 seconds
    
    this.remoteDevices = this.remoteDevices.filter(device => {
      // Keep devices updated in the last 30 seconds
      const lastUpdate = device.lastUpdate || 0;
      return (now - lastUpdate) < timeout;
    });
  }

  /**
   * Get current device information
   * @returns {Object} Device information
   */
  getDeviceInfo() {
    return {
      local: this.localDeviceInfo,
      remote: this.remoteDevices,
      isMaster: this.isMaster,
      enabled: this.enabled,
      targetLineCount: this.targetLineCount
    };
  }

  /**
   * Set master status
   * @param {boolean} isMaster Whether this device should be the master
   */
  setMaster(isMaster) {
    this.isMaster = isMaster;
    this.broadcastDeviceInfo();
  }

  /**
   * Enable or disable line synchronization
   * @param {boolean} enabled Whether sync is enabled
   */
  setEnabled(enabled) {
    this.enabled = enabled;
    
    if (enabled) {
      this.broadcastDeviceInfo();
    }
  }

  /**
   * Clean up event listeners
   */
  cleanup() {
    window.removeEventListener('resize', this.handleResize);
    
    if (window.lineSyncResizeTimeout) {
      clearTimeout(window.lineSyncResizeTimeout);
    }
  }
}

// Create and export a singleton instance
const lineSyncService = new LineSyncService();
export default lineSyncService;