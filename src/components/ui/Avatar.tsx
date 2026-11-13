import { useState, type ImgHTMLAttributes } from 'react';

export interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> {
  name: string;
  size?: 'sm' | 'md' | 'lg';
}

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

export function Avatar({ name, src, size = 'md', className = '', ...props }: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);
  const showImage = Boolean(src) && !imageFailed;

  return (
    <span className={`ui-avatar ui-avatar--${size} ${className}`.trim()} aria-label={name}>
      {showImage ? (
        <img {...props} src={src} alt={name} onError={() => setImageFailed(true)} />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </span>
  );
}
