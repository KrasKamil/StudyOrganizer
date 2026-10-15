import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { ExternalLink, Video } from 'lucide-react';

export default function RichHtmlDescription({ content = '' }) {
  if (!content) return null;

  // Extract meet/teams link if present for a quick action button
  const meetingLink = useMemo(() => {
    const meetMatch = content.match(/https:\/\/meet\.google\.com\/[a-z0-9-]+/i);
    if (meetMatch) return { url: meetMatch[0], type: 'Google Meet' };
    const teamsMatch = content.match(/https:\/\/teams\.microsoft\.com\/[^\s<>"]+/i);
    if (teamsMatch) return { url: teamsMatch[0], type: 'Microsoft Teams' };
    const zoomMatch = content.match(/https:\/\/[a-z0-9.]*zoom\.us\/[^\s<>"]+/i);
    if (zoomMatch) return { url: zoomMatch[0], type: 'Zoom' };
    return null;
  }, [content]);

  // Sanitize and auto-link URLs in plain text portions
  const sanitizedHtml = useMemo(() => {
    let processed = String(content);

    // Auto-link naked URLs that are not already inside an href attribute
    // Negative lookbehind or safe regex replace:
    processed = processed.replace(
      /(^|[^"'])(https?:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"']*)?)/g,
      (match, prefix, url) => {
        return `${prefix}<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
      }
    );

    // Sanitize with DOMPurify
    return DOMPurify.sanitize(processed, {
      ALLOWED_TAGS: [
        'b', 'strong', 'i', 'em', 'u', 's', 'strike',
        'p', 'div', 'span', 'br', 'hr',
        'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'code', 'pre'
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'style'],
      ADD_ATTR: ['target', 'rel'],
    });
  }, [content]);

  return (
    <div className="space-y-3">
      {/* Quick Join Meeting Banner if Google Meet / Teams link was found in description */}
      {meetingLink && (
        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/60 border border-emerald-600/70 text-emerald-200 text-xs shadow-sm">
          <div className="flex items-center gap-2">
            <Video size={16} className="text-emerald-400 flex-shrink-0" />
            <span className="font-semibold">
              Wykryto link do spotkania: <strong className="text-white">{meetingLink.type}</strong>
            </span>
          </div>
          <a
            href={meetingLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow"
          >
            <ExternalLink size={12} />
            Dołącz do rozmowy
          </a>
        </div>
      )}

      {/* Formatted HTML Content */}
      <div
        className="
          rich-html-content text-xs text-gray-300 leading-relaxed font-normal
          [&_b]:font-bold [&_b]:text-white [&_strong]:font-bold [&_strong]:text-white
          [&_p]:mb-2 [&_div]:mb-1
          [&_a]:text-blue-400 [&_a]:underline [&_a]:font-semibold hover:[&_a]:text-blue-300 [&_a]:break-all
          [&_ul]:list-disc [&_ul]:list-inside [&_ul]:my-1.5 [&_ul]:space-y-1
          [&_ol]:list-decimal [&_ol]:list-inside [&_ol]:my-1.5 [&_ol]:space-y-1
          [&_li]:text-gray-300
          [&_br]:leading-loose
        "
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    </div>
  );
}
