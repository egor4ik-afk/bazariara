/** Видео или картинка — по расширению URL. Общее для витрины и админки. */
export function isVideoUrl(url: string | null | undefined): boolean {
  return !!url && /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}
