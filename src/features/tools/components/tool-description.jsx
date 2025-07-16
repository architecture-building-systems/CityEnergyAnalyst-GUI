import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import { isElectron, openExternal } from 'utils/electron';

export const ToolDescription = ({
  ref,
  height,
  description,
  label,
  visible,
}) => {
  return (
    <div
      id="cea-tool-header-description"
      ref={ref}
      style={{
        height: visible ? `${height}px` : 0,
        opacity: visible ? 1 : 0,
        overflow: 'hidden',
        transition:
          'height 0.3s ease-in-out, opacity 0.3s ease-in-out, transform 0.3s ease-in-out',
        transform: visible ? 'translateY(0)' : 'translateY(-10px)',
        transformOrigin: 'top',
      }}
    >
      <div>
        <h2>{label}</h2>
        <small>
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              a: ({ href, children, ...props }) => {
                if (isElectron())
                  return (
                    <a {...props} onClick={() => openExternal(href)}>
                      {children}
                    </a>
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
        </small>
      </div>
    </div>
  );
};
