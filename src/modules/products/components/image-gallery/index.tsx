import { HttpTypes } from "@medusajs/types"
import { Container, clx } from "@medusajs/ui"
import Image from "next/image"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  layout?: "gallery" | "single" | "grid"
}

const ImageGallery = ({ images, layout = "gallery" }: ImageGalleryProps) => {
  const displayed = layout === "single" ? images.slice(0, 1) : images

  return (
    <div className="flex items-start relative" data-image-layout={layout}>
      <div
        className={clx(
          "flex-1 small:mx-16",
          layout === "grid"
            ? "grid grid-cols-1 small:grid-cols-2 gap-4"
            : "flex flex-col gap-y-4"
        )}
      >
        {displayed.map((image, index) => {
          return (
            <Container
              key={image.id}
              className="relative aspect-[29/34] w-full overflow-hidden bg-ui-bg-subtle"
              id={image.id}
            >
              {!!image.url && (
                <Image
                  src={image.url}
                  priority={index <= 2 ? true : false}
                  className="absolute inset-0 rounded-rounded"
                  alt={`Product image ${index + 1}`}
                  fill
                  sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
                  style={{
                    objectFit: "cover",
                  }}
                />
              )}
            </Container>
          )
        })}
      </div>
    </div>
  )
}

export default ImageGallery
