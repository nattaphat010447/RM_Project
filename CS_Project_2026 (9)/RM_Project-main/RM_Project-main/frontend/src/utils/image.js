const API_URL = import.meta.env.VITE_API_BASE_URL;

export const getImageUrl = (url) => {
  if (!url) return 'https://via.placeholder.com/150x220?text=No+Cover';

  if (url.startsWith('http')) return url;

  if (url.startsWith('/images/') || url.startsWith('images/')) {
    return url.startsWith('/') ? url : `/${url}`;
  }

  const baseUrl = API_URL ? API_URL.replace(/\/$/, '') : 'http://localhost:8000';

  if (url.startsWith('/media/') || url.startsWith('media/')) {
    const cleanPath = url.startsWith('/') ? url : `/${url}`;
    return `${baseUrl}${cleanPath}`;
  }

  return `${baseUrl}/media/${url}`;
};

export default getImageUrl;
