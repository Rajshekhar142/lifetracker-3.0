export default function manifest() {
  return {
    name: "LifeTracker",
    short_name: "LifeTracker",
    description: "Your personal productivity OS",
    icons: [
      {
        src: "/web-app-manifest-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/web-app-manifest-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    theme_color: "#050508",
    background_color: "#050508",
    display: "standalone",
    start_url: "/mission",
    orientation: "portrait",
  };
}