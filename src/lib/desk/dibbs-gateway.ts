import http from "node:http";
import https from "node:https";
import type { DibbsGateway, FetchedSolicitation, IndexFile } from "./gateway.ts";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const RECENT_RFQS_URL = "https://www.dibbs.bsm.dla.mil/Rfq/RfqDates.aspx?category=recent";

type Fetched = {
  url: string;
  bytes: Uint8Array;
  contentType: string;
};

class CookieJar {
  private readonly byHost = new Map<string, Map<string, string>>();

  store(url: string, setCookies: string[]): void {
    const host = new URL(url).host;
    const jar = this.byHost.get(host) ?? new Map<string, string>();
    for (const raw of setCookies) {
      const pair = raw.split(";")[0] ?? "";
      const separator = pair.indexOf("=");
      if (separator <= 0) continue;
      jar.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim());
    }
    this.byHost.set(host, jar);
  }

  header(url: string): string | null {
    const jar = this.byHost.get(new URL(url).host);
    if (!jar || jar.size === 0) return null;
    return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, digits: string) => String.fromCharCode(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
}

function attribute(tag: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(tag);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? "";
}

function decodeText(bytes: Uint8Array, contentType: string): string {
  const charset = /charset=([^;]+)/i.exec(contentType)?.[1]?.trim().replace(/"/g, "").toLowerCase();
  if (charset && charset !== "utf-8" && charset !== "utf8") {
    try {
      return new TextDecoder(charset).decode(bytes);
    } catch {
      return new TextDecoder("latin1").decode(bytes);
    }
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function isPdf(bytes: Uint8Array, contentType: string): boolean {
  if (contentType.toLowerCase().includes("pdf")) return true;
  return bytes.length >= 4 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
}

function needsConsent(fetched: Fetched): boolean {
  if (isPdf(fetched.bytes, fetched.contentType)) return false;
  const head = new TextDecoder("latin1").decode(fetched.bytes.subarray(0, Math.min(fetched.bytes.length, 20000))).toLowerCase();
  return head.includes("butagree") || head.includes("dodwarning");
}

function consentForm(html: string, pageUrl: string): { action: string; body: string } {
  const forms = html.match(/<form\b[\s\S]*?<\/form>/gi) ?? [];
  const form = forms.find((candidate) => /butagree/i.test(candidate)) ?? forms[0];
  if (!form) throw new Error("DIBBS consent page did not include a form.");
  const actionMatch = /<form\b[^>]*\baction\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i.exec(form);
  const actionRaw = decodeHtml(actionMatch?.[1] ?? actionMatch?.[2] ?? actionMatch?.[3] ?? "");
  const action = new URL(actionRaw || ".", pageUrl).href;
  const params = new URLSearchParams();
  for (const tag of form.match(/<input\b[^>]*>/gi) ?? []) {
    const name = attribute(tag, "name");
    if (!name) continue;
    const type = (attribute(tag, "type") ?? "").toLowerCase();
    if ((type === "submit" || type === "button" || type === "image") && name.toLowerCase() !== "butagree") continue;
    params.append(name, decodeHtml(attribute(tag, "value") ?? ""));
  }
  for (const tag of form.match(/<textarea\b[^>]*>[\s\S]*?<\/textarea>/gi) ?? []) {
    const name = attribute(tag, "name");
    if (!name) continue;
    const value = /<textarea\b[^>]*>([\s\S]*?)<\/textarea>/i.exec(tag)?.[1] ?? "";
    params.append(name, decodeHtml(value));
  }
  params.set("butAgree", "OK");
  return { action, body: params.toString() };
}

function rawRequest(
  jar: CookieJar,
  urlString: string,
  method: "GET" | "POST",
  body?: string,
): Promise<Fetched & { status: number; location: string | null }> {
  const url = new URL(urlString);
  const transport = url.protocol === "http:" ? http : https;
  const headers: Record<string, string | number> = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,application/pdf,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };
  const cookie = jar.header(urlString);
  if (cookie) headers.Cookie = cookie;
  if (method === "POST" && body !== undefined) {
    headers["Content-Type"] = "application/x-www-form-urlencoded";
    headers["Content-Length"] = Buffer.byteLength(body);
  }
  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === "http:" ? 80 : 443),
        path: `${url.pathname}${url.search}`,
        method,
        headers,
        timeout: 60000,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          const setCookie = res.headers["set-cookie"] ?? [];
          jar.store(urlString, Array.isArray(setCookie) ? setCookie : [setCookie]);
          const contentTypeHeader = res.headers["content-type"];
          const locationHeader = res.headers.location;
          resolve({
            status: res.statusCode ?? 0,
            url: urlString,
            bytes: new Uint8Array(Buffer.concat(chunks)),
            contentType: typeof contentTypeHeader === "string" ? contentTypeHeader : "",
            location: typeof locationHeader === "string" ? locationHeader : null,
          });
        });
      },
    );
    req.on("error", reject);
    req.on("timeout", () => req.destroy(new Error(`DIBBS timed out requesting ${urlString}.`)));
    if (method === "POST" && body !== undefined) req.write(body);
    req.end();
  });
}

