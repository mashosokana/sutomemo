// src/utils/fetcher.ts
export const fetcher = (url: string) =>
  fetch(url, {
    headers: {
      Authorization: 'Bearer ' + localStorage.getItem('token'),
    },
  }).then((r) => {
    if (!r.ok) throw r.json();
    return r.json();
  });