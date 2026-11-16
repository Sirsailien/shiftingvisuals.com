// YouTube thumbnails, fetched straight from YouTube.
// maxresdefault = 1280×720, mqdefault = 320×180 (both 16:9, no black bars).
export const ytThumb = (id: string, quality: 'maxresdefault' | 'hqdefault' | 'mqdefault' = 'maxresdefault') =>
  `https://img.youtube.com/vi/${id}/${quality}.jpg`;