async function request(jar: CookieJar, url: string, method: "GET" | "POST", body?: string): Promise<Fetched> {
  let current = url;
  let currentMethod = method;
  let currentBody = body;
  for (let hop = 0; hop < 8; hop += 1) {
    const response = await rawRequest(jar, current, currentMethod, currentBody);
    if (response.status >= 300 && response.status < 400) {
      if (!response.location) throw new Error(`DIBBS redirected without a location from ${current}.`);
      const next = new URL(response.location, current).href;
      if (response.status === 301 || response.status === 302 || response.status === 303) {
        currentMethod = "GET";
        currentBody = undefined;
      }
      current = next;
      continue;
    }
    if (response.status < 200 || response.status >= 300) {
      throw new Error(`DIBBS returned ${response.status} for ${current}.`);
    }
    const head = new TextDecoder("latin1").decode(response.bytes.subarray(0, 180)).toLowerCase();
    if (head.includes("request rejected")) {
      throw new Error(`DIBBS rejected the request for ${current}.`);
    }
    return { url: current, bytes: response.bytes, contentType: response.contentType };
  }
  throw new Error(`DIBBS redirected too many times from ${url}.`);
}

async function getWithConsent(jar: CookieJar, url: string): Promise<Fetched> {
  let fetched = await request(jar, url, "GET");
  if (!needsConsent(fetched)) return fetched;
  const form = consentForm(decodeText(fetched.bytes, fetched.contentType), fetched.url);
  await request(jar, form.action, "POST", form.body);
  fetched = await request(jar, url, "GET");
  if (needsConsent(fetched)) throw new Error(`DIBBS consent was not accepted for ${url}.`);
  return fetched;
}

function linkedUrls(html: string, pageUrl: string, accept: (url: URL) => boolean): string[] {
  const found: string[] = [];
  const seen = new Set<string>();
  const pattern = /href\s*=\s*(?:"([^"]+)"|'([^']+)')/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html))) {
    const raw = decodeHtml(match[1] ?? match[2] ?? "");
    if (!raw || raw.toLowerCase().includes(".zip")) continue;
    let url: URL;
    try {
      url = new URL(raw, pageUrl);
    } catch {
      continue;
    }
    if (!accept(url) || seen.has(url.href)) continue;
    seen.add(url.href);
    found.push(url.href);
  }
  return found;
}

export class LiveDibbsGateway implements DibbsGateway {
  private readonly jar = new CookieJar();

  async fetchRecentIndexFiles(): Promise<IndexFile[]> {
    const page = await getWithConsent(this.jar, RECENT_RFQS_URL);
    const html = decodeText(page.bytes, page.contentType);
    const hrefs = linkedUrls(html, page.url, (url) => /\/in\d{6}\.txt$/i.test(url.pathname));
    const files: IndexFile[] = [];
    for (const href of hrefs) {
      const file = await getWithConsent(this.jar, href);
      const fileName = new URL(href).pathname.split("/").pop() ?? href;
      files.push({ fileName, text: decodeText(file.bytes, file.contentType) });
    }
    return files;
  }

  async fetchSolicitation(solicitationNumber: string): Promise<FetchedSolicitation> {
    const pageUrl = `https://www.dibbs.bsm.dla.mil/Rfq/RfqRec.aspx?sn=${encodeURIComponent(solicitationNumber)}`;
    const page = await getWithConsent(this.jar, pageUrl);
    const html = decodeText(page.bytes, page.contentType);
    const pdfHref = linkedUrls(html, page.url, (url) => /\.pdf$/i.test(url.pathname))[0];
    if (!pdfHref) throw new Error(`DIBBS record for ${solicitationNumber} did not link a PDF.`);
    const pdf = await getWithConsent(this.jar, pdfHref);
    if (!isPdf(pdf.bytes, pdf.contentType)) {
      throw new Error(`DIBBS did not return a PDF for ${solicitationNumber}.`);
    }
    return { recordPageHtml: html, pdf: pdf.bytes };
  }
}
