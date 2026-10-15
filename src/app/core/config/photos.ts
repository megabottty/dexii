/** Photos per crush. Each is stored as a resized data URI (≈400 KB max) inside the crush's own database
 *  record, which has a hard 16 MB ceiling, so the cap has to stay well below ~28. Mirrored by MAX_PHOTOS
 *  in server/src/controllers/crushController.js. */
export const MAX_PHOTOS = 20;
