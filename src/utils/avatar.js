export const getInitial = (name = "") => {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
};

export const getStoredAvatar = (id) => {
  if (!id) return null;
  return localStorage.getItem(`padel-avatar:${id}`);
};

export const cropAvatarImage = (source, zoom = 1, outputSize = 300) =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const minSide = Math.min(image.width, image.height);
      const cropSize = minSide / Math.max(zoom, 1);
      const sx = (image.width - cropSize) / 2;
      const sy = (image.height - cropSize) / 2;
      const canvas = document.createElement("canvas");
      canvas.width = outputSize;
      canvas.height = outputSize;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas not supported"));
        return;
      }
      ctx.drawImage(image, sx, sy, cropSize, cropSize, 0, 0, outputSize, outputSize);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    image.onerror = () => reject(new Error("Failed to load image"));
    image.src = source;
  });
