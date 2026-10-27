# LiveApp Expo Mobile App

This folder contains the **Expo React Native** mobile client for LiveApp. It provides a native mobile container with:

- **Hardware Accelerated Video & 3D WebGL Rendering** (for VAP 3D gifts and animations)
- **Live Video & Audio Permissions** granted directly to WebRTC / LiveKit
- **Automatic LAN Host Discovery** (`Constants.expoConfig.hostUri`) so testing on your phone via Expo Go works immediately without manual IP typing
- **Android Hardware Back Button Navigation**
- **Settings Modal** (tap the bottom-right gear ⚙ icon) to switch between:
  - Express Server (`http://<LAN_IP>:4000`)
  - Vite Dev Mode (`http://<LAN_IP>:5173`)
  - Remote Production URL (`https://your-domain.com`)

---

## Quick Start

### 1. Install dependencies
```bash
cd mobile
npm install
```

### 2. Start the Backend Server (Terminal 1)
From the root directory:
```bash
npm start
```
*(Runs on `http://localhost:4000`)*

### 3. Start Expo (Terminal 2)
From root:
```bash
npm run dev:expo
```
or inside `mobile/`:
```bash
npx expo start
```

### 4. Open on your Phone
1. Download **Expo Go** from Google Play Store or Apple App Store.
2. Ensure your phone is connected to the same Wi-Fi network as your computer.
3. Scan the QR code shown in your terminal.
4. The LiveApp loads instantly on your phone!
