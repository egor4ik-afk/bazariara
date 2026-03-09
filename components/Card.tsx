'use client'
import Image from 'next/image'
import React, { useState } from 'react'

interface CardProps {
  title: string
  imageUrl: string
  price: number
  isFavorite?: boolean
  isAdded?: boolean
  onClickFavorite?: () => void
  onClickAdd?: () => void
}

export default function Card({ title, imageUrl, price, isFavorite, isAdded, onClickFavorite, onClickAdd }: CardProps) {
  const [isLiked, setIsLiked] = useState(isFavorite)
  const [isAddedToCart, setIsAddedToCart] = useState(isAdded)

  const handleFavoriteClick = () => {
    setIsLiked(!isLiked)
    if (onClickFavorite) {
      onClickFavorite()
    }
  }

  const handleAddClick = () => {
    setIsAddedToCart(!isAddedToCart)
    if (onClickAdd) {
      onClickAdd()
    }
  }

  return (
    <div className="relative bg-white border border-gray-100 rounded-3xl p-8 cursor-pointer transition hover:-translate-y-2 hover:shadow-xl">
      <button onClick={handleFavoriteClick} className="absolute top-8 left-8">
        <Image src={isLiked ? '/like-2.svg' : '/like-1.svg'} alt="Favorite" width={32} height={32} />
      </button>
      <Image src={imageUrl} alt={title} width={200} height={200} className="mx-auto" />
      <p className="mt-2">{title}</p>
      <div className="flex justify-between mt-4">
        <div className="flex flex-col">
          <span className="text-gray-500">Цена:</span>
          <div className="flex items-center">
            <b>{price} руб.</b>
          </div>
        </div>
        <button onClick={handleAddClick}>
          <Image src={isAddedToCart ? '/checked.svg' : '/plus.svg'} alt="Add to cart" width={32} height={32} />
        </button>
      </div>
    </div>
  )
}