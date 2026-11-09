# 🎬 CineTogether

Dosto ke saath ek hi movie, ek hi time par dekhne ki website. Features: movie grid aur search, synced play/pause/seek, group voice chat, text chat, aur screen share (mirror).

## Chalane ka tareeka (apne computer par)

1. Node.js (version 18 ya usse naya) install karo: https://nodejs.org
2. Is folder me terminal kholo aur ye chalao:

       npm install
       npm start

3. Browser me kholo: http://localhost:3000

## Dosto ke saath use karne ke liye (zaroori)

Mic aur screen share browser me sirf **HTTPS** par (ya localhost par) chalte hain. Dosto ko internet se judne ke liye in me se ek tareeka lo:

- **Online deploy (best):** project ko GitHub par daalo aur Render, Railway ya Fly.io par Node app ki tarah deploy karo.
  Build command: `npm install`, start command: `npm start`. Aapko HTTPS link mil jayega, wahi dosto ko bhejo.
- **Temporary tunnel:** server chalate hue dusre terminal me `npx cloudflared tunnel --url http://localhost:3000` (ya ngrok) chalao. Jo https link mile wo dosto ko bhejo.

## Kaise dekhein

1. Sab dost link kholte hain, movie player page par side panel me naam aur **same room code** likhte hain.
2. Koi ek dost "Movie add karo" se apni device ki movie file chunta hai. Baaki dosto ke grid me movie aa jati hai.
3. Har dost apni device se wahi file chunta hai. File kahin upload nahi hoti. Sirf play/pause/seek sync hota hai.
4. Voice ke liye "Voice chalu karo", chat neeche hai.
5. Screen share: laptop par Chrome/Edge me "Screen share karo" dabao, tab chuno aur "Share tab audio" tick karo.

## Dhyan me rakho

- Sirf wahi movies/videos use karo jo dekhne ka aapko haq hai (apni files, ya jahan share karne ki ijazat ho). Netflix, Prime jaise DRM wale platforms screen share me kaala dikhate hain.
- Voice aur screen share dosto ke browsers ke beech direct (WebRTC) chalte hain. Bahut strict network (kuch college/office WiFi) par connect nahi ho sakta. Uske liye TURN server chahiye: `public/app.js` me `iceServers` list me apna TURN add karo.
- Browser sab formats nahi chalata. MP4 (H.264) sabse safe hai.
- Ek room me maximum 12 log (`server.js` me `MAX_PER_ROOM`).
- Screen share me har dost ke liye alag stream jaati hai, to 3-4 dost tak theek rahega.

## Folder

    server.js          Node server (files dena + WebSocket rooms)
    public/index.html  Page
    public/style.css   Dark theme
    public/room.js     Server se realtime connection
    public/app.js      Player, sync, voice, chat, screen share
