// generate-qrcodes.js
// Script to generate QR codes for the teleprompter app
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
const os = require('os');

// QR code directory
const QR_DIR = path.join(__dirname, 'public', 'qr');

// Delete existing QR codes
function cleanQrDirectory() {
  if (fs.existsSync(QR_DIR)) {
    console.log('Cleaning existing QR codes...');
    const files = fs.readdirSync(QR_DIR);
    files.forEach(file => {
      if (file.endsWith('.png')) {
        fs.unlinkSync(path.join(QR_DIR, file));
        console.log(`  Deleted ${file}`);
      }
    });
  } else {
    console.log('Creating QR code directory...');
    fs.mkdirSync(QR_DIR, { recursive: true });
  }
}

// Function to get the local network IP addresses
function getLocalIpAddresses() {
  const networkInterfaces = os.networkInterfaces();
  const addresses = [];
  let primaryIp = 'localhost';
  
  // Collect all non-internal IPv4 addresses
  for (const name of Object.keys(networkInterfaces)) {
    for (const net of networkInterfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
        
        // Prefer non-localhost addresses over localhost
        if (net.address !== '127.0.0.1' && primaryIp === 'localhost') {
          primaryIp = net.address;
        }
        
        // Prefer addresses that start with 192.168 (common home network)
        if (net.address.startsWith('192.168.')) {
          primaryIp = net.address;
        }
      }
    }
  }
  
  return { addresses, primaryIp };
}

// Generate a QR code file
async function generateQrCode(text, filename) {
  const filePath = path.join(QR_DIR, filename);
  
  try {
    await QRCode.toFile(filePath, text, {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
    
    console.log(`Generated QR code for ${text} at ${filePath}`);
    return true;
  } catch (err) {
    console.error(`Error generating QR code: ${err.message}`);
    return false;
  }
}

// Main function to generate all QR codes
async function generateAllQrCodes() {
  // Clean up existing QR codes
  cleanQrDirectory();
  
  // Get IP address
  const { primaryIp } = getLocalIpAddresses();
  console.log(`Using primary IP address: ${primaryIp}`);
  
  // Define the port (use environment variable or default)
  const port = process.env.PORT || 3000;
  
  // Generate QR codes for different paths
  const paths = [
    { path: '/viewer', name: 'viewer' },
    { path: '/remote', name: 'remote' }
  ];
  
  for (const { path, name } of paths) {
    // Generate URL with IP address
    const url = `http://${primaryIp}:${port}${path}`;
    
    // Generate QR code
    await generateQrCode(url, `qr-${name}.png`);
    
    // Also save a text file with the URL
    fs.writeFileSync(path.join(QR_DIR, `url-${name}.txt`), url);
    console.log(`Saved URL to ${path.join(QR_DIR, `url-${name}.txt`)}`);
  }
  
  console.log('QR code generation complete!');
}

// Run the code generation
generateAllQrCodes().catch(err => {
  console.error('Error generating QR codes:', err);
  process.exit(1);
});