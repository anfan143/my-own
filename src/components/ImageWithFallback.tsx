import React, { useState } from 'react';
import { useInView } from 'react-intersection-observer';
import { ImageOff } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  width?: number;
  height?: number;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  width,
  height
}: ImageWithFallbackProps) {
  const [error, setError] = useState(false);
  const { ref, inView } = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  if (error) {
    return (
      <div 
        className={`flex items-center justify-center bg-gray-100 ${className}`}
        style={{ width, height }}
      >
        <ImageOff className="h-8 w-8 text-gray-400" />
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      {inView && (
        <img
          src={src}
          alt={alt}
          className={className}
          width={width}
          height={height}
          loading="lazy"
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}