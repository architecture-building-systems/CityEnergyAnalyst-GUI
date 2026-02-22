import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { isElectron, openExternal } from 'utils/electron';

export const ToolDescription = ({ description }) => {
  return (
    <div id="cea-tool-header-description">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={{
          a: ({ href, children, ...props }) => {
            if (isElectron())
              return (
                <button
                  {...props}
                  type="button"
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    color: 'inherit',
                    textDecoration: 'underline',
                    cursor: 'pointer',
                    font: 'inherit',
                  }}
                  onClick={() => openExternal(href)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openExternal(href);
                    }
                  }}
                >
                  {children}
                </button>
              );
            else
              return (
                <a
                  {...props}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              );
          },
        }}
      >
        {description}
      </ReactMarkdown>
    </div>
  );
};
