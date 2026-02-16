import { Area } from "react-easy-crop";

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

const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.setAttribute("crossOrigin", "anonymous");
    image.src = url;
  });

export const getCroppedImg = async (imageSrc: string, pixelCrop: Area): Promise<string> => {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) return "";

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return canvas.toDataURL("image/jpeg");
};
