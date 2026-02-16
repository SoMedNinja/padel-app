export const getInitial = (name: string = "") => {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
};

let _canUseStorage: boolean | null = null;
const canUseStorage = () => {
  if (_canUseStorage !== null) return _canUseStorage;
  if (typeof localStorage === "undefined") {
    _canUseStorage = false;
    return false;
  }
  try {
    const testKey = "__padel_storage_test__";
    localStorage.setItem(testKey, "ok");
    localStorage.removeItem(testKey);
    _canUseStorage = true;
  } catch {
    _canUseStorage = false;
  }
  return _canUseStorage;
};

export const getStoredAvatar = (id: string | null | undefined) => {
  if (!id || !canUseStorage()) return null;
  try {
    return localStorage.getItem(`padel-avatar:${id}`);
  } catch {
    return null;
  }
};

export const setStoredAvatar = (id: string | null | undefined, value: string) => {
  if (!id || !canUseStorage()) return false;
  try {
    localStorage.setItem(`padel-avatar:${id}`, value);
    return true;
  } catch {
    return false;
  }
};

export const removeStoredAvatar = (id: string | null | undefined) => {
  if (!id || !canUseStorage()) return false;
  try {
    localStorage.removeItem(`padel-avatar:${id}`);
    return true;
  } catch {
    return false;
  }
};

export const cropAvatarImage = (source: string, zoom = 1, outputSize = 300): Promise<string> =>
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
