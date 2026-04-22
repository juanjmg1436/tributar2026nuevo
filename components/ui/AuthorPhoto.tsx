'use client'

import Image from 'next/image'
import { useState } from 'react'

interface AuthorPhotoProps {
  className?: string
  size?: number
}

export function AuthorPhoto({ className = '', size = 112 }: AuthorPhotoProps) {
  const [imgSrc, setImgSrc] = useState('/images/autor.png')
  // autor.png existe en public/images/ — fallback al SVG placeholder si falla

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border-4 border-primary-600 shadow-xl bg-primary-800 ${className}`}
      style={{ width: size, height: size, flexShrink: 0 }}
    >
      <Image
        src={imgSrc}
        alt="Juan Manuel Gómez"
        fill
        className="object-cover"
        onError={() => setImgSrc('/images/autor-placeholder.svg')}
        unoptimized={imgSrc.endsWith('.svg')}
      />
    </div>
  )
}
