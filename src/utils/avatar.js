export const getInitial = (name = "") => {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed[0].toUpperCase();
};

export const getStoredAvatar = (id) => {
  if (!id) return null;
  return localStorage.getItem(`padel-avatar:${id}`);
};
