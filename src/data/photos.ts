/*
  Photo slots. Stock stand-ins until the brand's own shoot — see
  src/assets/photos/CREDITS.md for sources and how to swap one.
*/
import sourceSm from "@/assets/photos/source-stream-800.webp";
import sourceLg from "@/assets/photos/source-stream-1600.webp";
import puritySm from "@/assets/photos/purity-clear-800.webp";
import purityLg from "@/assets/photos/purity-clear-1600.webp";
import sparklingSm from "@/assets/photos/sparkling-pour-800.webp";
import sparklingLg from "@/assets/photos/sparkling-pour-1600.webp";
import hotSm from "@/assets/photos/hot-tea-800.webp";
import hotLg from "@/assets/photos/hot-tea-1600.webp";
import coldSm from "@/assets/photos/cold-ice-800.webp";
import coldLg from "@/assets/photos/cold-ice-1600.webp";
import refillSm from "@/assets/photos/refill-dispenser-800.webp";
import refillLg from "@/assets/photos/refill-dispenser-1600.webp";
import homeSm from "@/assets/photos/home-pour-800.webp";
import homeLg from "@/assets/photos/home-pour-1600.webp";
import aboutSm from "@/assets/photos/about-drakensberg-800.webp";
import aboutLg from "@/assets/photos/about-drakensberg-1600.webp";
import shopSm from "@/assets/photos/shop-pool-800.webp";
import shopLg from "@/assets/photos/shop-pool-1600.webp";

export interface Photo {
  src: string;
  srcSet: string;
  /** Intrinsic size of the large file — reserves space so nothing shifts. */
  width: number;
  height: number;
  alt: string;
  credit: { name: string; url: string };
}

const photo = (
  sm: string,
  lg: string,
  width: number,
  height: number,
  alt: string,
  name: string,
  url: string,
): Photo => ({
  src: sm,
  srcSet: `${sm} 800w, ${lg} 1600w`,
  width,
  height,
  alt,
  credit: { name, url },
});

export const photos = {
  source: photo(sourceSm, sourceLg, 1600, 1067, "A clear mountain stream running between boulders", "Quang Nguyen Vinh", "https://www.pexels.com/photo/14771923/"),
  purity: photo(puritySm, purityLg, 1600, 1067, "Sunlight rippling through perfectly clear shallow water", "Mathias Reding", "https://www.pexels.com/photo/28271492/"),
  sparkling: photo(sparklingSm, sparklingLg, 1600, 885, "Water poured from a bottle into a glass, full of bubbles", "Pixabay", "https://www.pexels.com/photo/327090/"),
  hot: photo(hotSm, hotLg, 1600, 2399, "Steam rising as hot water is poured into a cup", "Jahra Tasfia Reza", "https://www.pexels.com/photo/34229829/"),
  cold: photo(coldSm, coldLg, 1600, 1332, "A glass of ice with condensation on the outside", "Gu Ko", "https://www.pexels.com/photo/32088554/"),
  refill: photo(refillSm, refillLg, 1600, 1067, "Filling a paper cup at an office water dispenser", "RDNE Stock project", "https://www.pexels.com/photo/7845036/"),
  home: photo(homeSm, homeLg, 1600, 2397, "Water poured from a bottle into a turquoise glass", "Ksenia Chernaya", "https://www.pexels.com/photo/8054440/"),
  about: photo(aboutSm, aboutLg, 1600, 1063, "Green hills of the Drakensberg, South Africa", "Zak H", "https://www.pexels.com/photo/33399776/"),
  shop: photo(shopSm, shopLg, 1600, 1065, "Light dancing on the floor of a clear blue pool", "Vera Emilie", "https://www.pexels.com/photo/18374072/"),
} satisfies Record<string, Photo>;

export type PhotoSlot = keyof typeof photos;
