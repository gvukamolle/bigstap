'use client'

import { useState } from 'react'

type ProductGalleryImage = {
  src: string
  alt: string
  label: string
}

export function ProductGallery({
  images,
  tone
}: {
  images: readonly ProductGalleryImage[]
  tone: string
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const activeImage = images[activeIndex] ?? images[0]
  const hasMultipleImages = images.length > 1

  function showPrevious() {
    setActiveIndex((currentIndex) => (currentIndex - 1 + images.length) % images.length)
  }

  function showNext() {
    setActiveIndex((currentIndex) => (currentIndex + 1) % images.length)
  }

  if (!activeImage) return null

  return (
    <div className="productGallery" aria-label="Фотографии товара">
      <div className={`productGalleryStage tone-${tone}`}>
        <div
          className="productGalleryImage"
          role="img"
          aria-label={activeImage.alt}
          style={{ backgroundImage: `url(${activeImage.src})` }}
        />

        {hasMultipleImages ? (
          <>
            <button
              aria-label="Предыдущее фото"
              className="galleryArrow galleryArrowPrev"
              onClick={showPrevious}
              type="button"
            >
              ←
            </button>
            <button
              aria-label="Следующее фото"
              className="galleryArrow galleryArrowNext"
              onClick={showNext}
              type="button"
            >
              →
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
