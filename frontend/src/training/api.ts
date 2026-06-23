// Resolve API paths against the credential-free origin. When the app is served
// behind a tunnel whose URL carries userinfo (https://user:pass@host), the
// browser refuses to build a fetch Request from a URL that includes credentials
// — relative paths inherit those credentials from the document base URL.
// window.location.origin is scheme+host+port only, so it never includes them.
export const apiUrl = (path: string): string => `${window.location.origin}${path}`
