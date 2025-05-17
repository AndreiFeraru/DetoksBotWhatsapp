# Detoks Bot WhatsApp

A WhatsApp bot that automatically downloads TikTok videos when users share TikTok links.

## Features

- 📱 Responds to TikTok links shared in WhatsApp chats
- 🎬 Downloads and sends TikTok videos as native WhatsApp media
- 🚀 Efficient queue management for handling multiple requests
- 🛡️ Rate limiting to prevent abuse
- 🧹 Automatic cleanup of downloaded videos
- 🔒 URL validation for security

## Requirements

- Node.js (v14+)
- TypeScript
- yt-dlp installed globally
- WhatsApp account for the bot

## Installation

1. Clone the repository:

```shgit clone https://github.com/yourusername/detoks-bot-whatsapp.git
cd detoks-bot-whatsapp
```

1. Install dependencies:

```sh
npm install
```

1. Install yt-dlp if not already installed:

```sh
pip install -U yt-dlp
```

1. Build the project:

```sh
npm run build
```

## Configuration

Create a `config.ts` file in the `src` directory with the following settings:

```js
export default {
    // Bot settings
    VIDEOS_PATH: "./videos",
    DEFAULT_VIDEO_TITLE: "TikTok_Video",

    // Rate limiting
    MAX_REQUESTS_PER_HOUR: 10,

    // File cleanup
    DELIVERY_DELETE_DELAY_MS: 5000, // Delay after delivery
    FAILSAFE_DELETE_DELAY_MS: 30000, // Maximum time to keep a file

    // Security
    VALID_TIKTOK_DOMAINS: [
        "vm.tiktok.com",
        "www.tiktok.com",
        "tiktok.com",
        "m.tiktok.com",
        "vt.tiktok.com"
    ]
};
```

## Usage

Run the bot in development mode:

```sh
npm run dev
```

Run in production:

```sh
npm start
```

On first run, scan the QR code with your WhatsApp to authenticate the bot.

## How It Works

1. The bot listens for messages containing TikTok URLs
1. When a valid URL is detected, it sends a download confirmation
1. It downloads the TikTok video using yt-dlp
1. The video is sent back to the user as a WhatsApp message
1. After successful delivery, the video file is deleted to save space

## Deployment

### Using PM2 (recommended)

Install PM2:

```sh
npm install -g pm2
```

Start the bot with PM2:

``` sh
pm2 start dist/index.js --name "detoks-bot-whatsapp"
```

Configure PM2 to start on boot:

```sh
pm2 startup
pm2 save
```

### Using Systemd

Create a systemd service file:

```sh
sudo nano /etc/systemd/system/detoks-bot.service
```

With the following content:

```conf
[Unit]
Description=Detoks WhatsApp Bot
After=network.target

[Service]
User=yourusername
WorkingDirectory=/path/to/detoks-bot-whatsapp
ExecStart=/usr/bin/node /path/to/detoks-bot-whatsapp/dist/index.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```sh
sudo systemctl daemon-reload
sudo systemctl enable detoks-bot.service
sudo systemctl start detoks-bot.service
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
