# Photo credits and slots

Stock photography from [Pexels](https://www.pexels.com), every photo marked
"Free" on its page (Pexels License — free for commercial use, no attribution
required; 327090 is from Pexels' Creative Commons collection). We credit the
photographers anyway: visibly on `/water`, and here. Zak H asks for a credit
when the photo is shared.

These are stand-ins until All Things Water has its own shoot. To replace one,
drop new `-800.webp` / `-1600.webp` files in with the same names and update the
`alt` text and `credit` in `src/data/photos.ts`.

Selection rules: no identifiable faces (stock licences carry no model release),
no visible bottle brands or competitor logos.

| Slot | Files | Photo | Photographer |
|---|---|---|---|
| Source | `source-stream-*` | [Stream Between Stones](https://www.pexels.com/photo/14771923/) | [Quang Nguyen Vinh](https://www.pexels.com/@quang-nguyen-vinh-222549/) |
| Purity | `purity-clear-*` | [Clear Transparent Water](https://www.pexels.com/photo/28271492/) | [Mathias Reding](https://www.pexels.com/@matreding/) |
| Still or sparkling | `sparkling-pour-*` | [Close-up of Bottle Pouring Water on Glass](https://www.pexels.com/photo/327090/) | [Pixabay](https://www.pexels.com/@pixabay/) |
| Hot | `hot-tea-*` | [Steaming Cup of Tea in Warm Morning Light](https://www.pexels.com/photo/34229829/) | [Jahra Tasfia Reza](https://www.pexels.com/@jahratreza/) |
| Cold | `cold-ice-*` | [Monochrome Glass of Ice with Water Condensation](https://www.pexels.com/photo/32088554/) | [Gu Ko](https://www.pexels.com/@gu-ko-2150570603/) |
| Refill & reuse | `refill-dispenser-*` | [Person Pouring Water on White Cup](https://www.pexels.com/photo/7845036/) | [RDNE Stock project](https://www.pexels.com/@rdne/) |
| Planner / home | `home-pour-*` | [Pouring Liquid in a Glass From a Bottle](https://www.pexels.com/photo/8054440/) | [Ksenia Chernaya](https://www.pexels.com/@kseniachernaya/) |
| About hero | `about-drakensberg-*` | [Majestic Green Hills of Drakensberg South Africa](https://www.pexels.com/photo/33399776/) | [Zak H](https://www.pexels.com/@zakh/) |
| Shop band | `shop-pool-*` | [Close-up of Blue Water Surface in a Swimming Pool](https://www.pexels.com/photo/18374072/) | [Vera Emilie](https://www.pexels.com/@aloevera/) |

Processing: downloaded at 2400 px wide from the Pexels CDN, then
`convert -auto-orient -strip -resize 1600x>` / `800x>` to WebP (byte-targeted
with `-define webp:target-size=` where a file exceeded 160 KB). The cold
photo is a monochrome original, graded to a cool blue duotone so it pairs with
the warm hot-water photo: `-colorspace Gray -sigmoidal-contrast 3,50%
+level-colors "#062a44","#f0f9ff"`, written to PNG first (target-size is
ignored when converting straight to WebP from that pipeline).
