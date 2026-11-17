/** fetch cho khu soạn bài: hết phiên (401) thì chuyển tới trang đăng nhập rồi quay lại đúng trang. */
export async function adminFetch(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (res.status === 401) location.assign(`/admin/login?next=${encodeURIComponent(location.pathname)}`);
  return res;
}
