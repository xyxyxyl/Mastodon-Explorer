
import React, { useState, useEffect } from 'react';
import { MastodonStatus } from '../types';

interface StatusCardProps {
  status: MastodonStatus;
}

const StatusCard: React.FC<StatusCardProps> = ({ status }) => {
  const [fullImage, setFullImage] = useState<string | null>(null);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Handle scroll lock and ESC key
  useEffect(() => {
    if (fullImage) {
      document.body.style.overflow = 'hidden';
      const handleEsc = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setFullImage(null);
      };
      window.addEventListener('keydown', handleEsc);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleEsc);
      };
    }
  }, [fullImage]);

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:border-indigo-100 transition-colors relative group/card">
      <div className="flex items-start gap-4">
        <img 
          src={status.account.avatar} 
          alt={status.account.display_name} 
          className="w-12 h-12 rounded-full border border-gray-200"
        />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-bold text-gray-900 truncate max-w-[150px] sm:max-w-none">{status.account.display_name}</h4>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{formatDate(status.created_at)}</span>
              <a 
                href={status.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-300 hover:text-indigo-500 transition-colors p-1 rounded-md hover:bg-indigo-50"
                title="在原文查看"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-3 truncate">@{status.account.username}</p>
          
          <div 
            className="text-gray-800 text-sm leading-relaxed mb-4 whitespace-pre-wrap prose prose-sm max-w-none prose-p:my-1 prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: status.content }}
          />

          {status.media_attachments.length > 0 && (
            <div className={`grid gap-2 mb-4 ${status.media_attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
              {status.media_attachments.map(media => (
                <div 
                  key={media.id} 
                  className="relative group cursor-zoom-in overflow-hidden rounded-lg bg-gray-100"
                  onClick={() => setFullImage(media.url)}
                >
                  <img 
                    src={media.preview_url || media.url} 
                    alt="Attachment" 
                    className="w-full h-48 md:h-64 object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <svg className="w-8 h-8 text-white drop-shadow-md" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-6 text-gray-400 text-xs mt-2">
            <div className="flex items-center gap-1.5" title="回复">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {status.replies_count}
            </div>
            <div className="flex items-center gap-1.5" title="转推">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {status.reblogs_count}
            </div>
            <div className="flex items-center gap-1.5" title="喜欢">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              {status.favourites_count}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {fullImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setFullImage(null)}
        >
          <button 
            className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors"
            onClick={() => setFullImage(null)}
          >
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <img 
            src={fullImage} 
            alt="Original attachment" 
            className="max-w-[95vw] max-h-[95vh] object-contain shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          />
          
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-white/70 text-xs font-medium border border-white/10">
            点击背景或按 ESC 退出
          </div>
        </div>
      )}
    </div>
  );
};

export default StatusCard;
