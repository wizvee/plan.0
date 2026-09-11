"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";

export function UrlChip({ url }: { url: string }) {
  const [faviconFailed, setFaviconFailed] = useState(false);
  let hostname = url;
  try {
    hostname = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    // url이 이상해도 그냥 원문을 보여준다.
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-2 rounded-[10px] bg-muted px-2.5 py-2 text-[13px] text-muted-foreground transition-colors hover:bg-muted/70"
    >
      {faviconFailed ? (
        <Link2 className="size-4 shrink-0" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={`https://www.google.com/s2/favicons?sz=64&domain=${hostname}`}
          alt=""
          className="size-5 shrink-0 rounded-[4px]"
          onError={() => setFaviconFailed(true)}
        />
      )}
      <span className="truncate">{hostname}</span>
    </a>
  );
}
